/**
 * modules/barberias.js
 * Responsabilidad: cargar, filtrar y seleccionar barberías.
 * Gestiona la sección de búsqueda y selección inicial del cliente.
 */
import { db } from "../firebase.config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { state } from "../platform_c.js";

// ─── Referencias DOM ────────────────────────────────────────────────────────
const shopSelectionSection = document.getElementById('shopSelectionSection');
const actionMenu = document.getElementById('actionMenu');
const shopList = document.getElementById('shopList');
const shopSearch = document.getElementById('shopSearch');
const selectedShopNameH1 = document.getElementById('selectedShopName');
const btnBackToShops = document.getElementById('btnBackToShops');

// ─── Estado local ────────────────────────────────────────────────────────────
let allBarberias = [];
let filteredBarberias = [];

// ─── Carga de datos ──────────────────────────────────────────────────────────

/**
 * Consulta Firestore y obtiene todas las barberías registradas.
 */
export async function loadBarberias() {
    try {
        const q = query(collection(db, "usuarios"), where("rol", "==", "admin"));
        const querySnapshot = await getDocs(q);

        allBarberias = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.nombreEmpresa) {
                allBarberias.push({
                    id: doc.id,
                    nombre: data.nombreEmpresa,
                    gerente: `${data.nombres} ${data.apellidos}`,
                    nit: data.nit
                });
            }
        });

        filteredBarberias = [...allBarberias];
        renderBarberias();
    } catch (error) {
        console.error("Error cargando barberías:", error);
        shopList.innerHTML = `<p class="error-text">No se pudieron cargar las barberías.</p>`;
    }
}

// ─── Renderizado ─────────────────────────────────────────────────────────────

function renderBarberias() {
    if (filteredBarberias.length === 0) {
        shopList.innerHTML = `<p class="loading-text">No se encontraron barberías con ese nombre.</p>`;
        return;
    }
    shopList.innerHTML = '';
    filteredBarberias.forEach(shop => {
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
            <h3>${shop.nombre}</h3>
            <p>Gerente: ${shop.gerente}</p>
            <button class="select-btn">Seleccionar</button>
        `;
        card.addEventListener('click', () => selectBarberia(shop));
        shopList.appendChild(card);
    });
}

// ─── Acciones ────────────────────────────────────────────────────────────────

function selectBarberia(shop) {
    selectedShopNameH1.textContent = shop.nombre;
    // Actualizar estado global compartido
    state.selectedShopNit = shop.nit;
    state.selectedShopId = shop.id;

    shopSelectionSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

shopSearch.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    filteredBarberias = allBarberias.filter(s =>
        s.nombre.toLowerCase().includes(term)
    );
    renderBarberias();
});

btnBackToShops.addEventListener('click', () => {
    actionMenu.classList.add('hidden');
    shopSelectionSection.classList.remove('hidden');
});
