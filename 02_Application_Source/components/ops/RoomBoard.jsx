import { useMemo, useState } from 'react';
import { BedDouble, Search, User, Phone, MapPin, Clock, Printer, LogOut, Sparkles, LogIn, Pencil, ChevronRight } from 'lucide-react';
import { roomFolio, parseStayDate } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
// "26 Sep 2026, 12:00 pm" from any stored stay date
const when = (v) => { const d = parseStayDate(v); return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (v || ''); };

const STATUS_STYLE = {
    Clean: { label: 'CLEAN', badge: 'bg-success/10 text-success border-success/20', stripe: 'bg-success' },
    Occupied: { label: 'OCCUPIED', badge: 'bg-primary/10 text-primary border-primary/20', stripe: 'bg-primary' },
    Dirty: { label: 'DIRTY', badge: 'bg-destructive/10 text-destructive border-destructive/20', stripe: 'bg-destructive' },
};
// Any other / missing status is shown as it is (neutral), never disguised as a green CLEAN room
const styleOf = (status) => STATUS_STYLE[status] || { label: String(status || 'UNKNOWN').toUpperCase(), badge: 'bg-muted text-muted-foreground border-border', stripe: 'bg-muted-foreground' };
const FILTERS = [['All', 'All rooms'], ['Clean', 'Available'], ['Occupied', 'Occupied'], ['Dirty', 'To clean']];
const TYPES = ['Super Deluxe Room', 'Deluxe Room', 'Standard Room'];

function RoomActions({ room, onCheckIn, onPrintReceipt, onCheckout, onMarkCleaned, size = 'sm' }) {
    if (room.status === 'Clean') {
        return <Button size={size} onClick={() => onCheckIn(room)}><LogIn />CHECK-IN</Button>;
    }
    if (room.status === 'Dirty' || !STATUS_STYLE[room.status]) {
        return <Button size={size} variant="outline" className="border-gold text-accent-foreground hover:bg-accent" onClick={() => onMarkCleaned(room.id)}><Sparkles />MARK CLEANED</Button>;
    }
    if (!room.guest) {
        // marked Occupied but the guest details were never saved
        return <Button size={size} onClick={() => onCheckIn(room)}><Pencil />ADD GUEST DETAILS</Button>;
    }
    return (
        <>
            <Button size={size} variant="outline" onClick={() => onCheckIn(room)}><Pencil />EDIT GUEST</Button>
            <Button size={size} variant="outline" onClick={() => onPrintReceipt(room)}><Printer />PRINT RECEIPT</Button>
            <Button size={size} onClick={() => onCheckout(room)}><LogOut />CHECK-OUT</Button>
        </>
    );
}

function FolioLines({ room, f }) {
    const row = (label, value, cls) => (
        <div className={cn('flex justify-between', cls)}><span>{label}</span> <b>{value}</b></div>
    );
    return (
        <div className="space-y-1 text-sm">
            {row(`Room Rate${f.nights > 1 ? ` × ${f.nights} nights` : ''}:`, inr(f.roomTotal))}
            {row('Food Bill:', inr(f.foodTotal))}
            {row('GST:', inr(f.gst))}
            {row(`Advance${room.guest?.advanceType ? ` (${room.guest.advanceType})` : ''}:`, `- ${inr(f.advance)}`, 'text-success')}
            <Separator className="my-1" />
            {f.refund > 0
                ? row('Refund due to guest:', inr(f.refund), 'text-warning')
                : row('Balance due:', inr(f.due), f.due > 0 ? 'text-destructive' : 'text-success')}
        </div>
    );
}

export default function RoomBoard({ rooms, onCheckIn, onPrintReceipt, onCheckout, onMarkCleaned, initialFilter = 'All' }) {
    const [filter, setFilter] = useState(initialFilter);
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState(null);
    const actions = { onCheckIn, onPrintReceipt, onCheckout, onMarkCleaned };

    const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, k === 'All' ? rooms.length : rooms.filter(r => r.status === k).length])), [rooms]);
    const term = q.trim().toLowerCase();
    const shown = rooms.filter(r => (filter === 'All' || r.status === filter)
        && (!term || String(r.id) === term || `room ${r.id}`.includes(term) || String(r.guest?.name ?? '').toLowerCase().includes(term) || String(r.guest?.phone ?? '').includes(term)));
    const open = rooms.find(r => r.id === openId);
    const inHouse = (r) => r?.status === 'Occupied' && !!r.guest;
    const openFolio = inHouse(open) ? roomFolio(open) : null;

    return (
        <section className="ui space-y-5" data-testid="room-board">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                    {FILTERS.map(([k, label]) => (
                        <button key={k} type="button" data-testid={`room-filter-${k.toLowerCase()}`} onClick={() => setFilter(k)}
                            className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', filter === k ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                            {label} <span className="ml-1 text-xs">{counts[k]}</span>
                        </button>
                    ))}
                </div>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input data-testid="room-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Room no., guest or phone" className="pl-8" />
                </div>
            </div>

            {shown.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No rooms match.</p>}

            {TYPES.map(type => {
                const list = shown.filter(r => r.type === type);
                if (!list.length) return null;
                return (
                    <div key={type}>
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            <BedDouble className="size-4" />{type}s <span className="font-normal">({list.length})</span>
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] items-start gap-3">
                            {list.map(room => {
                                const st = styleOf(room.status);
                                const f = inHouse(room) ? roomFolio(room) : null;
                                return (
                                    <div key={room.id} data-testid={`room-card-${room.id}`}
                                        className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md">
                                        <span className={cn('absolute inset-y-0 left-0 w-1', st.stripe)} aria-hidden />
                                        <button type="button" onClick={() => setOpenId(room.id)} data-testid={`room-open-${room.id}`}
                                            className="flex flex-1 flex-col gap-2 p-4 pl-5 text-left" aria-label={`Room ${room.id} details`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="text-lg font-bold text-primary">Room {room.id}</h3>
                                                    <p className="text-xs text-muted-foreground">{room.description}</p>
                                                </div>
                                                <Badge variant="outline" className={st.badge}>{st.label}</Badge>
                                            </div>
                                            {room.status === 'Occupied' && room.guest ? (
                                                <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
                                                    <div className="flex items-center gap-2 font-semibold"><User className="size-3.5" />{room.guest.name}</div>
                                                    {room.guest.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" />{room.guest.phone}</div>}
                                                    {room.guest.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-3.5" />{room.guest.address}</div>}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" />In: {when(room.guest.checkIn)}</div>
                                                    <FolioLines room={room} f={f} />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">{(room.amenities || []).join(' · ')} · {inr(room.price)}/night</p>
                                            )}
                                            <span className="mt-auto flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary">Details <ChevronRight className="size-3" /></span>
                                        </button>
                                        <div className="flex flex-wrap gap-1.5 border-t bg-muted/30 p-3 pl-5">
                                            <RoomActions room={room} {...actions} size="xs" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <Sheet open={!!open} onOpenChange={o => { if (!o) setOpenId(null); }}>
                <SheetContent className="ui w-full sm:max-w-md" data-testid="room-sheet">
                    {open && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2 text-xl text-primary">
                                    Room {open.id}
                                    <Badge variant="outline" className={styleOf(open.status).badge}>{styleOf(open.status).label}</Badge>
                                </SheetTitle>
                                <SheetDescription>{open.type} · {open.description} · {(open.amenities || []).join(', ')}</SheetDescription>
                            </SheetHeader>
                            <div className="space-y-4 overflow-y-auto px-4">
                                {openFolio ? (
                                    <>
                                        <div className="space-y-1.5 rounded-lg border p-3 text-sm">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase">Guest</div>
                                            <div className="text-base font-semibold">{open.guest.name}</div>
                                            {open.guest.phone && <div className="text-muted-foreground">{open.guest.phone}</div>}
                                            {open.guest.address && <div className="text-muted-foreground">{open.guest.address}</div>}
                                            <div className="text-muted-foreground">Check-in: {when(open.guest.checkIn)}{open.guest.checkOut ? ` · Check-out: ${when(open.guest.checkOut)}` : ''}</div>
                                            {(open.guest.adults || open.guest.children) ? <div className="text-muted-foreground">{open.guest.adults || 1} adult(s), {open.guest.children || 0} child(ren)</div> : null}
                                        </div>
                                        <div className="rounded-lg border p-3">
                                            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{open.guest.checkOut ? 'Estimated bill (till planned check-out)' : 'Bill so far'} · {openFolio.nights} night{openFolio.nights > 1 ? 's' : ''}</div>
                                            <FolioLines room={open} f={openFolio} />
                                            <div className="mt-2 text-xs text-muted-foreground">Grand total incl. GST: {inr(openFolio.grandTotal)}</div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        {open.status === 'Dirty' ? 'Guest has left. Clean the room to make it available.'
                                            : open.status === 'Occupied' ? 'Marked occupied, but no guest details are saved. Add the guest details.'
                                            : open.status === 'Clean' ? `Available · ${inr(open.price)} per night.`
                                            : `Status "${open.status || 'unknown'}" is not a normal room status. Mark it cleaned to make it available.`}
                                    </p>
                                )}
                            </div>
                            <div className="mt-auto flex flex-wrap gap-2 border-t p-4" data-testid="room-sheet-actions">
                                <RoomActions room={open} {...actions} size="default"
                                    onCheckIn={r => { setOpenId(null); onCheckIn(r); }}
                                    onCheckout={r => { setOpenId(null); onCheckout(r); }} />
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </section>
    );
}
