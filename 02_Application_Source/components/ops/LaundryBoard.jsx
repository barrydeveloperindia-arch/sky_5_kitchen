import { useState } from 'react';
import { Shirt, Printer, Plus, MessageCircle, Pencil, ChevronDown, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Laundry: pick up from an occupied room, print coupons, and the collection log
export default function LaundryBoard({ rooms, items, logs, onPrintBlank, onStartPickup, onEditLog, onPrintSlip, onShareLog }) {
    const occupied = rooms.filter(r => r.status === 'Occupied');
    const [showItems, setShowItems] = useState(false);

    return (
        <div className="ui space-y-6" data-testid="laundry-board">
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><Shirt className="size-5" />Laundry Service Control</h2>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onPrintBlank}><Printer />PRINT BLANK LAUNDRY COUPONS (A4)</Button>
                        <Button onClick={() => onStartPickup({ id: '' })}><Plus />RECORD NEW LAUNDRY PICKUP</Button>
                    </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Select room to record pickup ({occupied.length} with guests)</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-3">
                    {occupied.map(room => (
                        <div key={room.id} data-testid={`laundry-room-${room.id}`} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 pl-5 shadow-xs">
                            <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-primary">Room {room.id}</span>
                                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">GUEST STAYING</Badge>
                            </div>
                            {room.guest?.name && <p className="truncate text-xs text-muted-foreground">{room.guest.name}</p>}
                            <Button size="sm" onClick={() => onStartPickup(room)}><PackagePlus />RECORD PICKUP</Button>
                        </div>
                    ))}
                    {occupied.length === 0 && (
                        <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No guest is staying right now. Use RECORD NEW LAUNDRY PICKUP for any other laundry.
                        </p>
                    )}
                </div>
            </section>

            <section className="rounded-xl border bg-card shadow-xs">
                <button type="button" className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-primary"
                    aria-expanded={showItems} onClick={() => setShowItems(v => !v)}>
                    <span>🧺 REGISTERED LAUNDRY ITEMS (COUPON FORM) · {items.length}</span>
                    <ChevronDown className={cn('size-4 transition-transform', showItems && 'rotate-180')} aria-hidden />
                </button>
                {showItems && (
                    <ul className="flex flex-wrap gap-2 border-t px-4 py-3 text-sm">
                        {items.map(item => <li key={item} className="rounded-md bg-muted px-3 py-1.5">{item}</li>)}
                    </ul>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-primary">Laundry Collection Logs <span className="text-sm font-normal text-muted-foreground">({logs.length})</span></h2>
                <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Laundry collection logs">
                    {logs.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No laundry recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room #</TableHead>
                                    <TableHead>Date & time</TableHead>
                                    <TableHead>Picked up by</TableHead>
                                    <TableHead>Supervisor</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => {
                                    const entries = Object.entries(log.items || {}).filter(([, q]) => Number(q) > 0);
                                    const total = entries.reduce((a, [, q]) => a + Number(q), 0);
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-bold whitespace-nowrap text-primary">Room {log.roomNumber}</TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">{log.date}</TableCell>
                                            <TableCell className="font-medium">{log.pickedUpBy}</TableCell>
                                            <TableCell className="font-medium">{log.supervisor}</TableCell>
                                            <TableCell className="max-w-[320px] whitespace-normal">
                                                <div className="flex flex-wrap gap-1">
                                                    {entries.map(([item, qty]) => (
                                                        <Badge key={item} variant="secondary" className="font-medium">{qty}x {item}</Badge>
                                                    ))}
                                                    {entries.length > 1 && <span className="text-xs text-muted-foreground">= {total} pcs</span>}
                                                </div>
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
