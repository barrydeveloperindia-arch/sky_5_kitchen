/**
 * HOTEL SKY 5 - staff directory (pure helpers for OPS Center -> Workforce -> Staff Directory).
 * Same idea as the AuraLock admin "Users" page: every person has a staff ID (SKY5-###, the same
 * numbers AuraLock uses), a post, shift, mobile, joining date, a photo and a status. People who leave
 * are marked "Left" (never deleted) so their old attendance stays readable.
 * Aadhaar / PAN / bank details are NOT kept here: this app has no login, so anything saved is
 * readable by whoever has the link. Those stay in AuraLock.
 */
export const DEPARTMENTS = [
    { key: 'reception', label: 'Front Desk & Management', prefix: 'R' },
    { key: 'kitchen', label: 'Kitchen', prefix: 'K' },
    { key: 'housekeeping', label: 'Housekeeping', prefix: 'H' },
];
export const deptLabel = (key) => DEPARTMENTS.find(d => d.key === key)?.label || key;

const ID_RE = /^SKY5-(\d{3})$/;

// Everyone in the register, each with their department
export function allStaff(registry) {
    return DEPARTMENTS.flatMap(d => (registry?.[d.key] || []).filter(Boolean).map(s => ({ ...s, department: d.key })));
}

export const isLeft = (s) => s?.status === 'Left';

// Next free SKY5-### number (one more than the highest in use)
export function nextStaffId(registry) {
    const used = allStaff(registry).map(s => ID_RE.exec(s.staffId || '')).filter(Boolean).map(m => Number(m[1]));
    return `SKY5-${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, '0')}`;
}

// "+91 98887 02845" / "098887-02845" -> "9888702845"; '' stays ''; anything else is returned as typed
export function normalizeMobile(v) {
    const digits = String(v || '').replace(/\D/g, '');
    if (!digits) return '';
    const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
    return ten;
}

export const EMPTY_FORM = { name: '', role: '', department: 'reception', shift: '', phone: '', joinDate: '', duties: '' };

// Field errors for the form ({} = fine). `selfId` = the record being edited (it may keep its own name / mobile).
export function validateStaff(form, registry, selfId = null) {
    const errors = {};
    const name = String(form.name || '').trim();
    if (!name) errors.name = 'Name is required.';
    if (!String(form.role || '').trim()) errors.role = 'Post is required.';
    if (!DEPARTMENTS.some(d => d.key === form.department)) errors.department = 'Choose a department.';
    const mobile = normalizeMobile(form.phone);
    if (form.phone && !/^[6-9]\d{9}$/.test(mobile)) errors.phone = 'Mobile must be 10 digits (starting 6-9).';
    if (form.joinDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.joinDate)) errors.joinDate = 'Pick a date.';
    const others = allStaff(registry).filter(s => s.id !== selfId);
    if (name && others.some(s => String(s.name).trim().toLowerCase() === name.toLowerCase())) errors.name = `${name} is already in the staff list.`;
    if (mobile && !errors.phone) {
        const same = others.find(s => normalizeMobile(s.phone) === mobile);
        if (same) errors.phone = `This mobile is already saved for ${same.name}.`;
    }
    return errors;
}

const clean = (form) => ({
    name: String(form.name).trim(),
    role: String(form.role).trim(),
    shift: String(form.shift || '').trim(),
    phone: normalizeMobile(form.phone),
    joinDate: form.joinDate || '',
    duties: String(form.duties || '').trim(),
});

// A record id that is unique inside the register (R1, K4, H5 ...)
function newRecordId(registry, dept) {
    const prefix = DEPARTMENTS.find(d => d.key === dept).prefix;
    const used = new Set(allStaff(registry).map(s => s.id));
    let n = (registry?.[dept] || []).length + 1;
    while (used.has(`${prefix}${n}`)) n += 1;
    return `${prefix}${n}`;
}

// New person -> { registry, staff }. Call validateStaff first.
export function addStaff(registry, form, extra = {}) {
    const dept = form.department;
    const staff = { id: newRecordId(registry, dept), staffId: nextStaffId(registry), ...clean(form), status: 'Active', photo: '', ...extra };
    return { registry: { ...registry, [dept]: [...(registry?.[dept] || []), staff] }, staff };
}

// Change a person (also moves them when the department changes). Keeps id, staffId, status, photo.
export function updateStaff(registry, id, form, extra = {}) {
    const current = allStaff(registry).find(s => s.id === id);
    if (!current) return registry;
    const { department: from, ...rest } = current;
    const updated = { ...rest, ...clean(form), ...extra };
    const to = form.department || from;
    const next = { ...registry };
    if (to === from) next[from] = registry[from].map(s => (s.id === id ? updated : s));
    else { next[from] = registry[from].filter(s => s.id !== id); next[to] = [...(registry[to] || []), updated]; }
    return next;
}

// Mark someone as Left (with the date) or bring them back to Active
export function setStaffStatus(registry, id, status, date = '') {
    const next = { ...registry };
    for (const d of DEPARTMENTS) {
        if (!(registry?.[d.key] || []).some(s => s.id === id)) continue;
        next[d.key] = registry[d.key].map(s => (s.id !== id ? s : status === 'Left' ? { ...s, status: 'Left', leftDate: date } : { ...s, status: 'Active', leftDate: '' }));
    }
    return next;
}

// List shown in the directory: search (name / ID / post / mobile), status filter, department filter
export function filterStaff(list, { search = '', status = 'Active', dept = 'all' } = {}) {
    const q = search.trim().toLowerCase();
    return list.filter(s => (status === 'all' || (status === 'Left' ? isLeft(s) : !isLeft(s)))
        && (dept === 'all' || s.department === dept)
        && (!q || [s.name, s.staffId, s.role, s.phone].some(v => String(v || '').toLowerCase().includes(q))));
}

export function staffCounts(list) {
    return { total: list.length, active: list.filter(s => !isLeft(s)).length, left: list.filter(isLeft).length, withPhoto: list.filter(s => s.photoId || s.photo).length };
}
