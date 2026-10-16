/**
 * HOTEL SKY 5 - face check for staff check-in / check-out (same engine as the AuraLock terminal: face-api.js).
 * Only the person whose name is chosen can mark attendance: the check-in face is compared with that person's
 * registered face. The registered face is the photo the manager added in Staff Directory; for someone without
 * a photo, their first good check-in face is registered (and the manager sees it, and can reset it).
 * Runs on the phone; models are served from /models.
 */
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getServices, whenSignedIn } from './firebase';
import { trackWrite } from './syncedState';

// A face this close to someone else's registered face is the SAME person (the manager is stopped). Between this and
// MATCH_DISTANCE it only looks similar (live data: different people measured 0.59-0.8 apart), so the manager is
// warned and decides.
export const DUPLICATE_BLOCK = 0.4;
export const MATCH_DISTANCE = 0.6;   // same as the AuraLock terminal; the same person measured 0.45-0.63 on a hotel phone
export const MIN_FACE_SHARE = 0.2;   // face must be at least this share of the photo width (close enough)
export const MIN_SCORE = 0.6;        // detector confidence
// The face that is registered (first check-in) must be a good one: close, clear and looking straight
export const REGISTER_FACE_SHARE = 0.28;
export const REGISTER_SCORE = 0.75;
export const REGISTER_YAW = [0.3, 0.7];   // nose between the eyes: 0.5 = straight, 0 / 1 = side face
export const FACES = 'hotel_staff_faces';

// The face engine is big (about 1.3 MB), so it is fetched only when a face is checked - the shop and the
// OPS Center never download it.
let api = null;
const faceApi = async () => (api ||= await import('face-api.js'));

let loading = null;
export function loadFaceModels() {
    if (typeof window !== 'undefined' && window.__FACE_TEST__) return Promise.resolve();
    if (!loading) {
        loading = faceApi().then(faceapi => Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])).catch(err => { loading = null; throw err; });
    }
    return loading;
}

// First use of each model is slow on a phone (about 5 s: the graphics chip prepares it); after that a check is
// about half a second. So the page runs one empty pass early, while the person is still on the start screen.
let warming = null;
export function warmUpFaces() {
    if (typeof window !== 'undefined' && window.__FACE_TEST__) return Promise.resolve();
    if (!warming) {
        warming = loadFaceModels().then(async () => {
            const faceapi = await faceApi();
            const c = document.createElement('canvas');
            c.width = 160; c.height = 160;
            c.getContext('2d').fillRect(0, 0, 160, 160);
            await faceapi.detectAllFaces(c, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }));
            await faceapi.detectFaceLandmarksTiny(c);
            await faceapi.computeFaceDescriptor(c);
        }).catch(err => { warming = null; throw err; });
    }
    return warming;
}

// Every face in a canvas / image: [{ descriptor: number[128], score, width (face box px) }]
export async function findFaces(el) {
    if (typeof window !== 'undefined' && window.__FACE_TEST__) return window.__FACE_TEST__.findFaces(el);
    await loadFaceModels();
    const faceapi = await faceApi();
    const found = await faceapi.detectAllFaces(el, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true).withFaceDescriptors();
    return found.map(r => ({ descriptor: Array.from(r.descriptor), score: r.detection.score, width: r.detection.box.width, yaw: yawOf(r.landmarks) }));
}

// Where the nose tip is between the two eyes (0.5 = looking straight); null when it cannot be measured
function yawOf(landmarks) {
    try {
        const mid = (pts) => pts.reduce((a, p) => a + p.x, 0) / pts.length;
        const l = mid(landmarks.getLeftEye()), r = mid(landmarks.getRightEye()), nose = landmarks.getNose()[3].x;
        return r === l ? null : (nose - l) / (r - l);
    } catch { return null; }
}

// Is this photo good enough to check a face? { ok, reason, face }. `register` = the stricter check for the face
// that becomes someone's registered face.
export function faceQuality(faces, frameWidth, { register = false } = {}) {
    if (!faces || faces.length === 0) return { ok: false, reason: 'No face found. Look straight at the camera in good light.' };
    if (faces.length > 1) return { ok: false, reason: 'More than one face. Only you should be in the photo.' };
    const [face] = faces;
    const share = frameWidth ? face.width / frameWidth : 1;
    if (share < (register ? REGISTER_FACE_SHARE : MIN_FACE_SHARE)) return { ok: false, reason: register ? 'First check-in: come closer, your face should fill the frame.' : 'Come closer to the camera.' };
    if (face.score < (register ? REGISTER_SCORE : MIN_SCORE)) return { ok: false, reason: 'Face not clear. Remove mask / cap and face the light.' };
    if (register && face.yaw != null && (face.yaw < REGISTER_YAW[0] || face.yaw > REGISTER_YAW[1])) return { ok: false, reason: 'First check-in: look straight at the camera.' };
    return { ok: true, face };
}

export function distance(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
}

// Same person? (rounded distance kept as proof on the attendance row)
export function sameFace(live, registered) {
    const d = distance(live, registered);
    return { match: d <= MATCH_DISTANCE, distance: Number.isFinite(d) ? Math.round(d * 1000) / 1000 : null };
}

// One face record per person: staff ID when there is one, else the name
export const faceKey = (staff) => (staff?.staffId ? staff.staffId : `name-${String(staff?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);

const loadImage = (src) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });

// The registered face of a person: { descriptor, source } or null when nobody registered one yet.
// A staff photo added by the manager wins and is turned into a face record the first time it is needed.
export async function registeredFace(staff) {
    await whenSignedIn();
    const { db } = getServices();
    const ref = doc(db, FACES, faceKey(staff));
    const snap = await getDoc(ref);
    const rec = snap.exists() ? snap.data() : null;
    const usable = rec && !rec.reset && Array.isArray(rec.descriptor) && rec.descriptor.length === 128;
    // the manager's staff photo always wins over a face taken at a first check-in
    if (usable && (rec.source === 'staff-photo' || !staff?.photoId)) return rec;
    if (staff?.photoId) {
        const p = await getDoc(doc(db, 'hotel_staff_photos', staff.photoId));
        if (p.exists()) {
            const faces = await findFaces(await loadImage(p.data().data));
            if (faces.length === 1) {   // a staff photo with no face (or several) cannot be used: fall back below
                const made = { staffName: staff.name, staffId: staff.staffId || '', descriptor: faces[0].descriptor, source: 'staff-photo', at: new Date().toISOString(), reset: false };
                trackWrite(setDoc(ref, made)).catch(() => {});
                return made;
            }
        }
    }
    return usable ? rec : null;
}

// Someone else whose registered face is this face (closest one within the limit), or null.
// Stops one person checking in on several names, and a look-alike being taken for the chosen person.
export async function otherFace(live, staff) {
    await whenSignedIn();
    const { db } = getServices();
    const [snap, reg] = await Promise.all([getDocs(collection(db, FACES)), getDoc(doc(db, 'hotel_state', 'staffRegistry'))]);
    // faces of people who left (or are no longer on the list) do not block anyone
    const value = reg.exists() ? reg.data().value || {} : {};
    const working = new Set(['reception', 'kitchen', 'housekeeping'].flatMap(d => (value[d] || []).filter(p => p && p.status !== 'Left').map(p => faceKey(p))));
    const self = faceKey(staff);
    let best = null;
    for (const d of snap.docs) {
        const rec = d.data();
        if (d.id === self || rec.reset || !Array.isArray(rec.descriptor) || rec.descriptor.length !== 128) continue;
        if (reg.exists() && !working.has(d.id)) continue;
        const r = sameFace(live, rec.descriptor);
        if (r.match && (!best || r.distance < best.distance)) best = { staffName: rec.staffName, distance: r.distance, same: r.distance < DUPLICATE_BLOCK };
    }
    return best;
}

// First good check-in face becomes the registered face of someone without a photo
export function registerFace(staff, descriptor, photoId) {
    const { db } = getServices();
    const rec = { staffName: staff.name, staffId: staff.staffId || '', descriptor, source: 'first-check-in', photoId: photoId || '', at: new Date().toISOString(), reset: false };
    return trackWrite(setDoc(doc(db, FACES, faceKey(staff)), rec)).then(() => rec);
}

// Manager (Staff Directory -> Face): this face, taken now, becomes the person's registered face.
// Saved like a staff photo face, so it wins over any face from a first check-in.
export function saveStaffFace(staff, descriptor) {
    const { db } = getServices();
    const rec = { staffName: staff.name, staffId: staff.staffId || '', descriptor, source: 'staff-photo', photoId: '', at: new Date().toISOString(), reset: false };
    return trackWrite(setDoc(doc(db, FACES, faceKey(staff)), rec)).then(() => rec);
}

// Manager: forget a registered face (the next good check-in registers again)
export function resetFace(staff) {
    const { db } = getServices();
    return trackWrite(setDoc(doc(db, FACES, faceKey(staff)), { staffName: staff.name, staffId: staff.staffId || '', descriptor: [], source: 'reset', photoId: '', at: new Date().toISOString(), reset: true }));
}

// The picture the face is checked against, for the result screen (like an office terminal: registered photo + live photo):
// the manager's staff photo, else the photo of the first check-in that registered the face; null when there is none.
export async function registeredPhoto(staff) {
    await whenSignedIn();
    const { db } = getServices();
    const pic = async (coll, id) => { if (!id) return null; const p = await getDoc(doc(db, coll, id)); return p.exists() ? p.data().data || null : null; };
    const fromStaff = await pic('hotel_staff_photos', staff?.photoId);
    if (fromStaff) return fromStaff;
    const f = await getDoc(doc(db, FACES, faceKey(staff)));
    const rec = f.exists() ? f.data() : null;
    return rec && !rec.reset ? pic('hotel_attendance_photos', rec.photoId) : null;
}

// Two people this close to the live face = unsure: ask for a better photo instead of guessing
export const MATCH_MARGIN = 0.05;

// Who is in front of the camera? (like the AuraLock terminal: no name is chosen, the face says who it is)
// Compares the live face with the registered face of everyone working here; the closest one within the limit
// wins, unless a second person is nearly as close. Returns { staff, distance, source } | { staff: null, unsure? }.
export async function identifyFace(live, staffList) {
    await whenSignedIn();
    const { db } = getServices();
    const snap = await getDocs(collection(db, FACES));
    const recs = new Map();
    for (const d of snap.docs) {
        const rec = d.data();
        if (!rec.reset && Array.isArray(rec.descriptor) && rec.descriptor.length === 128) recs.set(d.id, rec);
    }
    // a staff photo from the manager that is not a face record yet: make it one now (saved for next time)
    for (const s of staffList) {
        if (!s.photoId || recs.get(faceKey(s))?.source === 'staff-photo') continue;
        try { const r = await registeredFace(s); if (r) recs.set(faceKey(s), r); } catch { /* use what is there */ }
    }
    let best = null, second = null;
    for (const s of staffList) {
        const rec = recs.get(faceKey(s));
        if (!rec) continue;
        const d = distance(live, rec.descriptor);
        if (!best || d < best.d) { second = best; best = { staff: s, d, rec }; } else if (!second || d < second.d) second = { staff: s, d };
    }
    if (!best || best.d > MATCH_DISTANCE) return { staff: null };
    if (second && second.d <= MATCH_DISTANCE && second.d - best.d < MATCH_MARGIN) return { staff: null, unsure: true };
    return { staff: best.staff, distance: Math.round(best.d * 1000) / 1000, source: best.rec.source };
}

// Does this person have a registered face (a face record or a usable staff photo)?
export async function hasFace(staff) {
    try { return !!(await registeredFace(staff)); } catch { return false; }
}
