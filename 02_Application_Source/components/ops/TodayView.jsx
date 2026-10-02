import { BedDouble, DoorOpen, Sparkles, IndianRupee, Wallet, ChefHat, Users, Package, ArrowRight } from 'lucide-react';
import { roomFolio, parseStayDate } from '@/lib/billing';
import { computeStock } from '@/lib/inventory';
import { inventoryItems } from '@/data/inventory';
import { useInventoryStore } from '@/lib/inventoryStore';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function Kpi({ id, icon, label, value, caption, tone = 'primary', onClick }) {
    const Icon = icon;
    const tones = {
        primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning',
        danger: 'bg-destructive/10 text-destructive', gold: 'bg-accent text-accent-foreground',
    };
    return (
        <Card data-testid={`today-kpi-${id}`} onClick={onClick}
            className={cn('gap-2 py-4', onClick && 'cursor-pointer transition-shadow hover:shadow-md')}>
            <CardContent className="flex items-start gap-3 px-4">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tones[tone])}><Icon className="size-5" /></span>
                <div className="min-w-0">
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
                    <div className="text-2xl font-bold text-foreground" data-testid={`today-kpi-${id}-value`}>{value}</div>
                    {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

function ListCard({ id, title, description, empty, children, action }) {
    return (
        <Card data-testid={`today-${id}`} className="gap-3">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                {action}
            </CardHeader>
            <CardContent className="space-y-2">
                {children && children.length ? children : <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>}
            </CardContent>
        </Card>
    );
}

export default function TodayView({ rooms, orders, settlements, attendanceLogs, todayKey, onGo }) {
    const now = new Date();
    const inv = useInventoryStore();
    const occupied = rooms.filter(r => r.status === 'Occupied' && r.guest);
    const clean = rooms.filter(r => r.status === 'Clean');
    const dirty = rooms.filter(r => r.status === 'Dirty');
    const occPct = rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0;
    const folios = occupied.map(r => ({ r, f: roomFolio(r) }));
    const due = folios.reduce((a, { f }) => a + Math.max(0, f.balance), 0);
    const todayLabel = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const collectedToday = settlements.filter(s => (s.settledAt ? sameDay(new Date(s.settledAt), now) : String(s.date || '').startsWith(todayLabel))).reduce((a, s) => a + (s.collected || 0), 0);
    const kitchenOpen = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');
    const present = attendanceLogs.filter(l => l.date === todayKey && l.status === 'Present');
    const checkoutsToday = folios.filter(({ r }) => sameDay(parseStayDate(r.guest.checkOut), now));
    const stock = inv.status === 'ready' ? computeStock(inventoryItems, inv.data.transactions, inv.data.minLevels, inv.data.conditions) : null;
    const stockAlerts = stock ? stock.filter(r => ['CHECK COUNT', 'REORDER', 'OUT OF STOCK', 'EXPIRED', 'REFILL'].includes(r.status)).length : null;

    return (
        <div className="ui space-y-6" data-testid="today-view">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi id="occupancy" icon={BedDouble} label="Occupancy" value={`${occPct}%`} caption={`${occupied.length} of ${rooms.length} rooms`} onClick={() => onGo('Reception', 'Occupied')} />
                <Kpi id="available" icon={DoorOpen} label="Ready to sell" value={clean.length} caption="Clean & free rooms" tone="success" onClick={() => onGo('Reception', 'Clean')} />
                <Kpi id="dirty" icon={Sparkles} label="To clean" value={dirty.length} caption="Checked out, not cleaned" tone={dirty.length ? 'danger' : 'success'} onClick={() => onGo('Reception', 'Dirty')} />
                <Kpi id="due" icon={Wallet} label="Balance due" value={inr(due)} caption="In-house guests, incl. GST" tone="warning" />
                <Kpi id="collected" icon={IndianRupee} label="Collected today" value={inr(collectedToday)} caption="Settled at checkout" tone="success" onClick={() => onGo('Finance')} />
                <Kpi id="kitchen" icon={ChefHat} label="Kitchen queue" value={kitchenOpen.length} caption="Pending + preparing orders" tone={kitchenOpen.length ? 'gold' : 'primary'} onClick={() => onGo('Kitchen')} />
                <Kpi id="staff" icon={Users} label="Staff present" value={present.length} caption={`Marked on ${todayKey}`} onClick={() => onGo('Attendance')} />
                <Kpi id="stock" icon={Package} label="Stock alerts" value={stockAlerts ?? '…'} caption="Reorder / expired / refill" tone={stockAlerts ? 'danger' : 'success'} onClick={() => onGo('Inventory')} />
            </div>

            <Card className="gap-3 py-4">
                <CardContent className="space-y-2 px-4">
                    <div className="flex justify-between text-sm"><span className="font-medium">Room status</span><span className="text-muted-foreground">{occupied.length} occupied · {clean.length} ready · {dirty.length} to clean</span></div>
                    <Progress value={occPct} aria-label="Occupancy" />
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <ListCard id="checkouts" title="Check-outs due today" description="Guests whose check-out date is today" empty="No check-outs due today."
                    action={<Button size="sm" variant="outline" onClick={() => onGo('Reception', 'Occupied')}>Reception <ArrowRight /></Button>}>
                    {checkoutsToday.map(({ r, f }) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                            <span><b>Room {r.id}</b> · {r.guest.name}</span>
                            <Badge variant="outline" className={f.balance > 0 ? 'text-destructive' : 'text-success'}>{f.balance > 0 ? `${inr(f.balance)} due` : 'Paid'}</Badge>
                        </div>
                    ))}
                </ListCard>

                <ListCard id="inhouse" title="In-house guests" description="Nights so far and balance" empty="No guests checked in.">
                    {folios.map(({ r, f }) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                            <span><b>Room {r.id}</b> · {r.guest.name} <span className="text-muted-foreground">· {f.nights} night{f.nights > 1 ? 's' : ''}</span></span>
                            <span className={cn('font-semibold', f.balance > 0 ? 'text-destructive' : 'text-success')}>{inr(f.balance)}</span>
                        </div>
                    ))}
                </ListCard>

                <ListCard id="toclean" title="Rooms to clean" description="Checked out, waiting for housekeeping" empty="All rooms are clean."
                    action={<Button size="sm" variant="outline" onClick={() => onGo('Cleaning')}>Cleaning <ArrowRight /></Button>}>
                    {dirty.map(r => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                            <span><b>Room {r.id}</b> · {r.type}</span>
                            <Badge variant="outline" className="text-destructive">DIRTY</Badge>
                        </div>
                    ))}
                </ListCard>

                <ListCard id="kitchenq" title="Kitchen queue" description="Orders not yet served" empty="Nothing pending in the kitchen."
                    action={<Button size="sm" variant="outline" onClick={() => onGo('Kitchen')}>Kitchen <ArrowRight /></Button>}>
                    {kitchenOpen.map(o => (
                        <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                            <span className="min-w-0 truncate"><b>{o.table}</b> · {o.items}</span>
                            <Badge variant="outline" className={o.status === 'Pending' ? 'text-warning' : 'text-primary'}>{o.status}</Badge>
                        </div>
                    ))}
                </ListCard>
            </div>
        </div>
    );
}
