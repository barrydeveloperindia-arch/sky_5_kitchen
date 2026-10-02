/**
 * HOTEL SKY 5 - shared Firebase connection (inventory + OPS Center + shop).
 * Every device signs in anonymously (no PIN, as the owner asked) and reads/writes the same Firestore.
 * E2E tests set VITE_FIREBASE_EMULATOR=1: the app then talks to the local emulator only, and every
 * browser session gets its own emulator project, so tests never touch live data or each other.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
    initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
} from 'firebase/firestore';
import firebaseConfig from './firebaseConfig.json';

export const IS_TEST_ENV = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

function emulatorProjectId() {
    try {
        let id = localStorage.getItem('sky5_emu_project');
        if (!id) {
            id = `demo-sky5-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('sky5_emu_project', id);
        }
        return id;
    } catch {
        return 'demo-hotel-sky5';
    }
}

let services = null;
export function getServices() {
    if (services) return services;
    const projectId = IS_TEST_ENV ? emulatorProjectId() : firebaseConfig.projectId;
    const app = initializeApp({ ...firebaseConfig, projectId });
    const auth = getAuth(app);
    let db;
    try {
        // Offline cache: entries made without network sync when back online
        db = initializeFirestore(app, { localCache: IS_TEST_ENV ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
        db = initializeFirestore(app, { localCache: memoryLocalCache() });
    }
    if (IS_TEST_ENV) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8181);
    }
    services = { auth, db };
    return services;
}

// Resolves with the signed-in (anonymous) user; signs in on first use.
// No internet at start-up? Keeps retrying (every few seconds) instead of giving up.
let signInPromise = null;
export function whenSignedIn() {
    if (signInPromise) return signInPromise;
    const { auth } = getServices();
    signInPromise = new Promise(resolve => {
        let attempt = 0;
        const trySignIn = () => signInAnonymously(auth).catch(() => {
            attempt += 1;
            setTimeout(trySignIn, Math.min(10000, 1000 * attempt));
        });
        const stop = onAuthStateChanged(auth, u => {
            if (u) { stop(); resolve(u); return; }
            trySignIn();
        });
    });
    return signInPromise;
}
