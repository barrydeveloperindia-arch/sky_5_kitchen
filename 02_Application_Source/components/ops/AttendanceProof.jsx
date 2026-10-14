import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Camera, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getServices, whenSignedIn } from '../../lib/firebase';
import { mapLink, hotelCheck, formatDistance } from '../../lib/staffAttendance';

// Selfie + location saved by the staff /attendance page, shown next to a check-in or check-out time.
// The photo is loaded only when someone opens it, so the register stays light.
export default function AttendanceProof({ log, kind }) {
    const photoId = kind === 'in' ? log.inPhotoId : log.outPhotoId;
    const loc = kind === 'in' ? log.inLoc : log.outLoc;
    const locError = kind === 'in' ? log.inLocError : log.outLocError;
    const [open, setOpen] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open || !photoId || photo) return;
        let alive = true;
        whenSignedIn()
            .then(() => getDoc(doc(getServices().db, 'hotel_attendance_photos', photoId)))
            .then(s => { if (alive) { if (s.exists()) setPhoto(s.data().data); else setFailed(true); } })
            .catch(() => alive && setFailed(true));
        return () => { alive = false; };
    }, [open, photoId, photo]);

    if (!photoId && !loc) return null;
    const place = hotelCheck(loc);
    const when = kind === 'in' ? log.checkIn : log.checkOut;
    return (
        <span className="inline-flex items-center gap-1">
            {photoId && (
                <button type="button" data-testid={`att-proof-${kind}-${log.id}`} onClick={() => setOpen(true)} aria-label={`${kind === 'in' ? 'Check-in' : 'Check-out'} selfie of ${log.staffName}`}
                    className="grid size-6 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-primary"><Camera className="size-3.5" /></button>
            )}
            {loc
                ? <a href={mapLink(loc)} target="_blank" rel="noreferrer" aria-label={`Location of ${log.staffName}`} title={`±${loc.acc} m`} className="grid size-6 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-primary"><MapPin className="size-3.5" /></a>
                : photoId && <span title={locError || 'No location'} className="text-[10px] font-semibold text-warning">NO GPS</span>}
            {place.at === false && <span data-testid={`att-outside-${kind}-${log.id}`} title={`${formatDistance(place.m)} from Hotel Sky 5`} className="rounded bg-red-50 px-1 text-[10px] font-bold text-red-700">OUTSIDE {formatDistance(place.m)}</span>}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="ui max-w-xs bg-white text-[#0a192f]">
                    <DialogHeader>
                        <DialogTitle>{log.staffName} · {kind === 'in' ? 'Check-in' : 'Check-out'} {when}</DialogTitle>
                        <DialogDescription>{log.date}{loc ? ` · location ±${loc.acc} m` : ` · ${locError || 'no location'}`}</DialogDescription>
                    </DialogHeader>
                    {photo ? <img src={photo} alt={`Selfie of ${log.staffName}`} className="w-full -scale-x-100 rounded-lg" />
                        : <p className="p-6 text-center text-sm text-muted-foreground">{failed ? 'Photo not found.' : 'Loading photo…'}</p>}
                    {loc && <a className="text-center text-sm font-semibold text-primary underline" href={mapLink(loc)} target="_blank" rel="noreferrer">Open location on map</a>}
                </DialogContent>
            </Dialog>
        </span>
    );
}
