
// Firebase SDK Modular via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Importar lógica de módulos
import * as BarberosLib from "./barberos_logic.js";
import * as ServiciosLib from "./servicios_logic.js";

// Configuración de Firebase
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

// Inicializar App Secundaria
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// Elementos UI Compartidos
const shopNameElem = document.getElementById('shopName');
const shopNitElem = document.getElementById('shopNit');
const btnLogout = document.getElementById('btnLogout');

// Secciones
const mainDashboard = document.getElementById('mainDashboard');
const staffSection = document.getElementById('staffSection');
const servicesSection = document.getElementById('servicesSection');

// Botones de Navegación
const btnManageStaff = document.getElementById('btnManageStaff');
const btnManageServices = document.getElementById('btnManageServices');
const btnBackToMenu = document.getElementById('btnBackToMenu');
const btnBackFromServices = document.getElementById('btnBackFromServices');

// Elementos de Personal
const barberosList = document.getElementById('barberosList');
const barberoForm = document.getElementById('barberoForm');

// Elementos de Servicios
const serviciosList = document.getElementById('serviciosList');
const servicioForm = document.getElementById('servicioForm');
const btnCrearServicio = document.getElementById('btnCrearServicio');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const servicioFormTitle = document.getElementById('servicioFormTitle');

let currentManager = null;
let currentShop = null;
let currentBarberos = [];
let currentServicios = [];
let editingServiceId = null;

// --- 1. Gestión de Sesión ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentManager = user;
        await loadShopData();
        await refreshBarberos();
        await refreshServicios();
    } else {
        window.location.href = '../login.html';
    }
});

async function loadShopData() {
    try {
        const docRef = doc(db, "barberias", currentManager.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentShop = docSnap.data();
            shopNameElem.textContent = currentShop.nombre;
            shopNitElem.textContent = currentShop.nit;
        }
    } catch (error) {
        console.error("Error al cargar barbería:", error);
    }
}

// --- 2. Lógica de Barberos ---
async function refreshBarberos() {
    currentBarberos = await BarberosLib.loadBarberos(db, currentShop);
    BarberosLib.renderBarberos(currentBarberos, barberosList, handleDeleteBarbero);
}

async function handleDeleteBarbero(uid, nombre) {
    if (confirm(`¿Estás seguro de eliminar permanentemente a ${nombre}?`)) {
        try {
            await BarberosLib.deleteBarbero(db, uid);
            alert("Barbero eliminado.");
            await refreshBarberos();
        } catch (error) {
            alert("Error al eliminar barbero.");
        }
    }
}

barberoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barberData = {
        nombre: document.getElementById('barberoNombre').value,
        email: document.getElementById('barberoEmail').value,
        pass: document.getElementById('barberoPass').value
    };

    const nextId = BarberosLib.getNextAvailableId(currentBarberos);

    try {
        await BarberosLib.createBarbero(secondaryAuth, db, currentShop, barberData, nextId);
        alert(`Barbero registrado con éxito con el ID: ${nextId}`);
        barberoForm.reset();
        await refreshBarberos();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// --- 3. Lógica de Servicios ---
async function refreshServicios() {
    currentServicios = await ServiciosLib.loadServicios(db, currentManager.uid);
    ServiciosLib.renderServicios(currentServicios, serviciosList, handleDeleteServicio, handleEditServicio);
}

function handleEditServicio(servicio) {
    editingServiceId = servicio.id;
    document.getElementById('servicioNombre').value = servicio.nombre;
    document.getElementById('servicioPrecio').value = servicio.precio;
    document.getElementById('servicioTiempo').value = servicio.tiempo;
    
    servicioFormTitle.textContent = "Editar Servicio";
    btnCrearServicio.textContent = "Guardar Cambios";
    btnCancelarEdicion.classList.remove('hidden');
}

function resetServicioForm() {
    editingServiceId = null;
    servicioForm.reset();
    servicioFormTitle.textContent = "Agregar Nuevo Servicio";
    btnCrearServicio.textContent = "Agregar Servicio";
    btnCancelarEdicion.classList.add('hidden');
}

btnCancelarEdicion.addEventListener('click', resetServicioForm);

async function handleDeleteServicio(id, nombre) {
    if (confirm(`¿Deseas eliminar el servicio "${nombre}"?`)) {
        try {
            await ServiciosLib.deleteServicio(db, currentManager.uid, id);
            await refreshServicios();
            if (editingServiceId === id) resetServicioForm();
        } catch (error) {
            alert("Error al eliminar servicio.");
        }
    }
}

servicioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceData = {
        nombre: document.getElementById('servicioNombre').value,
        precio: document.getElementById('servicioPrecio').value,
        tiempo: document.getElementById('servicioTiempo').value
    };

    try {
        if (editingServiceId) {
            await ServiciosLib.updateServicio(db, currentManager.uid, editingServiceId, serviceData);
            alert("Servicio actualizado correctamente.");
        } else {
            await ServiciosLib.addServicio(db, currentManager.uid, serviceData);
            alert("Servicio agregado correctamente.");
        }
        resetServicioForm();
        await refreshServicios();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// --- 4. Navegación ---
btnManageStaff.addEventListener('click', () => {
    mainDashboard.classList.add('hidden');
    staffSection.classList.remove('hidden');
});

btnManageServices.addEventListener('click', () => {
    mainDashboard.classList.add('hidden');
    servicesSection.classList.remove('hidden');
});

btnBackToMenu.addEventListener('click', () => {
    staffSection.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
});

btnBackFromServices.addEventListener('click', () => {
    servicesSection.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
    resetServicioForm();
});

// --- 5. Sesión ---
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
});
