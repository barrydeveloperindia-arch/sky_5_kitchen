import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Coffee } from 'lucide-react';
import { shiftSegments, onShiftAt } from '@/lib/staff';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const DEPTS = [
    ['reception', 'Front desk', 'bg-warning'],
    ['kitchen', 'Kitchen', 'bg-primary'],
    ['housekeeping', 'Housekeeping', 'bg-success'],
];
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const hourLabel = (h) => (h === 0 || h === 24 ? '12AM' : h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`);
const minuteNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// 24-hour coverage drawn from each person's saved shift text (never hard-coded positions)
export default function ShiftTimeline({ registry, onShare }) {
    const [now, setNow] = useState(minuteNow);
    useEffect(() => { const t = setInterval(() => setNow(minuteNow()), 60000); return () => clearInterval(t); }, []);
    const people = DEPTS.flatMap(([key, dept, color]) => (registry[key] || []).map(p => ({ ...p, dept, color })));
    const onNow = people.filter(p => onShiftAt(p.shift, now)).length;

    return (
        <section className="ui space-y-5 rounded-xl border bg-card p-5 shadow-xs" data-testid="shift-timeline">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><Clock className="size-5" />Daily Coverage Timeline (24h)</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" data-testid="shift-on-now" className="border-success/30 bg-success/10 text-success">{onNow} on shift now</Badge>
                    <Button className="bg-success text-white hover:bg-success/90" onClick={onShare}><MessageCircle />SHARE ON WHATSAPP</Button>
                </div>
            </div>

            {registry.dailySchedule?.length > 0 && (
                <div className="rounded-lg border bg-muted/40 p-3">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase"><Coffee className="size-4" />Official staff break schedule</h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-2">
                        {registry.dailySchedule.map((s, i) => (
                            <div key={i} className="rounded-md border bg-card px-3 py-2 text-center">
                                <div className="text-xs text-muted-foreground">{s.event}</div>
                                <div className="text-sm font-semibold text-primary">{s.time}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* what the colours mean (always shown next to the bars) */}
            <ul data-testid="shift-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {DEPTS.map(([key, dept, color]) => (
                    <li key={key} className="flex items-center gap-1.5"><span aria-hidden className={cn('inline-block h-2.5 w-5 rounded-sm', color)} />{dept}</li>
                ))}
                <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-5 rounded-sm bg-primary opacity-60" />Faded = not on shift now</li>
                <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-0.5 bg-destructive" />Now</li>
                <li className="flex items-center gap-1.5"><span className="font-medium text-success">Green name</span> = on shift now</li>
            </ul>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Shift timeline">
                <div className="min-w-[640px]">
                    <div className="relative ml-36 mb-2 h-4 text-[11px] text-muted-foreground">
                        {HOURS.map(h => (
                            // first and last labels sit inside the line, so "12AM" is never cut at the edge
                            <span key={h} className={cn('absolute', h === 0 ? '' : h === 24 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${(h / 24) * 100}%` }}>{hourLabel(h)}</span>
                        ))}
                    </div>
                    <div className="relative space-y-2">
                        <div className="pointer-events-none absolute inset-y-0 right-0 left-36" aria-hidden>
                            <div className="absolute inset-y-0 w-0.5 bg-destructive" style={{ left: `${(now / 1440) * 100}%` }} data-testid="shift-now-line" />
                        </div>
                        {people.map(p => {
                            const segs = shiftSegments(p.shift);
                            const active = onShiftAt(p.shift, now);
                            return (
                                <div key={`${p.dept}-${p.name}`} className="flex items-center gap-2" data-testid={`shift-row-${p.name}`}>
                                    <div className="w-34 shrink-0 truncate text-sm">
                                        <span className={cn('font-medium', active && 'text-success')}>{p.name}</span>
                                        <div className="text-[11px] text-muted-foreground">{p.dept}</div>
                                    </div>
                                    <div className="relative h-6 flex-1 rounded-md bg-muted" title={p.shift || 'No shift time'}>
                                        {segs.map((s, i) => (
                                            <div key={i} data-testid="shift-bar" className={cn('absolute inset-y-0 rounded-md', p.color, !active && 'opacity-60')}
                                                style={{ left: `${s.left}%`, width: `${s.width}%` }} />
                                        ))}
                                        {segs.length === 0 && (
                                            <span className="absolute inset-0 flex items-center px-2 text-[11px] text-muted-foreground italic">
                                                {p.shift ? `${p.shift} (shift time not set)` : 'Shift time not set'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
