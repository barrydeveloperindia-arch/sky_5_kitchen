import { useState } from 'react';
import { DoorOpen, Printer, Plus, MessageCircle, Pencil, ChevronDown, LogOut } from 'lucide-react';
import { roomFolio, parseStayDate } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Room checkout: inspect an occupied room (items returned / damage) and the inspection log
export default function CheckoutBoard({ rooms, checklist, logs, onPrintBlank, onStartCheckout, onEditLog, onPrintSlip, onShareLog }) {
    const occupied = rooms.filter(r => r.status === 'Occupied');
    const [showList, setShowList] = useState(false);
    const now = new Date();

    return (
        <div className="ui space-y-6" data-testid="checkout-board">
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><DoorOpen className="size-5" />Room Checkout Control</h2>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onPrintBlank}><Printer />PRINT BLANK CHECKOUT COUPONS (A4)</Button>
                        <Button onClick={() => onStartCheckout({ id: '' })}><Plus />RECORD NEW INSPECTION</Button>
                    </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Select room to record checkout checklist ({occupied.length} with guests)</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(230px,100%),1fr))] gap-3">
                    {occupied.map(room => {
                        const f = room.guest ? roomFolio(room) : null;
                        const dueToday = sameDay(parseStayDate(room.guest?.checkOut), now);
                        return (
                            <div key={room.id} data-testid={`checkout-room-${room.id}`} className="relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 pl-5 shadow-xs">
                                <span className={cn('absolute inset-y-0 left-0 w-1', dueToday ? 'bg-warning' : 'bg-primary')} aria-hidden />
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-primary">Room {room.id}</span>
                                    {dueToday
                                        ? <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">DUE TODAY</Badge>
                                        : <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">GUEST STAYING</Badge>}
                                </div>
                                <p className="truncate text-sm">{room.guest?.name || 'Guest'}</p>
                                {f && (
                                    <p className={cn('text-xs font-medium', f.refund > 0 ? 'text-warning' : f.due > 0 ? 'text-destructive' : 'text-success')}>
                                        {f.refund > 0 ? `Refund ${inr(f.refund)}` : f.due > 0 ? `Due ${inr(f.due)}` : 'Fully paid'}
                                    </p>
                                )}
                                <Button size="sm" onClick={() => onStartCheckout(room)}><LogOut />INSPECT & CHECKOUT</Button>
                            </div>
                        );
                    })}
                    {occupied.length === 0 && (
                        <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No guest is staying right now, so there is nothing to check out.</p>
                    )}
                </div>
            </section>

            <section className="rounded-xl border bg-card shadow-xs">
                <button type="button" className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-primary"
                    aria-expanded={showList} onClick={() => setShowList(v => !v)}>
                    <span>📋 REQUIRED ROOM CHECKOUT CHECKS · {checklist.length}</span>
                    <ChevronDown className={cn('size-4 transition-transform', showList && 'rotate-180')} aria-hidden />
                </button>
                {showList && (
                    <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(170px,100%),1fr))] gap-2 border-t px-4 py-3 text-sm">
                        {checklist.map((item, i) => (
                            <li key={item} className="rounded-md bg-muted px-3 py-2"><span className="font-semibold text-muted-foreground">{i + 1}.</span> {item}</li>
                        ))}
                    </ol>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-primary">Checkout Audit Inspection Logs <span className="text-sm font-normal text-muted-foreground">({logs.length})</span></h2>
                <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Checkout inspection logs">
                    {logs.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No checkout inspections recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room #</TableHead>
                                    <TableHead>Room type</TableHead>
                                    <TableHead>Checkout time</TableHead>
                                    <TableHead>Staff name</TableHead>
                                    <TableHead>Checklist</TableHead>
                                    <TableHead>Damages</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => {
                                    const items = Object.entries(log.checkedItems || {});
                                    const standard = items.filter(([item]) => item !== 'Any Item Damaged');
                                    const returned = standard.filter(([, v]) => v).length;
                                    const total = standard.length || 7;
                                    const damaged = !!log.checkedItems?.['Any Item Damaged'];
                                    const allBack = returned === total;
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-bold whitespace-nowrap text-primary">Room {log.roomNumber}</TableCell>
                                            <TableCell>{log.roomType}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">{log.date}</TableCell>
                                            <TableCell className="font-medium">{log.staffName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={allBack ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'}>
                                                    {returned}/{total} Items
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={damaged ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-success/30 bg-success/10 text-success'}>
                                                    {damaged ? '⚠️ DAMAGED' : '✅ ALL CLEAR'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] whitespace-normal text-muted-foreground italic">{log.remarks || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1.5">
                                                    <Button size="sm" variant="outline" onClick={() => onEditLog(log)}><Pencil />EDIT</Button>
                                                    <Button size="sm" variant="outline" onClick={() => onPrintSlip(log)}><Printer />PRINT</Button>
                                                    <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => onShareLog(log)}><MessageCircle />WHATSAPP</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </section>
        </div>
    );
}
