import { useMemo, useState } from 'react';
import { UserCheck, CalendarOff, PartyPopper, Plus, UserPlus, Users, AlarmClock, UserX, Search, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AttendanceProof from './AttendanceProof';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { shiftLabel, workedHours, formatHours } from '../../lib/staffAttendance';
import { registerRows, filterRows, dayCounts, rowStatus } from '../../lib/attendanceRegister';

const nowMs = () => Date.now();   // read when the register is drawn (outside the component)
const OPEN_LIMIT_MS = 16 * 3600000;   // a check-in older than this without a check-out = the check-out was missed
const has = (v) => !!v && v !== '--';
// the check-out was on another calendar day than the check-in (night shift)
const nextDay = (log) => { const a = Date.parse(log.inAt || ''), b = Date.parse(log.outAt || ''); return Number.isFinite(a) && Number.isFinite(b) && new Date(a).toDateString() !== new Date(b).toDateString(); };
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const STATUS_BADGE = {
    present: ['PRESENT', 'border-success/30 bg-success/10 text-success'],
    late: ['PRESENT', 'border-success/30 bg-success/10 text-success'],
    absent: ['ABSENT', 'border-destructive/30 bg-destructive/10 text-destructive'],
    notin: ['NOT IN YET', 'border-border bg-muted text-muted-foreground'],
    leave: ['ON LEAVE', 'border-warning/30 bg-warning/10 text-warning'],
    pending: ['PENDING', 'border-border bg-muted text-muted-foreground'],
};
const RANGES = [['day', 'THIS DAY'], ['week', 'LAST 7 DAYS'], ['month', 'THIS MONTH'], ['all', 'ALL RECORDS']];
const STATUSES = [['', 'All status'], ['present', 'Present (incl. late)'], ['late', 'Late'], ['absent', 'Absent'], ['notin', 'Not in yet'], ['leave', 'On leave']];

function Avatar({ name, photo }) {
    // Photos only when the hotel saved one; otherwise local initials (no staff names sent to outside sites)
    if (photo) return <img src={photo} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
    return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary" aria-hidden>{initials(name)}</span>;
}

function Kpi({ icon, title, value, testid, tone, note, bar, barTone }) {
    const Icon = icon;
    return (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tone)}><Icon className="size-5" /></span>
                <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">{title}</h4>
                    <div className="truncate text-xl font-bold text-primary" data-testid={testid}>{value}</div>
                </div>
            </div>
            {bar != null && <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn('h-full rounded-full', barTone)} style={{ width: `${Math.min(100, bar)}%` }} /></div>}
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
    );
}

// The register as a printable PDF (the view on screen: range + filters)
async function exportPdf(rows, title) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(14); pdf.text('Hotel Sky 5 - Attendance Register', 40, 36);
    pdf.setFontSize(9); pdf.text(title, 40, 52);
    autoTable(pdf, {
        startY: 64, styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [10, 25, 47] },
        head: [['Sr.', 'Emp ID', 'Name', 'Department', 'Date', 'Check-in', 'Check-out', 'Hours', 'Status']],
        body: rows.map(r => [r.sr, r.staffId || '-', r.staffName, r.dept || '-', r.date, r.checkIn, r.checkOut, r.hoursText, r.statusText]),
    });
    pdf.save(`HotelSky5_Attendance_${title.replace(/[^\w-]+/g, '_')}.pdf`);
}

// Attendance summary + register (the calendar and leave panels stay below it)
export default function AttendanceLedger({
    logs, registry, staff, presentToday, leaveToday, upcomingHoliday, auditDate, scope, onScope,
    onExport, onShare, onEnroll, onManual, selectedDay, selectedToday,
}) {
    const [search, setSearch] = useState('');
    const [dept, setDept] = useState('');
    const [status, setStatus] = useState('');
    const all = [...registry.reception, ...registry.kitchen, ...registry.housekeeping];
    const info = (name) => all.find(s => s.name === name);
    const shiftOf = (name) => info(name)?.shift || '';

    const rows = useMemo(() => registerRows({ logs, staff, scope, selectedDay, today: selectedToday, now: new Date(nowMs()) }), [logs, staff, scope, selectedDay, selectedToday]);
    const shown = filterRows(rows, { search, dept, status }, shiftOf);
    const today = dayCounts(registerRows({ logs, staff, scope: 'day', selectedDay: selectedToday, today: selectedToday, now: new Date(nowMs()) }), staff.length, shiftOf);
    const filtered = !!(search || dept || status);

    const view = shown.map(r => {
        const st = rowStatus(r, shiftOf(r.staffName));
        const hrs = has(r.checkIn) && has(r.checkOut) ? (typeof r.hours === 'number' ? r.hours : workedHours(r)) : null;
        return { ...r, st, hoursText: hrs != null ? formatHours(hrs) : '--', statusText: STATUS_BADGE[st]?.[0] || String(r.status || '').toUpperCase() };
    });

    return (
        <div className="ui space-y-5" data-testid="attendance-ledger">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
                <Kpi icon={Users} title="Total staff" value={today.total} testid="att-total-staff" tone="bg-primary/10 text-primary" note="Working on the register" />
                <Kpi icon={UserCheck} title="Present today" value={`${presentToday} STAFF`} testid="att-present-today" tone="bg-success/10 text-success" bar={today.pct} barTone="bg-success" note={`${today.pct}% of staff`} />
                <Kpi icon={AlarmClock} title="Late today" value={today.late} testid="att-late-today" tone="bg-warning/10 text-warning" note="10+ min after shift start" />
                <Kpi icon={UserX} title="Not in today" value={today.absent} testid="att-absent-today" tone="bg-destructive/10 text-destructive" note="No check-in yet" />
                <Kpi icon={CalendarOff} title="On leave" value={`${leaveToday} STAFF`} testid="att-leave-today" tone="bg-warning/10 text-warning" />
                <Kpi icon={PartyPopper} title="Upcoming holiday" value={`${upcomingHoliday.event} (${upcomingHoliday.date})`} tone="bg-accent text-accent-foreground" />
            </div>

            <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold text-primary">Attendance Register</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span data-testid="att-audit-date" className="text-muted-foreground">Audit Date: <b className="text-foreground">{auditDate}</b></span>
                            <div className="inline-flex flex-wrap rounded-md border p-0.5" role="tablist" aria-label="Which records">
                                {RANGES.map(([k, label]) => (
                                    <Button key={k} data-testid={`att-scope-${k}`} role="tab" aria-selected={scope === k} size="xs" variant={scope === k ? 'default' : 'ghost'} onClick={() => onScope(k)}>{label}</Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onExport('daily')}>📅 DAILY</Button>
                        <Button size="sm" variant="outline" onClick={() => onExport('monthly')}>📊 MONTHLY</Button>
                        <Button size="sm" variant="outline" onClick={() => onExport('yearly')}>📁 YEARLY</Button>
                        <Button size="sm" variant="outline" data-testid="att-export-pdf" onClick={() => exportPdf(view, `${RANGES.find(r => r[0] === scope)?.[1] || ''} ${scope === 'day' ? selectedDay : ''}`.trim())}><FileDown />PDF</Button>
                        <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={onShare}>💬 SHARE</Button>
                        <Button size="sm" variant="outline" onClick={onEnroll} aria-label="+ ENROLL STAFF"><UserPlus />+ ENROLL STAFF</Button>
                        <Button size="sm" onClick={onManual} aria-label="+ MANUAL LOG"><Plus />+ MANUAL LOG</Button>
                    </div>
                </div>

                {/* filters, like the AuraLock register: name / ID, department, status */}
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <label className="relative">
                        <span className="sr-only">Search name or staff ID</span>
                        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input data-testid="att-filter-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or staff ID"
                            className="h-9 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary" />
                    </label>
                    <select data-testid="att-filter-dept" aria-label="Department" value={dept} onChange={e => setDept(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                        <option value="">All departments</option><option value="Reception">Reception</option><option value="Kitchen">Kitchen</option><option value="Housekeeping">Housekeeping</option>
                    </select>
                    <select data-testid="att-filter-status" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                        {STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" data-testid="att-filter-reset" disabled={!filtered} onClick={() => { setSearch(''); setDept(''); setStatus(''); }}>Reset</Button>
                </div>
                <p className="text-xs text-muted-foreground" data-testid="att-count">{view.length} {view.length === 1 ? 'row' : 'rows'}{filtered ? ' (filtered)' : ''}</p>

                <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Attendance register">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sr.</TableHead><TableHead>Emp ID</TableHead><TableHead>Staff</TableHead><TableHead>Department</TableHead><TableHead>Date</TableHead><TableHead>Scheduled shift</TableHead>
                                <TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Hours</TableHead><TableHead>Punctuality</TableHead><TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {view.length === 0 && (
                                <TableRow><TableCell colSpan={11} data-testid="att-empty" className="p-8 text-center text-muted-foreground">
                                    {filtered ? 'Nothing matches these filters.' : scope === 'day' ? `No attendance recorded for ${selectedDay}.` : 'No attendance recorded yet. Use + MANUAL LOG or + ENROLL STAFF.'}
                                </TableCell></TableRow>
                            )}
                            {view.map((log, i) => {
                                const person = info(log.staffName);
                                const isToday = log.date === selectedToday;
                                // in but never out, and it is too long ago to be a shift still going on
                                const inAt = Date.parse(log.inAt || '');
                                // In / out are made by the staff themselves (face scan or PIN); a mistake is corrected with + MANUAL LOG
                                const missedOut = has(log.checkIn) && !has(log.checkOut) && !log.readOnly
                                    && (Number.isFinite(inAt) ? nowMs() - inAt > OPEN_LIMIT_MS : !isToday);
                                const [badge, badgeTone] = STATUS_BADGE[log.st] || [log.statusText, STATUS_BADGE.pending[1]];
                                return (
                                    <TableRow key={log.id ?? `row-${i}`} data-status={log.st} className={cn(log.st === 'absent' && 'bg-destructive/5')}>
                                        <TableCell className="text-muted-foreground tabular-nums">{log.sr}</TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap">{log.staffId || '—'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={log.staffName} photo={person?.photo} />
                                                <div>
                                                    <div className="font-semibold text-primary">{log.staffName}</div>
                                                    <div className="text-[11px] text-muted-foreground">{log.scans > 1 && <span data-testid={`att-scans-${log.id}`} className="mr-1 rounded bg-muted px-1 font-semibold text-foreground">{log.scans} scans</span>}{log.missing ? 'No entry this day' : log.sources?.length > 1 ? log.sources.join(' + ') : log.source === 'face-scan' ? `Face scan (terminal) · ${log.staffId}` : log.source === 'staff-web' ? `Self check-in (phone)${log.inFace?.check === 'pin' || log.outFace?.check === 'pin' ? ' · PIN' : ''}` : `Log #${String(log.id).padStart(3, '0')}`}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{(log.dept || '—').toUpperCase()}</Badge></TableCell>
                                        <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{shiftLabel(person?.shift)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <span className={cn('font-semibold', log.checkIn === '--' ? 'text-muted-foreground' : 'text-success')}>{log.checkIn}</span>
                                                <AttendanceProof log={log} kind="in" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                {missedOut
                                                    ? <span data-testid={`att-missed-out-${log.id}`} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">No check-out</span>
                                                    : <span className={cn('font-semibold', log.checkOut === '--' ? 'text-muted-foreground' : 'text-warning')}>{log.checkOut}</span>}
                                                {has(log.checkOut) && nextDay(log) && <span className="text-[11px] font-semibold text-muted-foreground">next day</span>}
                                                <AttendanceProof log={log} kind="out" />
                                            </div>
                                        </TableCell>
                                        <TableCell data-testid={`att-hours-${log.id}`} className="whitespace-nowrap font-semibold tabular-nums">{log.hoursText}</TableCell>
                                        <TableCell>
                                            {log.st === 'late' ? <span className="text-xs font-bold text-destructive">LATE</span>
                                                : log.st === 'present' ? <span className="text-xs font-bold text-success">ON TIME</span>
                                                    : log.st === 'leave' ? <span className="text-xs font-bold text-warning">PLANNED</span>
                                                        : log.st === 'pending' ? <span className="text-xs font-bold text-muted-foreground">NOT IN</span>
                                                            : <span className="text-muted-foreground">--</span>}
                                        </TableCell>
                                        <TableCell><Badge variant="outline" data-testid={`att-status-${log.id}`} className={badgeTone}>{badge}</Badge></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    );
}
