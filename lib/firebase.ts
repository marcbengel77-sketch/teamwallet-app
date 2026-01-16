
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * WICHTIG: Ersetze diese Platzhalter durch deine echten Firebase-Projekt-Daten.
 * Du findest diese in der Firebase Console unter "Projekteinstellungen" -> "Meine Apps".
 */
const firebaseConfig = {
  apiKey: "AIzaSyAs-PLACEHOLDER", 
  authDomain: "dein-projekt.firebaseapp.com",
  projectId: "dein-projekt",
  storageBucket: "dein-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
