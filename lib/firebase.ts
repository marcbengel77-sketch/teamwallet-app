
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Wir nutzen window.process, das wir in der index.html definiert haben
const env = (window as any).process?.env || {};

const firebaseConfig = {
  apiKey: "AIzaSyD9uSchp5FyqPVS2z1k68WGNiPWLkumMao", 
  authDomain: "teamwallet-1-16872633-ef31b.firebaseapp.com",
  projectId: "teamwallet-1-16872633-ef31b",
  storageBucket: "teamwallet-1-16872633-ef31b.firebasestorage.app",
  messagingSenderId: "82877579878",
  appId: "1:82877579878:web:1a69d7540ccbf8d8daa3a7"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase App initialization failed. Using mock mode.", e);
  // Fallback für Entwicklung ohne Firebase
  app = { 
    name: '[DEFAULT]', 
    options: firebaseConfig, 
    automaticDataCollectionEnabled: false 
  } as any;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
