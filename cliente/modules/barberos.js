/**
 * modules/barberos.js
 * Responsabilidad: cargar y renderizar las tarjetas del equipo de barberos,
 * incluyendo el cálculo de promedios de reseñas y la activación del botón de reseña.
 */
import { db } from "../firebase.config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import * as CitasLib from "../citas_logic.js";
import { state } from "../platform_c.js";
import { openReviewModal, openClientReviewsModal } from "./resenas.js";

// ─── Referencias DOM ────────────────────────────────────────────────────────
const actionMenu = document.getElementById('actionMenu');
const barbersSection = document.getElementById('barbersSection');
const barberList = document.getElementById('barberList');
const btnViewBarbers = document.getElementById('btnViewBarbers');
const btnBackToMenuFromBarbers = document.getElementById('btnBackToMenuFromBarbers');

// ─── Navegación ──────────────────────────────────────────────────────────────

btnViewBarbers.addEventListener('click', async () => {
    if (!state.selectedShopNit) return;
    actionMenu.classList.add('hidden');
    barbersSection.classList.remove('hidden');
    await loadBarbers(state.selectedShopNit);
});

btnBackToMenuFromBarbers.addEventListener('click', () => {
    barbersSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
});

// ─── Carga de datos ──────────────────────────────────────────────────────────

export async function loadBarbers(nit) {
    barberList.innerHTML = '<p class="loading-text">Cargando staff...</p>';
    try {
        const q = query(
            collection(db, "usuarios"),
            where("rol", "==", "barbero"),
            where("nit", "==", nit)
        );
        const querySnapshot = await getDocs(q);
        const barberos = [];
        querySnapshot.forEach(doc => barberos.push({ id: doc.id, ...doc.data() }));
        renderBarbers(barberos);
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        barberList.innerHTML = '<p class="error-text">No se pudieron cargar los barberos.</p>';
    }
}

// ─── Renderizado ─────────────────────────────────────────────────────────────

function renderBarbers(barberos) {
    if (barberos.length === 0) {
        barberList.innerHTML = '<p class="loading-text">No hay barberos registrados en esta sucursal.</p>';
        return;
    }
    barberList.innerHTML = '';
    barberos.forEach(async barber => {
        const card = document.createElement('div');
        card.className = 'barber-card';

        const { rating, averageText, starsDisplay, reseñas } = await buildRatingInfo(barber.id);

        card.innerHTML = buildBarberCardHTML(barber, rating, averageText, starsDisplay, reseñas);
        barberList.appendChild(card);

        attachBarberCardEvents(card, barber, reseñas);
    });
}

/**
 * Obtiene reseñas y calcula el promedio para un barbero.
 */
async function buildRatingInfo(barberoId) {
    const reseñas = await CitasLib.getBarberReviews(db, barberoId);
    let averageText = "Sin reseñas";
    let rating = 0;
    let starsDisplay = "☆".repeat(5);

    if (reseñas.length > 0) {
        const sum = reseñas.reduce((acc, curr) => acc + curr.calificacion, 0);
        rating = sum / reseñas.length;
        averageText = `${reseñas.length} reseña${reseñas.length > 1 ? 's' : ''}`;
        const filled = Math.round(rating);
        starsDisplay = "★".repeat(filled) + "☆".repeat(5 - filled);
    }
    return { rating, averageText, starsDisplay, reseñas };
}

/**
 * Construye el HTML interno de la tarjeta de barbero.
 */
function buildBarberCardHTML(barber, rating, averageText, starsDisplay, reseñas) {
    const verResenasBtn = reseñas.length > 0
        ? `<button class="view-public-reviews-btn" id="seeRev-${barber.id}" style="display:block; margin: 8px auto 0; background:transparent; border:none; color:var(--primary); text-decoration:underline; font-size:0.85rem; cursor:pointer;">Ver reseñas</button>`
        : '';
    return `
        <span class="barber-icon">👤</span>
        <span class="barber-id">Barbero #${barber.barberoId || '?'}</span>
        <h3>${barber.nombres}</h3>
        <div class="rating-container">
            <div class="stars">${starsDisplay}</div>
            <span class="rating-text">${rating.toFixed(1)} / 5.0 (${averageText})</span>
            ${verResenasBtn}
        </div>
        <button class="review-btn" id="revBtn-${barber.id}" title="Requiere completar una cita primero" disabled>
            Dejar Reseña
        </button>
    `;
}

/**
 * Asocia los eventos de acción a los botones de la tarjeta del barbero.
 */
async function attachBarberCardEvents(card, barber, reseñas) {
    // Botón "Ver reseñas"
    if (reseñas.length > 0) {
        const seeRevBtn = card.querySelector(`#seeRev-${barber.id}`);
        if (seeRevBtn) {
            seeRevBtn.addEventListener('click', () => openClientReviewsModal(barber.nombres, reseñas));
        }
    }

    // Botón de reseña: verificar elegibilidad
    const canReview = await CitasLib.canClientReviewBarber(db, state.currentUserData.uid, barber.id);
    const btn = card.querySelector(`#revBtn-${barber.id}`);

    if (canReview && btn) {
        const previousReview = await CitasLib.getUserReviewForBarber(db, state.currentUserData.uid, barber.id);
        btn.disabled = false;
        btn.style.cursor = "pointer";
        btn.style.background = "var(--primary)";
        btn.style.color = "#121212";
        btn.innerHTML = previousReview ? "Editar Reseña" : "Dejar Reseña";
        btn.title = previousReview ? "Modifica tu opinión anterior" : "¡Cuéntanos tu experiencia!";
        btn.addEventListener('click', () => openReviewModal(barber.id, barber.nombres, previousReview));
    } else if (btn) {
        const hint = document.createElement('small');
        hint.textContent = 'Requiere completar una cita primero';
        hint.style.cssText = 'display:block; color:var(--text-muted); font-size:0.75rem; margin-top:6px; text-align:center;';
        btn.insertAdjacentElement('afterend', hint);
    }
}
