import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// only initialize if configured -- lets the app still run locally without
// Firebase set up yet (falls back to local-only storage, see App.jsx)
export const firebaseEnabled = Boolean(firebaseConfig.databaseURL);

let db = null;
if (firebaseEnabled) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

export function subscribeToOverrides(path, callback) {
  if (!db) return () => {};
  const overridesRef = ref(db, path);
  const unsubscribe = onValue(overridesRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
  return unsubscribe;
}

export function saveOverridesShared(path, overrides) {
  if (!db) return Promise.resolve();
  return set(ref(db, path), overrides);
}
