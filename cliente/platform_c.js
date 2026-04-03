
// Firebase SDK Modular via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Misma configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBb6UkVsmDOi5U0eedy7rjCAqObshwVLrY",
  authDomain: "usuarios-peluqueria.firebaseapp.com",
  projectId: "usuarios-peluqueria",
  storageBucket: "usuarios-peluqueria.firebasestorage.app",
  messagingSenderId: "816887500809",
  appId: "1:816887500809:web:43e96c1d1d0358b124e8d8",
  measurementId: "G-FTZSXB3SGC"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos de la UI
const userNameSpan = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const shopSelectionSection = document.getElementById('shopSelectionSection');
const actionMenu = document.getElementById('actionMenu');
const shopList = document.getElementById('shopList');
const shopSearch = document.getElementById('shopSearch');
const selectedShopNameH1 = document.getElementById('selectedShopName');
const btnBackToShops = document.getElementById('btnBackToShops');

// Nuevos elementos para Barberos
const btnViewBarbers = document.getElementById('btnViewBarbers');
const barbersSection = document.getElementById('barbersSection');
const barberList = document.getElementById('barberList');
const btnBackToMenu = document.getElementById('btnBackToMenu');

// Variables de Estado
let allBarberias = [];
let filteredBarberias = [];
let selectedShopNit = null;

// Verificar estado de la sesión
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario autenticado, obtener datos de Firestore
        try {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                userNameSpan.textContent = userData.nombres;
                
                // Cargar la lista de barberías disponibles
                loadBarberias();
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
        }
    } else {
        // Usuario no autenticado, redirigir al login
        window.location.href = '../index.html';
    }
});

// Cargar todas las barberías desde Firestore (usuarios con rol 'admin')
async function loadBarberias() {
    try {
        const q = query(collection(db, "usuarios"), where("rol", "==", "admin"));
        const querySnapshot = await getDocs(q);
        
        allBarberias = [];
        querySnapshot.forEach((doc) => {
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

// Renderizar la lista de barberías
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

// Filtrar barberías por búsqueda
shopSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filteredBarberias = allBarberias.filter(shop => 
        shop.nombre.toLowerCase().includes(searchTerm)
    );
    renderBarberias();
});

// Seleccionar una barbería y pasar al menú de acciones
function selectBarberia(shop) {
    selectedShopNameH1.textContent = shop.nombre;
    selectedShopNit = shop.nit;
    
    // Transición de UI
    shopSelectionSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
    
    console.log("Barbería seleccionada:", shop.nombre, "NIT:", selectedShopNit);
}

// Volver a la selección de barberías
btnBackToShops.addEventListener('click', () => {
    actionMenu.classList.add('hidden');
    shopSelectionSection.classList.remove('hidden');
});

// --- GESTIÓN DE BARBEROS ---

// Navegar a la lista de barberos
btnViewBarbers.addEventListener('click', async () => {
    if (!selectedShopNit) return;
    
    actionMenu.classList.add('hidden');
    barbersSection.classList.remove('hidden');
    
    await loadBarbers(selectedShopNit);
});

// Regresar al menú de la barbería
btnBackToMenu.addEventListener('click', () => {
    barbersSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
});

// Cargar barberos de la barbería actual
async function loadBarbers(nit) {
    barberList.innerHTML = '<p class="loading-text">Cargando staff...</p>';
    
    try {
        const q = query(collection(db, "usuarios"), 
                        where("rol", "==", "barbero"), 
                        where("nit", "==", nit));
        const querySnapshot = await getDocs(q);
        
        const barberos = [];
        querySnapshot.forEach((doc) => {
            barberos.push({ id: doc.id, ...doc.data() });
        });
        
        renderBarbers(barberos);
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        barberList.innerHTML = '<p class="error-text">No se pudieron cargar los barberos.</p>';
    }
}

// Renderizar las tarjetas de barberos
function renderBarbers(barberos) {
    if (barberos.length === 0) {
        barberList.innerHTML = '<p class="loading-text">No hay barberos registrados en esta sucursal.</p>';
        return;
    }

    barberList.innerHTML = '';
    barberos.forEach(barber => {
        const card = document.createElement('div');
        card.className = 'barber-card';
        
        // Estrellas visuales (Por ahora 0.0)
        const rating = 0; // Futuro: Obtener de la DB
        
        card.innerHTML = `
            <span class="barber-icon">👤</span>
            <span class="barber-id">Barbero #${barber.barberoId || '?'}</span>
            <h3>${barber.nombres}</h3>
            
            <div class="rating-container">
                <div class="stars">★★★★★</div>
                <span class="rating-text">${rating.toFixed(1)} / 5.0 (Sin reseñas)</span>
            </div>
            
            <button class="review-btn" title="Requiere completar una cita primero" disabled>
                Dejar Reseña
            </button>
        `;
        barberList.appendChild(card);
    });
}

// Manejador del cierre de sesión
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
