import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCV0M5dok5_gXr4UTOEaXmwEFzqZ7m6820",
  authDomain: "forja-de-historias.firebaseapp.com",
  projectId: "forja-de-historias",
  storageBucket: "forja-de-historias.firebasestorage.app",
  messagingSenderId: "1036908051071",
  appId: "1:1036908051071:web:aa5a12046ad120f7695d4a"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
