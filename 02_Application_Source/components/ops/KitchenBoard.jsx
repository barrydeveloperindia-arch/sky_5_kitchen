import { useState } from 'react';
import { ChefHat, Flame, CheckCircle2, Clock, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Kitchen order queue: Pending -> Preparing (PREPARE) -> Completed (SERVE)
const STATUS = {
    Pending: { label: 'Pending', badge: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
    Preparing: { label: 'Preparing', badge: 'bg-primary/10 text-primary border-primary/30', icon: Flame },
    Completed: { label: 'Completed', badge: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
};
const styleOf = (s) => STATUS[s] || { label: s || 'Unknown', badge: 'bg-muted text-muted-foreground border-border', icon: Clock };
const FILTERS = [['All', 'All orders'], ['Pending', 'Pending'], ['Preparing', 'Preparing'], ['Completed', 'Served']];

export default function KitchenBoard({ orders, onSetStatus }) {
    const [filter, setFilter] = useState('All');
    const count = (k) => (k === 'All' ? orders.length : orders.filter(o => o.status === k).length);
    const shown = filter === 'All' ? orders : orders.filter(o => o.status === filter);

    return (
        <section className="ui space-y-4" data-testid="kitchen-board">
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Order status">
                {FILTERS.map(([k, label]) => (
                    <Button key={k} type="button" role="tab" aria-selected={filter === k} data-testid={`kitchen-filter-${k.toLowerCase()}`}
                        variant={filter === k ? 'default' : 'outline'} size="sm" onClick={() => setFilter(k)}>
                        {label}<span className="ml-1 text-xs">{count(k)}</span>
                    </Button>
                ))}
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                {shown.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground" data-testid="kitchen-empty">
                        <UtensilsCrossed className="size-8" aria-hidden />
                        {orders.length === 0 ? 'No orders yet. New shop orders appear here live.' : 'No orders with this status.'}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Table / Room</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shown.map(order => {
                                const st = styleOf(order.status);
                                const Icon = st.icon;
                                return (
                                    <TableRow key={order.id} data-testid={`kitchen-order-${order.id}`}
                                        className={cn(order.status === 'Completed' && 'text-muted-foreground')}>
                                        <TableCell className="font-mono text-xs font-semibold">{order.id}</TableCell>
                                        <TableCell className="font-semibold text-primary">{order.table || 'N/A'}</TableCell>
                                        <TableCell className="max-w-[320px] whitespace-normal">{order.items}</TableCell>
                                        <TableCell className="whitespace-nowrap">{order.time}</TableCell>
                                        <TableCell className="whitespace-nowrap">{order.paymentMethod || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={st.badge}><Icon aria-hidden />{st.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {order.status === 'Pending' && (
                                                <Button size="sm" onClick={() => onSetStatus(order.id, 'Preparing')}><ChefHat />PREPARE</Button>
                                            )}
                                            {order.status === 'Preparing' && (
                                                <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => onSetStatus(order.id, 'Completed')}><CheckCircle2 />SERVE</Button>
                                            )}
                                            {order.status === 'Completed' && <span className="font-semibold text-success">✓ DELIVERED</span>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </section>
    );
}
