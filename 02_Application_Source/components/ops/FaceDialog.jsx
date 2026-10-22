import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Camera, CheckCircle2, RotateCcw, ScanFace, SwitchCamera, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getServices, whenSignedIn } from '../../lib/firebase';
import { trackWrite } from '../../lib/syncedState';
import { MAX_PHOTO_CHARS } from '../../lib/staffAttendance';
import { distance, findFaces, faceQuality, saveStaffFace, resetFace, warmUpFaces } from '../../lib/faceMatch';

// Staff Directory -> Face (like re-registering a face in AuraLock): see whose face is registered for a person,
// take it again with the camera (e.g. someone else's face was registered by mistake), or reset it.
const PHOTOS = 'hotel_staff_photos';

// Camera frame -> 3:4 JPEG for the staff photo (fits the database limit)
function portrait(video, mirror) {
    const W = 300, H = 400;
    const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (mirror) { g.translate(W, 0); g.scale(-1, 1); }   // front camera: as the person saw themselves on the screen
    g.drawImage(video, (W - video.videoWidth * scale) / 2, (H - video.videoHeight * scale) / 2, video.videoWidth * scale, video.videoHeight * scale);
    for (const q of [0.8, 0.65, 0.5, 0.35]) { const url = c.toDataURL('image/jpeg', q); if (url.length <= MAX_PHOTO_CHARS) return url; }
    return null;
}

export default function FaceDialog({ staff, face, photoSrc, onClose, onPhotoSaved, onFaceChanged }) {
    const open = !!staff;
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            {open && <FaceBody key={staff.id} staff={staff} face={face} photoSrc={photoSrc} onClose={onClose} onPhotoSaved={onPhotoSaved} onFaceChanged={onFaceChanged} />}
        </Dialog>
    );
}

function FaceBody({ staff, face, photoSrc, onClose, onPhotoSaved, onFaceChanged }) {
    const [step, setStep] = useState('view');   // view | camera | checking | review
    const [error, setError] = useState('');
    const [shot, setShot] = useState(null);      // { photo, descriptor }
    const [selfie, setSelfie] = useState(null);   // first check-in selfie of the registered face
    // phone held by the manager and pointed at the person = back camera; the person facing the screen = front
    const [facing, setFacing] = useState('user');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // which picture the registered face came from: the staff photo, or the first check-in selfie
    const selfieId = face && face.source !== 'staff-photo' ? face.photoId : '';
    useEffect(() => {
        if (!selfieId) return undefined;
        let alive = true;
        whenSignedIn().then(() => getDoc(doc(getServices().db, 'hotel_attendance_photos', selfieId)))
            .then(s => { if (alive && s.exists()) setSelfie(s.data().data); }).catch(() => {});
        return () => { alive = false; };
    }, [selfieId]);
    const current = !face ? null : face.source === 'staff-photo' ? photoSrc : selfie;

    const stop = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
    useEffect(() => stop, []);
    useEffect(() => {
        if (step !== 'camera' || !videoRef.current || !streamRef.current || videoRef.current.srcObject === streamRef.current) return;
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
    }, [step, facing]);

    const openCamera = async (which = facing) => {
        setError(''); setShot(null);
        warmUpFaces().catch(() => {});
        stop();
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: which, width: { ideal: 640 } }, audio: false });
            setFacing(which);
            setStep('camera');
        } catch { setError('Camera permission is needed to take the face.'); }
    };
    const switchCamera = () => openCamera(facing === 'user' ? 'environment' : 'user');

    const scan = async () => {
        const v = videoRef.current;
        if (!v?.videoWidth) { setError('Camera is starting, try again in a second.'); return; }
        setStep('checking'); setError('');
        const frame = document.createElement('canvas');
        frame.width = v.videoWidth; frame.height = v.videoHeight;
        frame.getContext('2d').drawImage(v, 0, 0);
        const photo = portrait(v, facing === 'user');
        let faces;
        try { faces = await findFaces(frame); } catch { setStep('camera'); setError('Face check could not start. Check internet and try again.'); return; }
        // the same strict check as a first check-in: one face, close, clear, looking straight
        const q = faceQuality(faces, frame.width, { register: true });
        if (!q.ok) { setStep('camera'); setError(q.reason.replace('First check-in: ', '')); return; }
        if (!photo) { setStep('camera'); setError('Photo could not be saved, try again.'); return; }
        // two more frames of the same moment make the registered face sturdier (other angle / light)
        const extra = [];
        for (let i = 0; i < 2; i++) {
            await new Promise(r => setTimeout(r, 300));
            if (!v.videoWidth) break;
            const c = document.createElement('canvas');
            c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            try {
                const more = faceQuality(await findFaces(c), c.width, { register: true });
                if (more.ok && distance(more.face.descriptor, q.face.descriptor) < 0.45) extra.push(more.face.descriptor);   // the same face
            } catch { /* one frame is enough */ }
        }
        stop();
        setShot({ photo, descriptor: q.face.descriptor, extra });
        setStep('review');
    };

    const save = async () => {
        if (!shot) return;
        // the new face is also the staff photo (ID card, lists) - like registering an identity in AuraLock
        if (staff.staffId) {
            trackWrite(setDoc(doc(getServices().db, PHOTOS, staff.staffId), { staffId: staff.staffId, data: shot.photo, at: new Date().toISOString() })).catch(() => {});
            onPhotoSaved(staff, shot.photo);
        }
        const rec = await saveStaffFace(staff, shot.descriptor, shot.extra).catch(() => null);
        if (!rec) { setError('Could not save the face. Check internet and try again.'); return; }
        onFaceChanged(staff, rec);
        onClose();
    };

    const reset = () => {
        if (!window.confirm(`Reset the registered face of ${staff.name}? Their next check-in photo will be registered as their face.`)) return;
        resetFace(staff).then(() => { onFaceChanged(staff, { reset: true, descriptor: [] }); onClose(); }).catch(() => setError('Could not reset. Check internet and try again.'));
    };

    const sourceText = !face ? 'No face registered yet. Tap "Take face now" with the person in front of the camera (or their first good check-in registers it).'
        : face.source === 'staff-photo' ? 'Registered from the staff photo / taken by the manager.'
            : 'Registered at their first check-in (the selfie below). If this is someone else, take the face again.';

    return (
        <DialogContent className="ui max-h-[92dvh] overflow-y-auto bg-white text-[#0a192f] sm:max-w-md" data-testid="face-dialog">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#0a192f]"><ScanFace className="size-5" />Face of {staff.name}</DialogTitle>
                <DialogDescription>{staff.staffId || 'No staff ID'} · only this face can check in / out as {staff.name}.</DialogDescription>
            </DialogHeader>

            {step === 'view' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        {current
                            ? <img data-testid="face-current" src={current} alt={`Registered face of ${staff.name}`} className="h-28 w-[5.25rem] shrink-0 rounded-lg object-cover" />
                            : <div className="grid h-28 w-[5.25rem] shrink-0 place-items-center rounded-lg bg-[#0a192f] text-[#d4af37]"><ScanFace className="size-8" /></div>}
                        <p data-testid="face-source" className="text-sm text-slate-700">{sourceText}</p>
                    </div>
                </div>
            )}

            {(step === 'camera' || step === 'checking') && (
                <div className="relative overflow-hidden rounded-2xl bg-[#0a192f]">
                    <video ref={videoRef} data-testid="face-video" playsInline muted className={`aspect-[3/4] w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
                    <button type="button" onClick={switchCamera} disabled={step === 'checking'} data-testid="face-switch" aria-label="Switch between front and back camera"
                        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-[#0a192f]/80 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/30">
                        <SwitchCamera className="size-4" />{facing === 'user' ? 'Back camera' : 'Front camera'}
                    </button>
                    <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-[40%] border-2 border-dashed border-[#d4af37]/80" />
                    {step === 'checking' && <div className="absolute inset-0 grid place-items-center bg-[#0a192f]/55 text-sm font-bold text-white">Checking the face…</div>}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a192f]/85 to-transparent p-3 text-center text-xs font-semibold text-white">
                        {facing === 'user' ? `${staff.name} close to the camera` : `Point the phone at ${staff.name}, close`}, looking straight, good light, nobody else in the picture
                    </div>
                </div>
            )}

            {step === 'review' && shot && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <img data-testid="face-new" src={shot.photo} alt={`New face of ${staff.name}`} className="h-28 w-[5.25rem] shrink-0 rounded-lg object-cover" />
                    <p className="flex items-start gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Good face. Save it as the face of {staff.name}? From now on only this face can check in as {staff.name}.</p>
                </div>
            )}

            {error && <p role="alert" data-testid="face-error" className="flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-sm font-semibold text-red-700"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}

            <DialogFooter className="gap-2 sm:justify-between">
                {step === 'view' && <>
                    <Button variant="outline" onClick={reset} disabled={!face} data-testid="face-reset"><RotateCcw />Reset</Button>
                    <Button onClick={() => openCamera()} data-testid="face-take" className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><Camera />{face ? 'Take face again' : 'Take face now'}</Button>
                </>}
                {(step === 'camera' || step === 'checking') && <>
                    <Button variant="outline" onClick={() => { stop(); setStep('view'); setError(''); }}>Cancel</Button>
                    <Button onClick={scan} disabled={step === 'checking'} data-testid="face-scan" className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><ScanFace />Scan face</Button>
                </>}
                {step === 'review' && <>
                    <Button variant="outline" onClick={() => openCamera()}>Take again</Button>
                    <Button onClick={save} data-testid="face-save" className="bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><CheckCircle2 />Save face</Button>
                </>}
            </DialogFooter>
        </DialogContent>
    );
}
