import { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { Camera, IdCard, Pencil, Phone, ScanFace, Search, UserMinus, UserPlus, UserRoundCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getServices, whenSignedIn } from '../../lib/firebase';
import { trackWrite } from '../../lib/syncedState';
import { MAX_PHOTO_CHARS } from '../../lib/staffAttendance';
import { resetFace, faceKey, FACES } from '../../lib/faceMatch';
import FaceDialog from './FaceDialog';
import {
    DEPARTMENTS, deptLabel, allStaff, isLeft, nextStaffId, validateStaff, addStaff, updateStaff, setStaffStatus, filterStaff, staffCounts, EMPTY_FORM,
} from '../../lib/staffDirectory';

const PHOTOS = 'hotel_staff_photos';
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Picture file (phone camera or gallery) -> 3:4 JPEG data URL that fits the database limit
async function toPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
        const W = 300, H = 400;
        const scale = Math.max(W / img.width, H / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.getContext('2d').drawImage(img, (W - img.width * scale) / 2, (H - img.height * scale) / 2, img.width * scale, img.height * scale);
        for (const q of [0.8, 0.65, 0.5, 0.35]) {
            const out = canvas.toDataURL('image/jpeg', q);
            if (out.length <= MAX_PHOTO_CHARS) return out;
        }
        return null;
    } finally { URL.revokeObjectURL(url); }
}

// Photo loads only when shown (keeps the staff list light); falls back to initials
const photoCache = new Map();
export function StaffPhoto({ staff, className }) {
    const id = staff?.photoId;
    const [src, setSrc] = useState(() => (id ? photoCache.get(id) || null : null));
    useEffect(() => {
        if (!id || photoCache.has(id)) return undefined;
        let alive = true;
        whenSignedIn().then(() => getDoc(doc(getServices().db, PHOTOS, id))).then(s => {
            const data = s.exists() ? s.data().data : null;
            photoCache.set(id, data);
            if (alive) setSrc(data);
        }).catch(() => {});
        return () => { alive = false; };
    }, [id]);
    const shown = src || (id ? photoCache.get(id) : null) || staff?.photo || null;
    if (shown) return <img src={shown} alt={`Photo of ${staff.name}`} className={cn('shrink-0 rounded-full object-cover', className)} />;
    return <span aria-hidden className={cn('grid shrink-0 place-items-center rounded-full bg-[#0a192f] font-black text-[#d4af37]', className)}>{initials(staff?.name)}</span>;
}

function Field({ label, error, children, id }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="text-xs font-bold tracking-wide text-slate-700 uppercase">{label}</label>
            {children}
            {error && <p data-testid={id.replace(/^sf-/, 'sf-error-')} className="text-xs font-semibold text-red-700">{error}</p>}
        </div>
    );
}
const inputCls = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30';

// Add / edit one person. `editing` = the staff record, or null for a new person.
export function StaffFormDialog({ open, editing, registry, onClose, onSaved }) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            {/* a fresh form each time it opens (key), filled from the person being edited */}
            {open && <StaffFormBody key={editing?.id || 'new'} editing={editing} registry={registry} onClose={onClose} onSaved={onSaved} />}
        </Dialog>
    );
}

function StaffFormBody({ editing, registry, onClose, onSaved }) {
    const [form, setForm] = useState(() => (editing
        ? { name: editing.name || '', role: editing.role || '', department: editing.department, shift: editing.shift || '', phone: editing.phone || '', joinDate: editing.joinDate || '', duties: editing.duties || '' }
        : { ...EMPTY_FORM, joinDate: todayIso() }));
    const [photo, setPhoto] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const fileRef = useRef(null);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const staffId = editing?.staffId || nextStaffId(registry);

    const pickPhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const data = await toPhoto(file).catch(() => null);
        if (!data) { setErrors(er => ({ ...er, photo: 'This picture could not be used. Try another one.' })); return; }
        setErrors(er => ({ ...er, photo: undefined }));
        setPhoto(data);
    };

    const save = async () => {
        const errs = validateStaff(form, registry, editing?.id || null);
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        const extra = {};
        if (photo) {
            // saved in the background like every other change (works offline, syncs later); a failed save shows the app's red "could not be saved" bar
            trackWrite(setDoc(doc(getServices().db, PHOTOS, staffId), { staffId, data: photo, at: new Date().toISOString() })).catch(() => {});
            photoCache.set(staffId, photo);
            extra.photoId = staffId;
            // a new photo = a new registered face: the old face record is reset and rebuilt from this photo
            resetFace({ name: form.name, staffId }).catch(() => {});
        }
        if (editing) onSaved(updateStaff(registry, editing.id, form, extra), null);
        else { const r = addStaff(registry, form, extra); onSaved(r.registry, r.staff); }
        onClose();
    };

    const preview = photo;
    return (
            <DialogContent className="ui max-h-[92dvh] overflow-y-auto bg-white text-[#0a192f] sm:max-w-lg" data-testid="staff-form">
                <DialogHeader>
                    <DialogTitle className="text-[#0a192f]">{editing ? 'Edit staff' : 'Add new staff'}</DialogTitle>
                    <DialogDescription>Staff ID <b className="font-mono text-[#0a192f]" data-testid="sf-staff-id">{staffId}</b> · Aadhaar / PAN / bank details stay in AuraLock, not here.</DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {preview ? <img src={preview} alt="New photo" className="h-24 w-[4.5rem] shrink-0 rounded-lg object-cover" />
                        : <StaffPhoto staff={editing ? { ...editing } : { name: form.name }} className="h-24 w-[4.5rem] rounded-lg text-lg" />}
                    <div className="space-y-2">
                        <input ref={fileRef} data-testid="sf-photo-input" type="file" accept="image/*" capture="user" className="hidden" onChange={pickPhoto} />
                        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} data-testid="sf-photo"><Camera />{photo || editing?.photoId ? 'Change photo' : 'Take photo'}</Button>
                        <p className="text-xs text-slate-600">Face straight, good light. Used on the ID card and the attendance list.</p>
                        {errors.photo && <p className="text-xs font-semibold text-red-700">{errors.photo}</p>}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Full name (as on Aadhaar)" id="sf-name" error={errors.name}><input id="sf-name" className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Mohammad Hafeez" /></Field></div>
                    <Field label="Department" id="sf-department" error={errors.department}>
                        <select id="sf-department" className={inputCls} value={form.department} onChange={set('department')}>
                            {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Post" id="sf-role" error={errors.role}><input id="sf-role" className={inputCls} value={form.role} onChange={set('role')} placeholder="e.g. Front Desk, Chef" /></Field>
                    <Field label="Shift time" id="sf-shift"><input id="sf-shift" className={inputCls} value={form.shift} onChange={set('shift')} placeholder="09:00 AM – 06:00 PM" /></Field>
                    <Field label="Mobile" id="sf-phone" error={errors.phone}><input id="sf-phone" inputMode="tel" className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile (or +44 …)" /></Field>
                    <Field label="Joining date" id="sf-joinDate" error={errors.joinDate}><input id="sf-joinDate" type="date" className={inputCls} value={form.joinDate} onChange={set('joinDate')} /></Field>
                    <div className="sm:col-span-2"><Field label="Duties (optional)" id="sf-duties"><textarea id="sf-duties" className={cn(inputCls, 'h-16 py-2')} value={form.duties} onChange={set('duties')} /></Field></div>
                </div>
                {errors.save && <p role="alert" className="text-sm font-semibold text-red-700">{errors.save}</p>}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button data-testid="sf-save" disabled={saving} onClick={save} className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}</Button>
                </DialogFooter>
            </DialogContent>
    );
}

// Printable Hotel Sky 5 ID card (navy / gold, same design as the AuraLock hotel card)
function printIdCard(staff, photoSrc) {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to print.'); return; }
    const face = photoSrc ? `<img src="${photoSrc}" alt="">` : `<div class="ini">${esc(initials(staff.name))}</div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ID card ${esc(staff.staffId)}</title><style>
        @page{size:86mm 54mm;margin:0}body{margin:0;font-family:Arial,sans-serif}
        .card{width:86mm;height:54mm;box-sizing:border-box;border-radius:3mm;overflow:hidden;border:0.3mm solid #0a192f;display:flex;flex-direction:column}
        .top{background:#0a192f;color:#d4af37;padding:2mm 3mm;display:flex;justify-content:space-between;align-items:center}
        .brand{font-family:Georgia,serif;font-weight:900;font-size:4.2mm;letter-spacing:.3mm}.brand small{display:block;font-size:2.2mm;color:#e6c65c;font-family:Arial;letter-spacing:.2mm}
        .sid{font-family:monospace;font-weight:700;color:#fff;font-size:3.2mm;text-align:right}.sid small{display:block;color:#d4af37;font-size:1.8mm}
        .body{flex:1;display:flex;gap:3mm;padding:2.5mm 3mm;background:#fff}
        .body img,.ini{width:17mm;height:22mm;border-radius:1.5mm;object-fit:cover;border:0.5mm solid #d4af37;flex-shrink:0}
        .ini{display:flex;align-items:center;justify-content:center;background:#0a192f;color:#d4af37;font-weight:900;font-size:6mm}
        .name{font-weight:900;color:#0a192f;font-size:3.8mm}.post{display:inline-block;margin:.8mm 0 1.2mm;background:#fdf3d0;color:#5c4708;font-size:2.4mm;font-weight:700;padding:.4mm 1.5mm;border-radius:1mm}
        .row{font-size:2.3mm;color:#334155;line-height:1.35}.row b{color:#0a192f}
        .foot{background:linear-gradient(90deg,#0a192f,#d4af37,#0a192f);height:1.2mm}.ret{font-size:1.8mm;color:#475569;padding:0 3mm 1mm;background:#fff}
    </style></head><body><div class="card">
        <div class="top"><div class="brand">HOTEL SKY 5<small>Staff Identity Card</small></div><div class="sid"><small>STAFF ID</small>${esc(staff.staffId || '—')}</div></div>
        <div class="body">${face}<div><div class="name">${esc(staff.name)}</div><div class="post">${esc(staff.role)}</div>
            <div class="row">Department: <b>${esc(deptLabel(staff.department))}</b></div>
            <div class="row">Mobile: <b>${esc(staff.phone || '—')}</b></div>
            <div class="row">Joined: <b>${esc(fmtDate(staff.joinDate))}</b></div></div></div>
        <div class="ret">If found, please return to Hotel Sky 5, 5th Floor, Disha Arcade, MDC Sector 4, Panchkula</div>
        <div class="foot"></div></div><script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
}

// Workforce -> Staff Directory: list like the AuraLock "Users" page
export default function StaffDirectory({ registry, onChange, onAdd, onEdit }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('Active');
    const [dept, setDept] = useState('all');
    const list = allStaff(registry);
    const counts = staffCounts(list);
    const shown = filterStaff(list, { search, status, dept });

    const [leaving, setLeaving] = useState(null);   // { staff, date } while the "Mark as left" box is open
    const [faces, setFaces] = useState({});         // registered check-in faces by face key
    useEffect(() => {
        let alive = true;
        whenSignedIn().then(() => getDocs(collection(getServices().db, FACES)))
            .then(snap => { if (alive) setFaces(Object.fromEntries(snap.docs.map(d => [d.id, d.data()]))); }).catch(() => {});
        return () => { alive = false; };
    }, []);
    const faceOf = (s) => { const f = faces[faceKey(s)]; return f && !f.reset && f.descriptor?.length === 128 ? f : null; };
    const [faceFor, setFaceFor] = useState(null);   // the person whose Face box is open
    const faceChanged = (s, rec) => setFaces(f => ({ ...f, [faceKey(s)]: rec }));
    // a face taken in the Face box is also the person's staff photo
    const photoSaved = (s, data) => {
        photoCache.set(s.staffId, data);
        const next = { ...registry };
        for (const d of DEPARTMENTS) next[d.key] = (registry[d.key] || []).map(p => (p.id === s.id ? { ...p, photoId: s.staffId } : p));
        onChange(next);
    };

    const toggleLeft = (s) => {
        if (isLeft(s)) { onChange(setStaffStatus(registry, s.id, 'Active')); return; }
        setLeaving({ staff: s, date: todayIso() });
    };
    const confirmLeft = () => {
        if (!leaving?.date) return;
        onChange(setStaffStatus(registry, leaving.staff.id, 'Left', leaving.date));
        setLeaving(null);
    };
    const former = list.filter(isLeft).sort((a, b) => String(b.leftDate || '').localeCompare(String(a.leftDate || '')));
    const idCard = (s) => printIdCard(s, (s.photoId && photoCache.get(s.photoId)) || s.photo || null);

    return (
        <section className="ui space-y-4 rounded-2xl border bg-card p-4 shadow-xs" data-testid="staff-directory">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-[#0a192f]">Staff Directory</h2>
                    <p className="text-sm text-slate-600">Every person, their staff ID, post, shift and photo. People who leave are marked Left, never deleted.</p>
                </div>
                <Button data-testid="sd-add" onClick={onAdd} className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><UserPlus />Add staff</Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[['Total staff', counts.total, 'sd-count-total'], ['Active', counts.active, 'sd-count-active'], ['Left', counts.left, 'sd-count-left'], ['With photo', counts.withPhoto, 'sd-count-photo']].map(([label, value, id]) => (
                    <div key={id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">{label}</div>
                        <div className="text-xl font-black text-[#0a192f]" data-testid={id}>{value}</div>
                    </div>
                ))}
            </div>

            {/* who still has no face: only a registered face can check in on the staff app */}
            {(() => {
                const missing = list.filter(p => !isLeft(p) && !faceOf(p));
                if (!list.some(p => !isLeft(p))) return null;
                return missing.length ? (
                    <div data-testid="sd-faces-missing" className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-900"><ScanFace className="size-4" />Face not registered: {missing.length} staff</div>
                        <p className="mt-0.5 text-xs text-amber-900">Register each face here with the camera (the person in front of the camera). Then they can check in on the staff app.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {missing.map(p => (
                                <Button key={p.id} size="sm" onClick={() => setFaceFor(p)} data-testid={`sd-register-face-${p.name}`}
                                    className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><ScanFace />Register face · {p.name}</Button>
                            ))}
                        </div>
                    </div>
                ) : <p data-testid="sd-faces-all" className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><ScanFace className="size-4" />Every staff member has a registered face.</p>;
            })()}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                    <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <input data-testid="sd-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID, post or mobile" aria-label="Search staff"
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm outline-none focus:border-[#d4af37]" />
                </div>
                <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="Status">
                    {[['Active', 'Active'], ['Left', 'Former staff'], ['all', 'All']].map(([k, label]) => (
                        <Button key={k} role="tab" aria-selected={status === k} data-testid={`sd-status-${k}`} size="xs" variant={status === k ? 'default' : 'ghost'} onClick={() => setStatus(k)}>{label}</Button>
                    ))}
                </div>
                <select aria-label="Department" data-testid="sd-dept" value={dept} onChange={e => setDept(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
                    <option value="all">All departments</option>
                    {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Staff list">
                <Table>
                    <TableHeader>
                        <TableRow><TableHead>Sr.</TableHead><TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Shift</TableHead><TableHead>Mobile</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.length === 0 && <TableRow><TableCell colSpan={9} data-testid="sd-empty" className="p-8 text-center text-slate-600">{list.length ? 'No staff match this search.' : 'No staff yet. Use “Add staff”.'}</TableCell></TableRow>}
                        {shown.map((s, i) => (
                            <TableRow key={s.id} data-testid={`sd-row-${s.name}`} className={cn(isLeft(s) && 'opacity-60')}>
                                <TableCell className="text-slate-600">{i + 1}</TableCell>
                                <TableCell className="font-mono text-xs font-bold whitespace-nowrap text-[#0a192f]">{s.staffId || '—'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <StaffPhoto staff={s} className="size-9 text-xs" />
                                        <div className="min-w-0"><div className="font-semibold whitespace-nowrap text-[#0a192f]">{s.name}</div><div className="text-xs whitespace-nowrap text-slate-600">{s.role}</div></div>
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant="secondary" className="whitespace-nowrap">{deptLabel(s.department)}</Badge></TableCell>
                                <TableCell className="text-sm whitespace-nowrap text-slate-700">{s.shift || 'Not set'}</TableCell>
                                <TableCell className="whitespace-nowrap">{s.phone ? <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline"><Phone className="size-3.5" />{s.phone}</a> : <span className="text-sm text-slate-500">—</span>}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap text-slate-700">{fmtDate(s.joinDate)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={isLeft(s) ? 'border-slate-300 text-slate-600' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}>{isLeft(s) ? `LEFT${s.leftDate ? ` ${fmtDate(s.leftDate)}` : ''}` : 'ACTIVE'}</Badge>
                                    {!isLeft(s) && (faceOf(s)
                                        ? <div data-testid={`sd-face-${s.name}`} className="mt-1 flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap text-emerald-800">
                                            <ScanFace className="size-3.5" />{faceOf(s).source === 'staff-photo' ? 'Face from photo' : 'Face from 1st check-in'}
                                        </div>
                                        : <button type="button" data-testid={`sd-face-${s.name}`} onClick={() => setFaceFor(s)} aria-label={`Register face of ${s.name}`}
                                            className="mt-1 flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-amber-900 hover:bg-amber-100">
                                            <ScanFace className="size-3.5" />Face not set yet · Register
                                        </button>)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button size="xs" variant="outline" onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`} data-testid={`sd-edit-${s.name}`}><Pencil />Edit</Button>
                                        <Button size="xs" variant="outline" onClick={() => idCard(s)} aria-label={`ID card of ${s.name}`} data-testid={`sd-card-${s.name}`}><IdCard />ID card</Button>
                                        {!isLeft(s) && <Button size="xs" variant="outline" onClick={() => setFaceFor(s)} aria-label={`Face of ${s.name}`} data-testid={`sd-face-open-${s.name}`}
                                            className={faceOf(s) ? '' : 'border-amber-400 bg-amber-50 font-bold text-amber-900'}><ScanFace />{faceOf(s) ? 'Face' : 'Register face'}</Button>}
                                        <Button size="xs" variant="ghost" onClick={() => toggleLeft(s)} aria-label={isLeft(s) ? `Mark ${s.name} active again` : `Mark ${s.name} as left`} data-testid={`sd-left-${s.name}`}>
                                            {isLeft(s) ? <><UserRoundCheck />Rejoin</> : <><UserMinus />Left</>}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {status === 'Active' && former.length > 0 && (
                <div data-testid="sd-former" className="rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 px-4 py-2.5">
                        <h3 className="text-sm font-bold text-[#0a192f]">Former staff <span className="font-semibold text-slate-600">({former.length})</span></h3>
                        <span className="text-xs text-slate-600">Not on the attendance link · old attendance kept</span>
                    </div>
                    <ul className="divide-y divide-slate-200">
                        {former.map(s => (
                            <li key={s.id} data-testid={`sd-former-${s.name}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                                <StaffPhoto staff={s} className="size-8 text-[11px] grayscale" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-[#0a192f]">{s.name} <span className="font-mono text-xs font-bold text-slate-600">{s.staffId}</span></div>
                                    <div className="text-xs text-slate-600">{s.role ? `${s.role} · ` : ''}{deptLabel(s.department)}</div>
                                </div>
                                <div className="text-right text-xs text-slate-700">
                                    <div>Joined {fmtDate(s.joinDate)}</div>
                                    <div className="font-semibold">Last day {fmtDate(s.leftDate)}</div>
                                </div>
                                <Button size="xs" variant="outline" onClick={() => toggleLeft(s)} aria-label={`Mark ${s.name} active again`} data-testid={`sd-rejoin-${s.name}`}><UserRoundCheck />Rejoin</Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <FaceDialog staff={faceFor} face={faceFor ? faceOf(faceFor) : null}
                photoSrc={faceFor ? (faceFor.photoId && photoCache.get(faceFor.photoId)) || faceFor.photo || null : null}
                onClose={() => setFaceFor(null)} onPhotoSaved={photoSaved} onFaceChanged={faceChanged} />

            <Dialog open={!!leaving} onOpenChange={o => { if (!o) setLeaving(null); }}>
                <DialogContent className="ui max-w-sm bg-white text-[#0a192f]" data-testid="sd-left-dialog">
                    <DialogHeader>
                        <DialogTitle>Mark {leaving?.staff.name} as left?</DialogTitle>
                        <DialogDescription>They will no longer appear on the attendance link. Their old attendance stays in the register.</DialogDescription>
                    </DialogHeader>
                    <label className="grid gap-1 text-sm font-semibold">Last working day
                        <input type="date" data-testid="sd-left-date" value={leaving?.date || ''} max={todayIso()} min={leaving?.staff.joinDate || undefined}
                            onChange={e => setLeaving(l => ({ ...l, date: e.target.value }))} className="h-9 rounded-lg border border-slate-300 px-2 font-normal" />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLeaving(null)} data-testid="sd-left-cancel">Cancel</Button>
                        <Button onClick={confirmLeft} disabled={!leaving?.date} data-testid="sd-left-confirm" className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><UserMinus />Mark as left</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
