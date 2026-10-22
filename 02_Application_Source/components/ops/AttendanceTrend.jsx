import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

// Daily attendance trend (like the AuraLock dashboard): Present vs Late, last 15 days.
// Present = solid green line + round markers; Late = dashed amber line + square markers (the two colours are close
// for some colour-blind readers, so line style, marker shape and the direct labels carry the difference too).
const PRESENT = '#047857', LATE = '#b45309';
const W = 720, H = 230, L = 34, R = 92, T = 16, B = 30;

export default function AttendanceTrend({ data, staffCount }) {
    const [hover, setHover] = useState(null);
    const top = Math.max(4, staffCount || 0, ...data.map(d => d.present));
    const step = top <= 8 ? 2 : top <= 20 ? 5 : 10;
    const yMax = Math.ceil(top / step) * step;
    const x = (i) => L + (i * (W - L - R)) / Math.max(1, data.length - 1);
    const y = (v) => T + (H - T - B) * (1 - v / yMax);
    const path = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
    const last = data[data.length - 1] || { present: 0, late: 0 };
    const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
    const h = hover != null ? data[hover] : null;

    return (
        <section className="rounded-xl border bg-card p-4 shadow-xs" data-testid="att-trend" aria-labelledby="att-trend-title">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 id="att-trend-title" className="flex items-center gap-2 text-base font-semibold text-primary"><TrendingUp className="size-4" />Daily attendance trend</h3>
                    <p className="text-xs text-muted-foreground">Present vs Late · last {data.length} days · each person once a day</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
                    <span className="flex items-center gap-1.5"><svg width="22" height="10"><line x1="1" y1="5" x2="21" y2="5" stroke={PRESENT} strokeWidth="2" /><circle cx="11" cy="5" r="3.5" fill={PRESENT} /></svg>Present</span>
                    <span className="flex items-center gap-1.5"><svg width="22" height="10"><line x1="1" y1="5" x2="21" y2="5" stroke={LATE} strokeWidth="2" strokeDasharray="4 3" /><rect x="7.5" y="1.5" width="7" height="7" rx="1" fill={LATE} /></svg>Late</span>
                </div>
            </div>
            <div className="relative" onMouseLeave={() => setHover(null)}>
                <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Attendance trend: today ${last.present} present, ${last.late} late`}>
                    {ticks.map(t => (
                        <g key={t}>
                            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth="1" />
                            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{t}</text>
                        </g>
                    ))}
                    {data.map((d, i) => (i % 2 === (data.length - 1) % 2) && (
                        <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">{d.label}</text>
                    ))}
                    {h && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="currentColor" className="text-muted-foreground" strokeWidth="1" strokeDasharray="3 3" />}
                    <path d={path('present')} fill="none" stroke={PRESENT} strokeWidth="2" strokeLinejoin="round" />
                    <path d={path('late')} fill="none" stroke={LATE} strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" />
                    {data.map((d, i) => (
                        <g key={d.key}>
                            <circle cx={x(i)} cy={y(d.present)} r={hover === i ? 5 : 4} fill={PRESENT} stroke="white" strokeWidth="2" />
                            <rect x={x(i) - 4} y={y(d.late) - 4} width="8" height="8" rx="1.5" fill={LATE} stroke="white" strokeWidth="2" />
                        </g>
                    ))}
                    {/* direct labels at the end of each line */}
                    <text x={x(data.length - 1) + 10} y={y(last.present) + 4} className="fill-foreground text-[12px] font-semibold">Present {last.present}</text>
                    <text x={x(data.length - 1) + 10} y={y(last.late) + (Math.abs(y(last.late) - y(last.present)) < 14 ? 18 : 4)} className="fill-foreground text-[12px] font-semibold">Late {last.late}</text>
                    {/* hover targets: a whole column per day (bigger than the marks) */}
                    {data.map((d, i) => (
                        <rect key={`hit-${d.key}`} data-testid={`att-trend-day-${d.key}`} x={x(i) - (W - L - R) / Math.max(1, data.length - 1) / 2} y={T} width={(W - L - R) / Math.max(1, data.length - 1)} height={H - T - B}
                            fill="transparent" onMouseEnter={() => setHover(i)} />
                    ))}
                </svg>
                {h && (
                    <div data-testid="att-trend-tip" role="status" className="pointer-events-none absolute top-0 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
                        style={{ left: `${Math.min(78, Math.max(2, (x(hover) / W) * 100 - 8))}%` }}>
                        <div className="mb-1 font-semibold text-foreground">{h.label}</div>
                        <div className="flex items-center gap-1.5 text-foreground"><span className="inline-block size-2.5 rounded-full" style={{ background: PRESENT }} />Present <b className="ml-auto pl-3">{h.present}</b></div>
                        <div className="flex items-center gap-1.5 text-foreground"><span className="inline-block size-2.5 rounded-[2px]" style={{ background: LATE }} />Late <b className="ml-auto pl-3">{h.late}</b></div>
                    </div>
                )}
            </div>
            {/* the same numbers as a table (screen readers / no colours) */}
            <table className="sr-only">
                <caption>Daily attendance, last {data.length} days</caption>
                <thead><tr><th>Day</th><th>Present</th><th>Late</th></tr></thead>
                <tbody>{data.map(d => <tr key={d.key}><td>{d.label}</td><td>{d.present}</td><td>{d.late}</td></tr>)}</tbody>
            </table>
        </section>
    );
}
