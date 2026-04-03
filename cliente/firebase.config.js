/**
 * firebase.config.js
 * Inicialización única de Firebase para toda la plataforma cliente.
 * Todos los módulos importan db y auth desde aquí.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBb6UkVsmDOi5U0eedy7rjCAqObshwVLrY",
    authDomain: "usuarios-peluqueria.firebaseapp.com",
    projectId: "usuarios-peluqueria",
    storageBucket: "usuarios-peluqueria.firebasestorage.app",
    messagingSenderId: "816887500809",
    appId: "1:816887500809:web:43e96c1d1d0358b124e8d8",
    measurementId: "G-FTZSXB3SGC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
