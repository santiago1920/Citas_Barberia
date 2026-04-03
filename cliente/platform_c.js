/**
 * platform_c.js — Punto de entrada principal de la plataforma cliente.
 *
 * Responsabilidades:
 *  - Inicializar la sesión de Firebase Auth.
 *  - Mantener el estado global compartido entre módulos.
 *  - Importar y activar todos los módulos de dominio.
 *
 * Módulos de dominio (en /modules/):
 *  - barberias.js   → búsqueda y selección de barbería
 *  - barberos.js    → vista del equipo con calificaciones
 *  - resenas.js     → dejar/editar reseñas y ver reseñas públicas
 *  - booking.js     → flujo de agendado de cita
 *  - gestion_citas.js → ver, editar y cancelar citas propias
 */

import { auth } from "./firebase.config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// ─── Estado global compartido ─────────────────────────────────────────────────
// Todos los módulos leen y escriben sobre este objeto en lugar de duplicar vars.
export const state = {
    currentUserData: null,
    selectedShopId: null,     // UID del gerente (barberiaId en citas)
    selectedShopNit: null,    // NIT de la barbería
    currentBarberos: [],
    currentServicios: [],
    currentShopHorarios: null
};

// ─── Importar módulos (side-effect imports: registran sus propios listeners) ──
import "./modules/barberias.js";
import "./modules/barberos.js";
import "./modules/resenas.js";
import "./modules/booking.js";
import "./modules/gestion_citas.js";

// ─── Referencias DOM globales ─────────────────────────────────────────────────
const userNameSpan = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');

// ─── Sesión de usuario ────────────────────────────────────────────────────────

import { db } from "./firebase.config.js";
import { loadBarberias } from "./modules/barberias.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                state.currentUserData = { uid: user.uid, ...docSnap.data() };
                userNameSpan.textContent = state.currentUserData.nombres;
                await loadBarberias();
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
        }
    } else {
        window.location.href = '../index.html';
    }
});

// ─── Cierre de sesión ─────────────────────────────────────────────────────────

btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert("Sesión cerrada correctamente.");
        window.location.href = '../index.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("Hubo un problema al cerrar la sesión.");
    }
});
