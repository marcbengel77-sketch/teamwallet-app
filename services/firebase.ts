
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // Consolidate import for value and type
import { getStorage, FirebaseStorage } from 'firebase/storage';
// Optionally import getAnalytics if needed, but it's not currently used in the app logic
// import { getAnalytics, Analytics } from "firebase/analytics";

import { firebaseConfig } from '../firebase_config_secrets'; // Import from the new secrets file

// The placeholder check is removed as actual keys are expected now.
// Users are instructed to manage key security via .gitignore for `firebase_config_secrets.ts`.


const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(firebaseApp);
const firestore: Firestore = getFirestore(firebaseApp);
const storage: FirebaseStorage = getStorage(firebaseApp);

// If you want to use Firebase Analytics, uncomment and export it:
// const analytics: Analytics = getAnalytics(firebaseApp);
// export { firebaseApp, auth, firestore, storage, analytics };

export { firebaseApp, auth, firestore, storage };