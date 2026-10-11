import { useState } from 'react';
import { Sparkles, Printer, ClipboardCheck, MessageCircle, Pencil, ChevronDown, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Housekeeping: rooms waiting for turnover (Dirty) + the cleaning audit log
export default function CleaningBoard({ rooms, checklist, logs, onPrintBlank, onStartCleaning, onEditLog, onPrintSlip, onShareLog }) {
    const dirty = rooms.filter(r => r.status === 'Dirty');
    const [showList, setShowList] = useState(false);

    return (
        <div className="ui space-y-6" data-testid="cleaning-board">
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
                        <Sparkles className="size-5" />Rooms awaiting turnover
                        <Badge variant="outline" className={dirty.length ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-success/30 bg-success/10 text-success'}>
                            {dirty.length} Pending
                        </Badge>
                    </h2>
                    <Button variant="outline" onClick={onPrintBlank}><Printer />PRINT BLANK CHECKLISTS (A4)</Button>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3">
                    {dirty.map(room => (
                        <div key={room.id} data-testid={`clean-card-${room.id}`} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 pl-5 shadow-xs">
                            <span className="absolute inset-y-0 left-0 w-1 bg-destructive" aria-hidden />
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-primary">Room {room.id}</h3>
                                    <p className="text-xs text-muted-foreground">{room.type}</p>
                                </div>
                                <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">NEEDS CLEANING</Badge>
                            </div>
                            <Button onClick={() => onStartCleaning(room)}><ClipboardCheck />RECORD CLEANING</Button>
                        </div>
                    ))}
                    {dirty.length === 0 && (
                        <div className="col-span-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-success/40 bg-success/5 p-8 text-sm font-semibold text-success">
                            <BedDouble className="size-5" aria-hidden />All rooms are currently clean. Excellent job!
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-xl border bg-card shadow-xs">
                <button type="button" className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-primary"
                    aria-expanded={showList} onClick={() => setShowList(v => !v)}>
                    <span>📋 OFFICIAL {checklist.length}-ITEM ROOM INSPECTION CHECKLIST</span>
                    <ChevronDown className={cn('size-4 transition-transform', showList && 'rotate-180')} aria-hidden />
                </button>
                {showList && (
                    <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-2 border-t px-4 py-3 text-sm">
                        {checklist.map((item, i) => (
                            <li key={item} className="rounded-md bg-muted px-3 py-2"><span className="font-semibold text-muted-foreground">{i + 1}.</span> {item}</li>
                        ))}
                    </ol>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-primary">Housekeeping Audit Logs <span className="text-sm font-normal text-muted-foreground">({logs.length})</span></h2>
                <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Housekeeping audit logs">
                    {logs.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No cleaning recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room #</TableHead>
                                    <TableHead>Room type</TableHead>
                                    <TableHead>Staff name</TableHead>
                                    <TableHead>In time</TableHead>
                                    <TableHead>Out time</TableHead>
                                    <TableHead>Missing items</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => {
                                    const ok = !log.missingItems || log.missingItems === 'None';
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-bold text-primary">{log.roomNumber}</TableCell>
                                            <TableCell>{log.roomType}</TableCell>
                                            <TableCell className="font-medium">{log.staffName}</TableCell>
                                            <TableCell className="text-muted-foreground">{log.inTime}</TableCell>
                                            <TableCell className="text-muted-foreground">{log.outTime}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={ok ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}>
                                                    {log.missingItems || 'None'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[260px] whitespace-normal text-muted-foreground italic">{log.remarks}</TableCell>
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
