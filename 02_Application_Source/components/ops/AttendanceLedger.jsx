import { UserCheck, CalendarOff, PartyPopper, Plus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AttendanceProof from './AttendanceProof';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS = {
    Present: 'border-success/30 bg-success/10 text-success',
    'Half-Day Leave': 'border-warning/30 bg-warning/10 text-warning',
    Pending: 'border-border bg-muted text-muted-foreground',
};
const statusStyle = (s) => STATUS[s] || (/leave/i.test(s || '') ? STATUS['Half-Day Leave'] : /absent/i.test(s || '') ? 'border-destructive/30 bg-destructive/10 text-destructive' : STATUS.Pending);
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function Avatar({ name, photo }) {
    // Photos only when the hotel saved one; otherwise local initials (no staff names sent to outside sites)
    if (photo) return <img src={photo} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
    return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary" aria-hidden>{initials(name)}</span>;
}

function Kpi({ icon, title, value, testid, tone }) {
    const Icon = icon;
    return (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tone)}><Icon className="size-5" /></span>
            <div className="min-w-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">{title}</h4>
                <div className="truncate text-xl font-bold text-primary" data-testid={testid}>{value}</div>
            </div>
        </div>
    );
}

// Attendance summary + register (the calendar and leave panels stay below it)
export default function AttendanceLedger({
    logs, registry, presentToday, leaveToday, upcomingHoliday, auditDate, scope, onScope,
    onExport, onShare, onEnroll, onManual, onQuickIn, onQuickOut, toMinutes, selectedDay,
}) {
    const all = [...registry.reception, ...registry.kitchen, ...registry.housekeeping];
    const deptOf = (name) => (registry.reception.some(s => s.name === name) ? 'Reception'
        : registry.kitchen.some(s => s.name === name) ? 'Kitchen'
            : registry.housekeeping.some(s => s.name === name) ? 'Housekeeping' : '—');

    return (
        <div className="ui space-y-5" data-testid="attendance-ledger">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
                <Kpi icon={UserCheck} title="Present Today" value={`${presentToday} STAFF`} testid="att-present-today" tone="bg-success/10 text-success" />
                <Kpi icon={CalendarOff} title="On Leave" value={`${leaveToday} STAFF`} testid="att-leave-today" tone="bg-warning/10 text-warning" />
                <Kpi icon={PartyPopper} title="Upcoming Holiday" value={`${upcomingHoliday.event} (${upcomingHoliday.date})`} tone="bg-accent text-accent-foreground" />
            </div>

            <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold text-primary">Attendance Register</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span data-testid="att-audit-date" className="text-muted-foreground">Audit Date: <b className="text-foreground">{auditDate}</b></span>
                            <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label="Which records">
                                <Button data-testid="att-scope-day" role="tab" aria-selected={scope === 'day'} size="xs" variant={scope === 'day' ? 'default' : 'ghost'} onClick={() => onScope('day')}>THIS DAY</Button>
                                <Button data-testid="att-scope-all" role="tab" aria-selected={scope === 'all'} size="xs" variant={scope === 'all' ? 'default' : 'ghost'} onClick={() => onScope('all')}>ALL RECORDS</Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onExport('daily')}>📅 DAILY</Button>
                        <Button size="sm" variant="outline" onClick={() => onExport('monthly')}>📊 MONTHLY</Button>
                        <Button size="sm" variant="outline" onClick={() => onExport('yearly')}>📁 YEARLY</Button>
                        <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={onShare}>💬 SHARE</Button>
                        <Button size="sm" variant="outline" onClick={onEnroll} aria-label="+ ENROLL STAFF"><UserPlus />+ ENROLL STAFF</Button>
                        <Button size="sm" onClick={onManual} aria-label="+ MANUAL LOG"><Plus />+ MANUAL LOG</Button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Attendance register">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff</TableHead><TableHead>Department</TableHead><TableHead>Date</TableHead><TableHead>Scheduled shift</TableHead>
                                <TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Punctuality</TableHead><TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && (
                                <TableRow><TableCell colSpan={8} data-testid="att-empty" className="p-8 text-center text-muted-foreground">{scope === 'day' ? `No attendance recorded for ${selectedDay}.` : 'No attendance recorded yet. Use + MANUAL LOG or + ENROLL STAFF.'}</TableCell></TableRow>
                            )}
                            {logs.map(log => {
                                const info = all.find(s => s.name === log.staffName);
                                const inMin = toMinutes(log.checkIn);
                                const shiftMin = toMinutes(info?.shift);
                                // more than 10 minutes after the shift start = LATE
                                const late = inMin !== null && shiftMin !== null && inMin - shiftMin > 10;
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={log.staffName} photo={info?.photo} />
                                                <div>
                                                    <div className="font-semibold text-primary">{log.staffName}</div>
                                                    <div className="text-[11px] text-muted-foreground">{log.source === 'face-scan' ? `Face scan (terminal) · ${log.staffId}` : log.source === 'staff-web' ? `Self check-in (phone)${log.inFace?.check === 'pin' || log.outFace?.check === 'pin' ? ' · PIN' : ''}` : `Log #${String(log.id).padStart(3, '0')}`}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{deptOf(log.staffName).toUpperCase()}</Badge></TableCell>
                                        <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{info?.shift || 'Flexible'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <span className={cn('font-semibold', log.checkIn === '--' ? 'text-muted-foreground' : 'text-success')}>{log.checkIn}</span>
                                                {log.checkIn === '--' && !log.readOnly && <Button size="xs" onClick={() => onQuickIn(log.id)}>CHECK-IN</Button>}
                                                <AttendanceProof log={log} kind="in" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <span className={cn('font-semibold', log.checkOut === '--' ? 'text-muted-foreground' : 'text-warning')}>{log.checkOut}</span>
                                                {log.checkIn !== '--' && log.checkOut === '--' && !log.readOnly && <Button size="xs" variant="outline" onClick={() => onQuickOut(log.id)}>CHECK-OUT</Button>}
                                                <AttendanceProof log={log} kind="out" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.status === 'Present'
                                                ? <span className={cn('text-xs font-bold', log.checkIn === '--' ? 'text-muted-foreground' : late ? 'text-destructive' : 'text-success')}>{log.checkIn === '--' ? 'NOT IN' : late ? 'LATE' : 'ON TIME'}</span>
                                                : /leave/i.test(log.status || '') ? <span className="text-xs font-bold text-warning">PLANNED</span>
                                                    : <span className="text-muted-foreground">--</span>}
                                        </TableCell>
                                        <TableCell><Badge variant="outline" className={statusStyle(log.status)}>{String(log.status || '').toUpperCase()}</Badge></TableCell>
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
