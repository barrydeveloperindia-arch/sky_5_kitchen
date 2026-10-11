import { IndianRupee, BedDouble, UtensilsCrossed, Wallet, CheckCircle2, Receipt, PieChart } from 'lucide-react';
import { roomFolio } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const sum = (list, fn) => list.reduce((a, x) => a + (Number(fn(x)) || 0), 0);

function Kpi({ icon, title, value, caption, tone = 'primary' }) {
    const Icon = icon;
    const tones = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', gold: 'bg-accent text-accent-foreground' };
    return (
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tones[tone])}><Icon className="size-5" /></span>
            <div className="min-w-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">{title}</h4>
                <div className="text-2xl font-bold text-primary">{value}</div>
                <p className="text-xs text-muted-foreground">{caption}</p>
            </div>
        </div>
    );
}

// Money overview: guests staying now (live folios) + bills settled at checkout
export default function FinanceBoard({ rooms, settlements }) {
    const inHouse = rooms.filter(r => r.status === 'Occupied' && r.guest).map(r => ({ r, f: roomFolio(r) }));
    const occPct = rooms.length ? Math.round((inHouse.length / rooms.length) * 100) : 0;
    const billed = sum(inHouse, x => x.f.grandTotal);
    const breakdown = [
        { label: 'Room stays', amount: sum(inHouse, x => x.f.roomTotal), color: 'bg-primary' },
        { label: 'Food on room bills', amount: sum(inHouse, x => x.f.foodTotal), color: 'bg-warning' },
        { label: 'GST payable', amount: sum(inHouse, x => x.f.gst), color: 'bg-success' },
    ];
    const collected = sum(settlements, s => s.collected);
    const refunded = sum(settlements, s => s.refund);

    return (
        <div className="ui space-y-6" data-testid="finance-board">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
                <Kpi icon={IndianRupee} title="Bill so far (guests staying)" value={inr(sum(inHouse, x => x.f.subtotal))} caption="Rooms + food, before GST" />
                <Kpi icon={BedDouble} title="Rooms filled" value={`${occPct}%`} caption={`${inHouse.length} of ${rooms.length} rooms have a guest`} tone="gold" />
                <Kpi icon={UtensilsCrossed} title="Food on room bills" value={inr(sum(inHouse, x => x.f.foodTotal))} caption="Room-charge orders, before GST" tone="warning" />
                <Kpi icon={Wallet} title="Pending Balances" value={inr(sum(inHouse, x => x.f.due))} caption="Still to collect from guests staying" tone="warning" />
            </div>

            <section data-testid="finance-settlements" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary"><CheckCircle2 className="size-5 text-success" />Settled at checkout</h3>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Collected: {inr(collected)}</Badge>
                        {refunded > 0 && <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">Refunded: {inr(refunded)}</Badge>}
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Settled bills">
                    {settlements.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No checkouts settled yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room</TableHead><TableHead>Guest</TableHead><TableHead className="text-right">Nights</TableHead>
                                    <TableHead className="text-right">Bill (incl. GST)</TableHead><TableHead className="text-right">Advance</TableHead>
                                    <TableHead className="text-right">Collected</TableHead><TableHead className="text-right">Refund</TableHead><TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settlements.map(x => (
                                    <TableRow key={x.id}>
                                        <TableCell className="font-bold text-primary">{x.roomId}</TableCell>
                                        <TableCell className="font-medium">{x.guest}</TableCell>
                                        <TableCell className="text-right">{x.nights}</TableCell>
                                        <TableCell className="text-right">{inr(x.total)}</TableCell>
                                        <TableCell className="text-right">{inr(x.advance)}</TableCell>
                                        <TableCell className="text-right font-semibold text-success">{inr(x.collected)}</TableCell>
                                        <TableCell className={cn('text-right', Number(x.refund) > 0 && 'font-semibold text-warning')}>{Number(x.refund) > 0 ? inr(x.refund) : '—'}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{x.date}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </section>

            <div className="ops-split-15-1 grid gap-4">
                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary"><Receipt className="size-5" />Guests staying now</h3>
                    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Guests staying now">
                        {inHouse.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No guest is staying right now.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room</TableHead><TableHead>Guest</TableHead>
                                        <TableHead className="text-right">Bill so far (before GST)</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inHouse.map(({ r, f }) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-bold text-primary">{r.id}</TableCell>
                                            <TableCell className="font-medium">{r.guest?.name}</TableCell>
                                            <TableCell className="text-right">{inr(f.subtotal)}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {Number(r.guest?.advance) > 0 ? `${r.guest?.advanceType || 'Cash'} advance ${inr(r.guest.advance)}` : 'No advance yet'}
                                            </TableCell>
                                            <TableCell className={cn('text-right font-semibold', f.refund > 0 ? 'text-warning' : f.due > 0 ? 'text-destructive' : 'text-success')}>
                                                {f.refund > 0 ? `Refund ${inr(f.refund)}` : f.due > 0 ? `Due ${inr(f.due)}` : 'Paid'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </section>

                <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary"><PieChart className="size-5" />Revenue Breakdown</h3>
                    <div className="space-y-3">
                        {breakdown.map(item => {
                            const pct = billed > 0 ? (item.amount / billed) * 100 : 0;
                            return (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex justify-between text-sm"><span>{item.label}</span><b>{inr(item.amount)}</b></div>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${item.label} ${Math.round(pct)}% of total billed`}>
                                        <div className={cn('h-full rounded-full', item.color)} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="border-t pt-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">Total billed (incl. GST)</div>
                        <div className="text-2xl font-bold text-primary" data-testid="finance-total-billed">{inr(billed)}</div>
                        <p className="text-xs text-muted-foreground">Guests staying now. Settled bills are listed above.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
