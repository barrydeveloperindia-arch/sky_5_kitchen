import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Package, AlertTriangle, Clock, ListChecks, ArrowDownToLine, ArrowUpFromLine, Plus, Minus, Search,
    FileText, Share2, FileSpreadsheet, Trash2, CheckCircle2, XCircle, PenLine, Boxes, History, X, Download, Printer, ArrowRightLeft, MapPin,
} from 'lucide-react';
import { inventoryItems, LOCATIONS, COUNT_DATES, registerLists } from '../data/inventory';
import { computeStock, validateTransaction, stockCSV, registerCSV, normalizeLocation } from '../lib/inventory';
import { useInventoryStore } from '../lib/inventoryStore';
import { useOnline } from '../lib/syncedState';
import { reportHTML, whatsappSummary } from '../lib/inventoryReport';
import './inventory.css';

const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => String(iso || '').split('-').reverse().join('-');
const stClass = (s) => `inv-pill st-${s.replace(/ /g, '-')}`;
const NAME_KEY = 'sky5_inventory_name';
const shortLoc = (l) => l.replace(' Store', '').replace(' (Upar)', '');
const locSplit = (r) => LOCATIONS.map(l => `${shortLoc(l)} ${r.atLocation?.[l] ?? 0}`).join(' · ');
const TypeIcon = ({ type }) => (type === 'IN' ? <ArrowDownToLine /> : type === 'TRANSFER' ? <ArrowRightLeft /> : <ArrowUpFromLine />);
const whereLabel = (t) => (t.type === 'TRANSFER' ? `${normalizeLocation(t.location)} → ${normalizeLocation(t.toLocation)}` : normalizeLocation(t.location));

const downloadCSV = (filename, csv) => {
    // BOM so Excel opens ₹ / Hindi text correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

function ItemPicker({ rows, value, onChange }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    const selected = rows.find(r => r.code === value);
    if (selected) {
        return (
            <div className="inv-picker-selected" data-testid="inv-item-selected">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{selected.name}</div>
                    <div className="meta">{selected.code} · In stock: {selected.current} {selected.unit} ({locSplit(selected)})</div>
                </div>
                <button type="button" className="inv-del" aria-label="Change item" onClick={() => { onChange(''); setQ(''); setOpen(true); }}><X /></button>
            </div>
        );
    }
    const term = q.trim().toLowerCase();
    const matches = rows.filter(r => !term || `${r.code} ${r.name} ${r.category}`.toLowerCase().includes(term));
    return (
        <div className="inv-picker" ref={ref}>
            <div className="inv-search">
                <Search />
                <input data-testid="inv-item-search" aria-label="Search item" className="inv-input" style={{ width: '100%' }} placeholder="Search item (e.g. soap, SKY-GA-002)"
                    value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); }} />
            </div>
            {open && (
                <div className="inv-picker-list" role="listbox">
                    {matches.length === 0 && <div className="inv-picker-empty">No item found</div>}
                    {matches.map(r => (
                        <button type="button" key={r.code} className="inv-picker-opt" data-testid={`inv-item-option-${r.code}`}
                            onClick={() => { onChange(r.code); setOpen(false); setQ(''); }}>
                            <span>{r.name}<br /><span className="code">{r.code}</span></span>
                            <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{r.current} {r.unit}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// variant 'admin' = inside OPS Center; 'staff' = standalone mobile page at /inventory
function MinInput({ row, onSave }) {
    const [draft, setDraft] = useState(null); // null = not editing, show the saved value
    const commit = () => {
        const v = draft;
        setDraft(null);
        if (v === null || v.trim() === '' || !Number.isFinite(Number(v)) || Number(v) < 0) return;
        if (Number(v) !== row.min) onSave(Number(v));
    };
    return (
        <input data-testid="inv-min" className="inv-min" type="number" min="0" step="any" aria-label={`Min. level for ${row.name}`}
            value={draft ?? row.min} onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    );
}

function InventoryView({ variant = 'admin' }) {
    const store = useInventoryStore();
    const online = useOnline();
    const onlineRef = useRef(online);
    onlineRef.current = online;
    const state = store.data;
    const isStaff = variant === 'staff';

    const [tab, setTab] = useState('entry');
    const [locView, setLocView] = useState('All'); // 'All' or a location name (shows that register list)
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [form, setForm] = useState(() => {
        let by = '';
        try { by = localStorage.getItem(NAME_KEY) || ''; } catch { /* storage blocked */ }
        return { code: '', type: 'OUT', qty: '', location: 'Basement Store', toLocation: 'Kitchen (Upar)', party: '', by, remarks: '', date: todayISO() };
    });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    // A tablet left open overnight must not keep dating entries "yesterday"
    const dateEdited = useRef(false);
    useEffect(() => {
        const roll = () => { if (!dateEdited.current) setForm(f => (f.date === todayISO() ? f : { ...f, date: todayISO() })); };
        const t = setInterval(roll, 60000);
        document.addEventListener('visibilitychange', roll);
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', roll); };
    }, []);
    const [saving, setSaving] = useState(false);
    // In-app viewer (no pop-ups): { kind: 'report' } or { kind: 'list', id }
    const [viewer, setViewer] = useState(null);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [pdfMsg, setPdfMsg] = useState(null);
    const reportFrame = useRef(null);
    useEffect(() => {
        if (!viewer) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setViewer(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [viewer]);

    const rows = useMemo(() => computeStock(inventoryItems, state.transactions, state.minLevels, state.conditions), [state]);
    const categories = useMemo(() => ['All', ...new Set(inventoryItems.map(i => i.category))], []);
    const count = (s) => rows.filter(r => r.status === s).length;
    const today = todayISO();
    const kpis = [
        { id: 'total', label: 'Total items', value: rows.length, tone: 'navy', icon: Boxes, items: rows },
        { id: 'reorder', label: 'Reorder now', value: count('REORDER') + count('OUT OF STOCK') + count('CHECK COUNT'), tone: 'red', icon: AlertTriangle, items: rows.filter(r => r.status === 'REORDER' || r.status === 'OUT OF STOCK' || r.status === 'CHECK COUNT') },
        { id: 'alerts', label: 'Expired / refill', value: count('EXPIRED') + count('REFILL'), tone: 'amber', icon: Clock, items: rows.filter(r => r.status === 'EXPIRED' || r.status === 'REFILL') },
        { id: 'today', label: 'Entries today', value: state.transactions.filter(t => t.date === today).length, tone: 'green', icon: ListChecks, entries: state.transactions.filter(t => t.date === today) },
    ];

    const visible = rows.filter(r =>
        (category === 'All' || r.category === category) &&
        (statusFilter === 'All' || r.status === statusFilter || (statusFilter === 'REORDER' && (r.status === 'OUT OF STOCK' || r.status === 'CHECK COUNT'))) &&
        (!search || `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase()))
    );
    const selected = rows.find(r => r.code === form.code);
    const byCode = Object.fromEntries(rows.map(r => [r.code, r]));
    const alerts = rows.filter(r => ['CHECK COUNT', 'EXPIRED', 'REFILL', 'OUT OF STOCK', 'REORDER'].includes(r.status));

    const handleSave = async () => {
        const msg = validateTransaction(form, rows);
        if (msg) { setError(msg); setNotice(''); return; }
        const entry = { code: form.code, type: form.type, qty: Number(form.qty), date: form.date, location: form.location, party: form.party.trim(), by: form.by.trim(), remarks: form.remarks.trim() };
        if (form.type === 'TRANSFER') entry.toLocation = form.toLocation;
        const label = form.type === 'TRANSFER'
            ? `TRANSFER ${entry.qty} ${selected.unit} ${entry.location} → ${entry.toLocation} - ${selected.name}`
            : `${entry.type} ${entry.qty} ${selected.unit} - ${selected.name}`;
        try { localStorage.setItem(NAME_KEY, entry.by); } catch { /* storage blocked */ }
        // Clear the form right away so the next entry typed while this one syncs is never wiped
        setForm(f => ({ ...f, code: '', qty: '', party: '', remarks: '', date: dateEdited.current ? f.date : todayISO() }));
        setError('');
        setSaving(true);
        try {
            // Written to the local cache instantly; syncs to all devices (queued while offline)
            const saving = store.addTransaction(entry);
            // a rejection after the 1.5 s "saved" notice must still be shown, never silently lost
            saving.catch(() => { setNotice(''); setError(`NOT saved: "${label}". Check internet and enter it again.`); });
            await Promise.race([saving, new Promise(r => setTimeout(r, 1500))]);
            setNotice(onlineRef.current ? `${label} saved.` : `${label} saved on this device. It will sync when internet returns.`);
        } catch {
            setError(`Could not save "${label}". Check internet and enter it again.`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm('Delete this entry? Stock will be recalculated.')) return;
        store.deleteTransaction(id).catch(() => setError('Could not delete entry.'));
    };
    const setMin = (code, value) => store.setMinLevel(code, value).catch(() => setError('Could not save Min. Level.'));
    const setCondition = (code, value) => store.setCondition(code, value).catch(() => setError('Could not save condition.'));

    const generatedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const countDates = LOCATIONS.map(l => `${l} ${COUNT_DATES[l]}`).join(', ');
    // Real PDF file (no pop-up): phone share sheet -> WhatsApp / Gmail, or download on computer
    const downloadPDF = async () => {
        setPdfBusy(true);
        setPdfMsg(null);
        try {
            const { buildInventoryPdf, shareOrDownloadPdf } = await import('../lib/inventoryPdf');
            const doc = buildInventoryPdf(rows, state.transactions, { generatedAt, countDates });
            const result = await shareOrDownloadPdf(doc, `HotelSky5_Inventory_${today}.pdf`);
            if (result === 'downloaded') setPdfMsg({ type: 'ok', text: `Saved: HotelSky5_Inventory_${today}.pdf (check Downloads)` });
            if (result === 'shared') setPdfMsg({ type: 'ok', text: 'PDF shared.' });
        } catch {
            setPdfMsg({ type: 'err', text: 'Could not create the PDF. Please try again.' });
        } finally {
            setPdfBusy(false);
        }
    };
    const printReport = () => {
        const w = reportFrame.current?.contentWindow;
        if (w) { w.focus(); w.print(); }
    };
    const shareWhatsApp = () => {
        const text = whatsappSummary(rows, state.transactions, { generatedAt, link: `${window.location.origin}/inventory` });
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        // In-app browsers block new tabs; fall back to navigating
        if (!window.open(url, '_blank')) window.location.href = url;
    };

    if (store.status !== 'ready') {
        return (
            <div className="inv" data-testid="inv-loading">
                <div className="inv-card inv-empty">{store.syncError || 'Loading live stock…'}</div>
            </div>
        );
    }

    const shareButtons = (
        <>
            <button data-testid="inv-share-pdf" className="inv-btn" onClick={() => { setPdfMsg(null); setViewer({ kind: 'report' }); }}><FileText />PDF Report</button>
            <button data-testid="inv-share-whatsapp" className="inv-btn" onClick={shareWhatsApp}><Share2 />WhatsApp</button>
        </>
    );

    const toolbar = (
        <div className="inv-toolbar">
            <span data-testid="inv-live" className={`inv-live${store.syncError || !online ? ' err' : ''}`}>
                <span className="dot" />{!online ? 'Offline · entries are kept on this device and sync when internet returns' : store.syncError || 'Live · synced on all devices'}
            </span>
            <span className="inv-spacer" />
            {shareButtons}
            {!isStaff && (
                <>
                    <button data-testid="inv-export-stock" className="inv-btn" onClick={() => downloadCSV(`Sky5_Stock_${today}.csv`, stockCSV(rows, LOCATIONS))}><FileSpreadsheet />Stock Excel</button>
                    <button data-testid="inv-export-register" className="inv-btn" onClick={() => downloadCSV(`Sky5_Stock_Register_${today}.csv`, registerCSV(state.transactions, rows))}><FileSpreadsheet />Register Excel</button>
                </>
            )}
        </div>
    );

    const kpiStrip = (
        <div className="inv-kpis">
            {kpis.map(k => {
                const Icon = k.icon;
                return (
                    <button type="button" key={k.id} data-testid={`inv-kpi-${k.id}`} className={`inv-kpi tone-${k.tone}`}
                        onClick={() => setViewer({ kind: 'list', id: k.id })} title={`Open ${k.label} list`}>
                        <span className="inv-kpi-icon"><Icon /></span>
                        <span><span className="inv-kpi-label">{k.label}</span><br /><span className="inv-kpi-value">{k.value}</span></span>
                    </button>
                );
            })}
        </div>
    );

    const openKpi = viewer?.kind === 'list' ? kpis.find(k => k.id === viewer.id) : null;
    const viewerModal = viewer && (
        <div className="inv-modal-bg" onClick={() => setViewer(null)}>
            <div className="inv-modal" data-testid="inv-viewer" role="dialog" aria-modal="true" aria-labelledby="inv-viewer-title" onClick={e => e.stopPropagation()}>
                <div className="inv-modal-head">
                    <h3 className="inv-card-title" id="inv-viewer-title">{viewer.kind === 'report' ? <><FileText />Inventory report</> : <>{openKpi.label} ({openKpi.value})</>}</h3>
                    <span className="inv-spacer" />
                    {viewer.kind === 'report' && (
                        <>
                            <button data-testid="inv-pdf-download" className="inv-btn inv-btn-primary" onClick={downloadPDF} disabled={pdfBusy}><Download />{pdfBusy ? 'Preparing…' : 'Download / Share PDF'}</button>
                            <button data-testid="inv-pdf-print" className="inv-btn" onClick={printReport}><Printer />Print</button>
                        </>
                    )}
                    <button data-testid="inv-viewer-close" className="inv-btn" onClick={() => setViewer(null)} aria-label="Close"><X /></button>
                </div>
                {pdfMsg && viewer.kind === 'report' && <div data-testid="inv-pdf-msg" className={`inv-msg ${pdfMsg.type}`} style={{ margin: '0 16px 10px' }}>{pdfMsg.type === 'ok' ? <CheckCircle2 /> : <XCircle />}{pdfMsg.text}</div>}
                <div className="inv-modal-body">
                    {viewer.kind === 'report' && (
                        <iframe ref={reportFrame} title="Inventory report" data-testid="inv-report-frame" className="inv-report-frame"
                            srcDoc={reportHTML(rows, state.transactions, { generatedAt, countDates, embedded: true })} />
                    )}
                    {openKpi?.items && (
                        openKpi.items.length === 0 ? <div className="inv-empty">Nothing here.</div> : (
                            <div className="inv-stock-cards">
                                {openKpi.items.map(r => (
                                    <div key={r.code} className="inv-stock-card" data-testid={`inv-viewer-row-${r.code}`}>
                                        <div className="txt"><div className="name">{r.name}</div><div className="meta">{r.code} · {r.category}{r.note ? ` · ${r.note.split(': ').pop()}` : ''}</div></div>
                                        <div className="qty"><b>{r.current}</b><span className="inv-sub">{r.unit}</span></div>
                                        <span className={stClass(r.status)}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                    {openKpi?.entries && (
                        openKpi.entries.length === 0 ? <div className="inv-empty">No entries today yet.</div> : (
                            <div className="inv-hist">
                                {openKpi.entries.map(t => (
                                    <div key={t.id} className="inv-hist-item" data-testid="inv-viewer-entry">
                                        <span className={`badge ${t.type}`}><TypeIcon type={t.type} /></span>
                                        <div className="txt">
                                            <div><b>{t.type} {t.qty} {byCode[t.code]?.unit}</b> · {byCode[t.code]?.name}</div>
                                            <div className="meta">{t.by}{t.party ? ` · ${t.party}` : ''}{t.remarks ? ` · ${t.remarks}` : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    const entryForm = (
        <div className="inv-card">
            <div className="inv-card-head"><h3 className="inv-card-title"><PenLine />New stock entry</h3></div>
            <div className="inv-form">
                <div className="inv-field full">
                    <span className="inv-label">Item <span className="req">*</span></span>
                    <ItemPicker rows={rows} value={form.code} onChange={code => { setForm(f => ({ ...f, code })); setError(''); }} />
                </div>
                <div className="inv-field">
                    <span className="inv-label">Type <span className="req">*</span></span>
                    <div className="inv-seg">
                        <button type="button" data-testid="inv-type-IN" className={form.type === 'IN' ? 'on-in' : ''} onClick={() => setForm({ ...form, type: 'IN' })}><ArrowDownToLine />IN</button>
                        <button type="button" data-testid="inv-type-OUT" className={form.type === 'OUT' ? 'on-out' : ''} onClick={() => setForm({ ...form, type: 'OUT' })}><ArrowUpFromLine />OUT</button>
                        <button type="button" data-testid="inv-type-TRANSFER" className={form.type === 'TRANSFER' ? 'on-move' : ''}
                            onClick={() => setForm(f => ({ ...f, type: 'TRANSFER', toLocation: LOCATIONS.find(l => l !== f.location) }))}><ArrowRightLeft />MOVE</button>
                    </div>
                </div>
                <div className="inv-field">
                    <span className="inv-label">Quantity <span className="req">*</span> {selected ? `(${selected.unit})` : ''}</span>
                    <div className="inv-stepper">
                        <button type="button" data-testid="inv-qty-minus" aria-label="Decrease" onClick={() => setForm(f => ({ ...f, qty: String(Math.max(0, (Number(f.qty) || 0) - 1)) }))}><Minus /></button>
                        <input data-testid="inv-qty" aria-label="Quantity" type="number" min="0" step="any" inputMode="decimal" value={form.qty} placeholder="0"
                            onChange={e => { setForm({ ...form, qty: e.target.value }); setError(''); }} />
                        <button type="button" data-testid="inv-qty-plus" aria-label="Increase" onClick={() => setForm(f => ({ ...f, qty: String((Number(f.qty) || 0) + 1) }))}><Plus /></button>
                    </div>
                </div>
                <label className="inv-field">
                    <span className="inv-label">Date <span className="req">*</span></span>
                    <input data-testid="inv-date" type="date" className="inv-input" value={form.date} onChange={e => { dateEdited.current = true; setForm({ ...form, date: e.target.value }); }} />
                </label>
                <label className="inv-field">
                    <span className="inv-label">{form.type === 'TRANSFER' ? 'From' : 'Location'} <span className="req">*</span>{selected ? <span className="inv-sub"> · has {selected.atLocation?.[form.location] ?? 0} {selected.unit}</span> : null}</span>
                    <select data-testid="inv-location" className="inv-input" value={form.location}
                        onChange={e => { const location = e.target.value; setForm(f => ({ ...f, location, toLocation: f.toLocation === location ? LOCATIONS.find(l => l !== location) : f.toLocation })); setError(''); }}>
                        {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                    </select>
                </label>
                {form.type === 'TRANSFER' ? (
                    <label className="inv-field">
                        <span className="inv-label">To <span className="req">*</span></span>
                        <select data-testid="inv-to-location" className="inv-input" value={form.toLocation} onChange={e => { setForm({ ...form, toLocation: e.target.value }); setError(''); }}>
                            {LOCATIONS.filter(l => l !== form.location).map(l => <option key={l}>{l}</option>)}
                        </select>
                    </label>
                ) : (
                    <label className="inv-field">
                        <span className="inv-label">{form.type === 'IN' ? 'Supplier' : 'Issued to'}</span>
                        <input data-testid="inv-party" className="inv-input" value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} placeholder={form.type === 'IN' ? 'Vendor / shop' : 'Room / kitchen / staff'} />
                    </label>
                )}
                <label className="inv-field">
                    <span className="inv-label">Your name <span className="req">*</span></span>
                    <input data-testid="inv-by" className="inv-input" value={form.by} onChange={e => { setForm({ ...form, by: e.target.value }); setError(''); }} placeholder="Entered by" />
                </label>
                <label className="inv-field full">
                    <span className="inv-label">Remarks</span>
                    <input data-testid="inv-remarks" className="inv-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
                </label>
            </div>
            {error && <div data-testid="inv-error" className="inv-msg err"><XCircle />{error}</div>}
            {notice && !error && <div data-testid="inv-notice" className="inv-msg ok"><CheckCircle2 />{notice}</div>}
            <button data-testid="inv-save" className="inv-btn inv-btn-primary inv-btn-block" style={{ marginTop: 16 }} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save entry'}
            </button>
        </div>
    );

    const alertCard = (
        <div className="inv-card">
            <div className="inv-card-head"><h3 className="inv-card-title"><AlertTriangle />Action required ({alerts.length})</h3></div>
            <div data-testid="inv-alerts" className="inv-alerts" tabIndex={0} role="region" aria-label="Stock alerts">
                {alerts.length === 0 && <div className="inv-empty">No alerts.</div>}
                {alerts.map(r => (
                    <div key={r.code} className="inv-alert">
                        <div className="txt">
                            <div className="name">{r.name} <span className="inv-sub">· {r.current} {r.unit}</span></div>
                            {r.note && <div className="note">{r.note.split(': ').pop()}</div>}
                        </div>
                        <span className={stClass(r.status)}>{r.status}</span>
                    </div>
                ))}
            </div>
            <div className="inv-foot">Opening stock = physical count ({LOCATIONS.map(l => `${l} ${COUNT_DATES[l]}`).join(' · ')}). Current = opening + IN − OUT. MOVE shifts stock between locations.</div>
        </div>
    );

    const filters = (
        <div className="inv-filters">
            <div className="inv-search"><Search /><input data-testid="inv-search" aria-label="Search stock" className="inv-input" placeholder="Search item or code" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select data-testid="inv-category" aria-label="Category" className="inv-input" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
            </select>
            <select data-testid="inv-status" aria-label="Status" className="inv-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {['All', 'OK', 'REORDER', 'EXPIRED', 'REFILL'].map(s => <option key={s} value={s}>{s === 'All' ? 'All status' : s}</option>)}
            </select>
        </div>
    );

    const locSwitch = (
        <div className="inv-locs" role="tablist" aria-label="Location">
            {['All', ...LOCATIONS].map(l => (
                <button key={l} role="tab" aria-selected={locView === l} data-testid={`inv-loc-${l === 'All' ? 'all' : l.split(' ')[0].toLowerCase()}`} className={locView === l ? 'on' : ''} onClick={() => setLocView(l)}>
                    {l === 'All' ? <><Boxes />All items</> : <><MapPin />{l} list</>}
                </button>
            ))}
        </div>
    );

    // One location: the register pages exactly as written (Sr. No. order) with the live quantity there
    const locationList = locView !== 'All' && (
        <div className="inv-card" data-testid="inv-location-list">
            <div className="inv-card-head">
                <h3 className="inv-card-title"><MapPin />{locView} <span className="inv-sub">· counted {COUNT_DATES[locView]}</span></h3>
                {locSwitch}
            </div>
            {registerLists.map((list, li) => list.location !== locView ? null : (
                <div key={list.title} style={{ marginBottom: 18 }}>
                    <div className="inv-list-title">{list.title}</div>
                    <div className="inv-table-wrap" tabIndex={0} role="region" aria-label="Stock table (scrolls sideways)">
                        <table className="inv-table">
                            <thead><tr><th className="num">Sr.</th><th>Item</th><th>As written</th><th className="num">Counted</th><th className="num">Now here</th><th>Unit</th><th>Status</th></tr></thead>
                            <tbody>
                                {list.lines.map(ln => {
                                    const r = byCode[ln.code];
                                    return (
                                        <tr key={ln.sr} data-testid={`inv-list-row-${li}-${ln.sr}`}>
                                            <td className="num">{ln.sr}</td>
                                            <td>{r.name}{ln.note && <span className="flag" title={ln.note}>*</span>}</td>
                                            <td style={{ color: '#6b7280' }}>{ln.asWritten}</td>
                                            <td className="num">{ln.qty}</td>
                                            <td className="num cur" data-testid="inv-list-now">{r.atLocation?.[locView] ?? 0}</td>
                                            <td>{r.unit}</td>
                                            <td><span className={stClass(r.status)}>{r.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
            <div className="inv-foot">* Handwritten count to be confirmed — hover the mark for details.</div>
        </div>
    );

    const stockTable = (
        <div className="inv-card">
            <div className="inv-card-head">
                <h3 className="inv-card-title"><Package />Live stock ({visible.length})</h3>
                {locSwitch}
                {filters}
            </div>
            <div className="inv-table-wrap" tabIndex={0} role="region" aria-label="Stock table (scrolls sideways)">
                <table className="inv-table">
                    <thead>
                        <tr>
                            <th>Code</th><th>Item</th><th>Category</th><th>Unit</th>
                            {LOCATIONS.map(l => <th key={l} className="num">{shortLoc(l)}</th>)}
                            <th className="num">In</th><th className="num">Out</th><th className="num">Total</th>
                            <th>Min. level</th><th>Condition</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(r => (
                            <tr key={r.code} data-testid={`inv-row-${r.code}`}>
                                <td className="code">{r.code}</td>
                                <td>{r.name}{r.note && <span className="flag" title={r.note}>*</span>}</td>
                                <td style={{ color: '#6b7280' }}>{r.category}</td>
                                <td>{r.unit}</td>
                                {LOCATIONS.map(l => <td key={l} className="num" data-testid={`inv-at-${l.split(' ')[0].toLowerCase()}`}>{r.atLocation?.[l] ?? 0}</td>)}
                                <td className="num in">{r.stockIn || '–'}</td>
                                <td className="num out">{r.stockOut || '–'}</td>
                                <td className="num cur" data-testid="inv-current">{r.current}</td>
                                <td><MinInput row={r} onSave={v => setMin(r.code, v)} /></td>
                                <td>
                                    <select className="inv-cond" aria-label={`Condition of ${r.name}`} value={r.condition} onChange={e => setCondition(r.code, e.target.value)}>
                                        {['Good', 'Damaged', 'EXPIRED', 'EMPTY'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td><span data-testid="inv-status-badge" className={stClass(r.status)}>{r.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="inv-foot">* Handwritten count to be confirmed — hover the mark for details.</div>
        </div>
    );

    const stockCards = (
        <div className="inv-card">
            <div className="inv-card-head"><h3 className="inv-card-title"><Package />Live stock ({visible.length})</h3>{locSwitch}{filters}</div>
            <div className="inv-stock-cards">
                {visible.map(r => (
                    <div key={r.code} className="inv-stock-card" data-testid={`inv-row-${r.code}`}>
                        <div className="txt">
                            <div className="name">{r.name}</div>
                            <div className="meta">{r.code} · {locSplit(r)}</div>
                        </div>
                        <div className="qty">
                            <b data-testid="inv-current">{r.current}</b>
                            <span className="inv-sub">{r.unit}</span>
                        </div>
                        <span data-testid="inv-status-badge" className={stClass(r.status)}>{r.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const emptyRegister = <div className="inv-empty">No entries yet. Every purchase (IN) and issue (OUT) goes here.</div>;

    const registerTable = (
        <div className="inv-card">
            <div className="inv-card-head"><h3 className="inv-card-title"><History />Stock register ({state.transactions.length})</h3></div>
            {state.transactions.length === 0 ? emptyRegister : (
                <div className="inv-table-wrap" tabIndex={0} role="region" aria-label="Stock table (scrolls sideways)">
                    <table className="inv-table" data-testid="inv-register">
                        <thead><tr><th>Date</th><th>Item</th><th>Type</th><th className="num">Qty</th><th>Location</th><th>Supplier / issued to</th><th>By</th><th>Remarks</th><th /></tr></thead>
                        <tbody>
                            {state.transactions.map(t => (
                                <tr key={t.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                                    <td>{byCode[t.code]?.name} <span className="code">{t.code}</span></td>
                                    <td><span className={`inv-type ${t.type}`}>{t.type}</span></td>
                                    <td className="num">{t.qty} {byCode[t.code]?.unit}</td>
                                    <td>{whereLabel(t)}</td>
                                    <td>{t.party || '–'}</td>
                                    <td>{t.by}</td>
                                    <td style={{ color: '#6b7280' }}>{t.remarks || '–'}</td>
                                    <td><button data-testid="inv-delete" className="inv-del" aria-label="Delete entry" onClick={() => handleDelete(t.id)}><Trash2 /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const historyList = (
        <div className="inv-card">
            <div className="inv-card-head"><h3 className="inv-card-title"><History />History ({state.transactions.length})</h3></div>
            {state.transactions.length === 0 ? emptyRegister : (
                <div className="inv-hist" data-testid="inv-register">
                    {state.transactions.map(t => (
                        <div key={t.id} className="inv-hist-item">
                            <span className={`badge ${t.type}`}><TypeIcon type={t.type} /></span>
                            <div className="txt">
                                <div><b>{t.type} {t.qty} {byCode[t.code]?.unit}</b> · {byCode[t.code]?.name}</div>
                                <div className="meta">{fmtDate(t.date)} · {whereLabel(t)} · {t.by}{t.party ? ` · ${t.party}` : ''}</div>
                            </div>
                            <button data-testid="inv-delete" className="inv-del" aria-label="Delete entry" onClick={() => handleDelete(t.id)}><Trash2 /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (isStaff) {
        return (
            <div className="inv inv-staff" data-testid="inventory-view">
                {toolbar}
                {kpiStrip}
                <div className="inv-tabs" role="tablist" aria-label="Inventory sections">
                    <button role="tab" aria-selected={tab === 'entry'} data-testid="inv-tab-entry" className={tab === 'entry' ? 'on' : ''} onClick={() => setTab('entry')}><PenLine />Entry</button>
                    <button role="tab" aria-selected={tab === 'stock'} data-testid="inv-tab-stock" className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}><Package />Stock</button>
                    <button role="tab" aria-selected={tab === 'history'} data-testid="inv-tab-history" className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}><History />History</button>
                </div>
                {tab === 'entry' && <>{entryForm}{alertCard}</>}
                {tab === 'stock' && (locView === 'All' ? stockCards : locationList)}
                {tab === 'history' && historyList}
                {viewerModal}
            </div>
        );
    }

    return (
        <div className="inv inv-admin" data-testid="inventory-view">
            {toolbar}
            {kpiStrip}
            <div className="inv-top">{entryForm}{alertCard}</div>
            {locView === 'All' ? stockTable : locationList}
            {registerTable}
            {viewerModal}
        </div>
    );
}

export default InventoryView;
