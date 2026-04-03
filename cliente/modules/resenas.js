/**
 * modules/resenas.js
 * Responsabilidad: abrir/cerrar los modales de reseñas, manejar estrellas
 * interactivas y enviar/actualizar reseñas en Firestore.
 */
import { db } from "../firebase.config.js";
import * as CitasLib from "../citas_logic.js";
import { state } from "../platform_c.js";

// ─── Referencias DOM ────────────────────────────────────────────────────────
const modalReviewBarber = document.getElementById('modalReviewBarber');
const reviewBarberNameDisplay = document.getElementById('reviewBarberNameDisplay');
const reviewForm = document.getElementById('reviewForm');
const reviewBarberId = document.getElementById('reviewBarberId');
const existingReviewId = document.getElementById('existingReviewId');
const reviewCalificacion = document.getElementById('reviewCalificacion');
const reviewComment = document.getElementById('reviewComment');
const btnCancelReview = document.getElementById('btnCancelReview');
const starRatingsNode = document.querySelectorAll('.star-rating');

const modalClientViewReviews = document.getElementById('modalClientViewReviews');
const clientViewReviewsBarberName = document.getElementById('clientViewReviewsBarberName');
const clientReviewsListContainer = document.getElementById('clientReviewsListContainer');
const btnClientCloseReviewsModal = document.getElementById('btnClientCloseReviewsModal');
const clientNoReviewsMsg = document.getElementById('clientNoReviewsMsg');

// ─── Modal: Dejar / Editar Reseña ────────────────────────────────────────────

/**
 * Abre el modal de reseña, prerellenado si ya existe una reseña previa.
 */
export function openReviewModal(bId, bName, previousReview = null) {
    reviewBarberId.value = bId;
    reviewBarberNameDisplay.textContent = bName;
    reviewCalificacion.value = "0";
    reviewComment.value = "";
    existingReviewId.value = "";
    starRatingsNode.forEach(s => s.classList.remove('active'));

    if (previousReview) {
        existingReviewId.value = previousReview.id;
        reviewCalificacion.value = previousReview.calificacion;
        reviewComment.value = previousReview.comentario || "";
        starRatingsNode.forEach(s => {
            if (parseInt(s.dataset.value) === previousReview.calificacion) {
                s.classList.add('active');
            }
        });
    }
    modalReviewBarber.classList.remove('hidden');
}

btnCancelReview.addEventListener('click', () => {
    modalReviewBarber.classList.add('hidden');
});

// ─── Interacción con estrellas ────────────────────────────────────────────────

starRatingsNode.forEach(star => {
    star.addEventListener('click', e => {
        const val = parseInt(e.target.dataset.value);
        reviewCalificacion.value = val;
        starRatingsNode.forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.value) === val);
        });
    });
});

// ─── Submit reseña ────────────────────────────────────────────────────────────

reviewForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (reviewCalificacion.value === "0") {
        alert("Por favor, selecciona una calificación de 1 a 5 estrellas.");
        return;
    }

    const reviewData = {
        barberoId: reviewBarberId.value,
        clienteUid: state.currentUserData.uid,
        clienteNombre: `${state.currentUserData.nombres} ${state.currentUserData.apellidos}`,
        calificacion: parseInt(reviewCalificacion.value),
        comentario: reviewComment.value.trim()
    };

    try {
        if (existingReviewId.value) {
            await CitasLib.updateBarberReview(db, existingReviewId.value, reviewData);
            alert("¡Reseña actualizada con éxito!");
        } else {
            await CitasLib.submitBarberReview(db, reviewData);
            alert("¡Gracias por tu reseña!");
        }
        modalReviewBarber.classList.add('hidden');

        // Importación diferida para no crear dependencia circular
        const { loadBarbers } = await import("./barberos.js");
        const { state: s } = await import("../platform_c.js");
        loadBarbers(s.selectedShopNit);
    } catch (error) {
        alert("Hubo un error al guardar tu reseña. Inténtalo más tarde.");
    }
});

// ─── Modal: Ver Reseñas Públicas ─────────────────────────────────────────────

/**
 * Abre el modal de visualización pública de reseñas (anónimas).
 */
export function openClientReviewsModal(bName, resenas) {
    clientViewReviewsBarberName.textContent = bName;
    clientReviewsListContainer.innerHTML = '';

    if (resenas.length === 0) {
        clientNoReviewsMsg.style.display = 'block';
        clientNoReviewsMsg.textContent = 'Este barbero aún no tiene reseñas.';
    } else {
        clientNoReviewsMsg.style.display = 'none';
        resenas.forEach(r => clientReviewsListContainer.appendChild(buildReviewCard(r)));
    }
    modalClientViewReviews.classList.remove('hidden');
}

/**
 * Construye una tarjeta de reseña anónima.
 */
function buildReviewCard(r) {
    const dateStr = new Date(r.fecha).toLocaleDateString();
    const starsFixed = "★".repeat(r.calificacion) + "☆".repeat(5 - r.calificacion);
    const div = document.createElement('div');
    Object.assign(div.style, {
        background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px',
        marginBottom: '1rem', border: '1px solid var(--glass-border)'
    });
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>Usuario Anónimo</strong>
            <span style="color: #ffd700;">${starsFixed}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            ${dateStr} - ${r.fechaEditada ? '(Editada)' : ''}
        </div>
        <div>${r.comentario || '<em>Sin comentario adjunto.</em>'}</div>
    `;
    return div;
}

btnClientCloseReviewsModal.addEventListener('click', () => {
    modalClientViewReviews.classList.add('hidden');
});
