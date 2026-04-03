
// Firebase SDK Modular via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Importar lógica de módulos
import * as BarberosLib from "./barberos_logic.js";
import * as ServiciosLib from "./servicios_logic.js";
import * as DispLib from "./disponibilidad_logic.js";
import * as PagosLib from "./pagos_logic.js";
import * as HistorialLib from "./historial_logic.js";



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
const availabilitySection = document.getElementById('availabilitySection');
const appointmentsSection = document.getElementById('appointmentsSection');
const historySection = document.getElementById('historySection');


// Botones de Navegación
const btnManageStaff = document.getElementById('btnManageStaff');
const btnManageServices = document.getElementById('btnManageServices');
const btnManageAvailability = document.getElementById('btnManageAvailability');
const btnManageAppointments = document.getElementById('btnManageAppointments');
const btnManagePayments = document.getElementById('btnManagePayments');
const btnManageHistory = document.getElementById('btnManageHistory');
const btnBackToMenu = document.getElementById('btnBackToMenu');
const btnBackFromServices = document.getElementById('btnBackFromServices');
const btnBackFromAvailability = document.getElementById('btnBackFromAvailability');
const btnBackFromAppointments = document.getElementById('btnBackFromAppointments');
const btnBackFromPayments = document.getElementById('btnBackFromPayments');
const btnBackFromHistory = document.getElementById('btnBackFromHistory');


// Elementos de Personal
const barberoForm = document.getElementById('barberoForm');
const barberosList = document.getElementById('barberosList');
const btnCrearBarbero = document.getElementById('btnCrearBarbero');
const btnCancelarBarbero = document.getElementById('btnCancelarBarbero');
let editingBarberoId = null;

// UI Modal Reseñas
const modalViewReviews = document.getElementById('modalViewReviews');
const viewReviewsBarberName = document.getElementById('viewReviewsBarberName');
const reviewsListContainer = document.getElementById('reviewsListContainer');
const btnCloseReviewsModal = document.getElementById('btnCloseReviewsModal');
const noReviewsMsg = document.getElementById('noReviewsMsg');

// Elementos de Servicios
const serviciosList = document.getElementById('serviciosList');
const servicioForm = document.getElementById('servicioForm');
const btnCrearServicio = document.getElementById('btnCrearServicio');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const servicioFormTitle = document.getElementById('servicioFormTitle');

// Elementos de Disponibilidad
const daysList = document.getElementById('daysList');
const availabilityForm = document.getElementById('availabilityForm');
const btnApplyBulk = document.getElementById('btnApplyBulk');
const bulkOpen = document.getElementById('bulkOpen');
const bulkClose = document.getElementById('bulkClose');

// Elementos de Citas
const appointmentsListByBarber = document.getElementById('appointmentsListByBarber');

// Modales de Citas
const modalEditCita = document.getElementById('modalEditCita');
const editCitaForm = document.getElementById('editCitaForm');
const editCitaId = document.getElementById('editCitaId');
const editCitaBarbero = document.getElementById('editCitaBarbero');
const editCitaServicio = document.getElementById('editCitaServicio');
const btnCancelEditCita = document.getElementById('btnCancelEditCita');

// --- Elementos de Pagos ---
const pendingPaymentsList = document.getElementById('pendingPaymentsList');

// Modal Cobrar Cita
const modalCompleteCita = document.getElementById('modalCompleteCita');
const completeCitaForm = document.getElementById('completeCitaForm');
const ccClientInfo = document.getElementById('ccClientInfo');
const ccServiceInfo = document.getElementById('ccServiceInfo');
const ccMonto = document.getElementById('ccMonto');
const ccNota = document.getElementById('ccNota');
const btnCancelCompleteCita = document.getElementById('btnCancelCompleteCita');
const paymentBtnsCita = modalCompleteCita.querySelectorAll('.payment-btn');

// Formulario Pago Directo
const directPaymentForm = document.getElementById('directPaymentForm');
const dpSearchClient = document.getElementById('dpSearchClient');
const dpClientSearchResults = document.getElementById('dpClientSearchResults');
const dpSelectedClientBox = document.getElementById('dpSelectedClientBox');
const dpSelectedClientName = document.getElementById('dpSelectedClientName');
const dpRemoveClientBtn = document.getElementById('dpRemoveClientBtn');
const dpClientId = document.getElementById('dpClientId');
const dpCasualClient = document.getElementById('dpCasualClient');
const dpCasualName = document.getElementById('dpCasualName');
const dpBarberoSelect = document.getElementById('dpBarberoSelect');
const dpServicioSelect = document.getElementById('dpServicioSelect');
const dpMonto = document.getElementById('dpMonto');
const dpMetodoPago = document.getElementById('dpMetodoPago');
const dpNota = document.getElementById('dpNota');

// --- Elementos de Historial ---
const histFilterClient = document.getElementById('histFilterClient');
const histFilterBarber = document.getElementById('histFilterBarber');
const histFilterType = document.getElementById('histFilterType');
const histFilterStart = document.getElementById('histFilterStart');
const histFilterEnd = document.getElementById('histFilterEnd');
const btnApplyHistFilters = document.getElementById('btnApplyHistFilters');
const historyList = document.getElementById('historyList');
const histEarningsToday = document.getElementById('histEarningsToday');
const histEarningsFiltered = document.getElementById('histEarningsFiltered');


let currentManager = null;
let currentShop = null;
let currentBarberos = [];
let currentServicios = [];
let editingServiceId = null;
let activeCitaId = null;

let currentPendingAppointments = [];
let pendingPaymentCitaId = null;
let selectedDirectClient = null;

let rawHistoryData = [];



// --- 1. Gestión de Sesión ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentManager = user;
        await loadShopData();
        await refreshBarberos();
        await refreshServicios();
    } else {
        window.location.href = '../index.html';
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
    await BarberosLib.renderBarberos(db, currentBarberos, barberosList, handleDeleteBarbero, handleViewReviews);
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

barberosList.addEventListener('editBarbero', (e) => {
    const b = e.detail;
    editingBarberoId = b.uid;
    document.getElementById('barberoNombre').value = b.nombres;
    document.getElementById('barberoEmail').value = b.email;
    document.getElementById('barberoPass').value = b.passOriginal || b.pass || '';
    
    // Al editar, deshabilitamos el email porque Auth no se puede cambiar fácilmente desde aquí
    document.getElementById('barberoEmail').disabled = true;
    
    btnCrearBarbero.textContent = "Guardar Cambios";
    btnCancelarBarbero.classList.remove('hidden');
    // Scroll arriba para que vea el formulario
    document.getElementById('barberoForm').scrollIntoView({ behavior: 'smooth' });
});

btnCancelarBarbero.addEventListener('click', () => {
    resetBarberoForm();
});

function resetBarberoForm() {
    editingBarberoId = null;
    barberoForm.reset();
    document.getElementById('barberoEmail').disabled = false;
    btnCrearBarbero.textContent = "Registrar Barbero";
    btnCancelarBarbero.classList.add('hidden');
}

// Logica Ver Reseñas
function handleViewReviews(uid, nombre, resenas) {
    viewReviewsBarberName.textContent = nombre;
    reviewsListContainer.innerHTML = '';
    
    if (resenas.length === 0) {
        noReviewsMsg.style.display = 'block';
        noReviewsMsg.textContent = 'Este barbero aún no tiene reseñas.';
    } else {
        noReviewsMsg.style.display = 'none';
        resenas.forEach(r => {
            const dateStr = new Date(r.fecha).toLocaleDateString();
            const starsFixed = "★".repeat(r.calificacion) + "☆".repeat(5 - r.calificacion);
            const rDiv = document.createElement('div');
            
            // Estilos inline de tarjeta de reseña
            rDiv.style.background = 'var(--card-bg)';
            rDiv.style.padding = '1rem';
            rDiv.style.borderRadius = '8px';
            rDiv.style.marginBottom = '1rem';
            rDiv.style.border = '1px solid var(--glass-border)';
            rDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>Usuario Anónimo</strong>
                    <span style="color: #ffd700;">${starsFixed}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
                    ${dateStr} - ${r.fechaEditada ? '(Editada)' : ''}
                </div>
                <div>${r.comentario || '<em>Sin comentario adjunto.</em>'}</div>
            `;
            reviewsListContainer.appendChild(rDiv);
        });
    }
    
    modalViewReviews.classList.remove('hidden');
}

btnCloseReviewsModal.addEventListener('click', () => {
    modalViewReviews.classList.add('hidden');
});

barberoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barberData = {
        nombre: document.getElementById('barberoNombre').value,
        email: document.getElementById('barberoEmail').value,
        pass: document.getElementById('barberoPass').value
    };

    if (editingBarberoId) {
        try {
            await BarberosLib.updateBarberoLocally(db, editingBarberoId, {
                nombres: barberData.nombre,
                passOriginal: barberData.pass
            });
            alert("Datos de barbero actualizados correctamente.");
            resetBarberoForm();
            await refreshBarberos();
        } catch (error) {
            alert("Error al actualizar: " + error.message);
        }
    } else {
        const nextId = BarberosLib.getNextAvailableId(currentBarberos);

        try {
            await BarberosLib.createBarbero(secondaryAuth, db, currentShop, barberData, nextId);
            alert(`Barbero registrado con éxito con el ID: ${nextId}`);
            resetBarberoForm();
            await refreshBarberos();
        } catch (error) {
            alert("Error: " + error.message);
        }
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
    resetServicioForm();
});

btnManageAvailability.addEventListener('click', async () => {
    mainDashboard.classList.add('hidden');
    availabilitySection.classList.remove('hidden');
    await refreshAvailability();
});

btnBackFromAvailability.addEventListener('click', () => {
    availabilitySection.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
});

btnManageAppointments.addEventListener('click', async () => {
    mainDashboard.classList.add('hidden');
    appointmentsSection.classList.remove('hidden');
    await refreshAppointments();
});

btnBackFromAppointments.addEventListener('click', () => {
    appointmentsSection.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
});

if (btnManagePayments) {
    btnManagePayments.addEventListener('click', async () => {
        mainDashboard.classList.add('hidden');
        document.getElementById('paymentsSection').classList.remove('hidden');
        await refreshPendingPayments();
        populateDirectPaymentSelects();
    });
}

if (btnBackFromPayments) {
    btnBackFromPayments.addEventListener('click', () => {
        document.getElementById('paymentsSection').classList.add('hidden');
        mainDashboard.classList.remove('hidden');
    });
}

if (btnManageHistory) {
    btnManageHistory.addEventListener('click', async () => {
        mainDashboard.classList.add('hidden');
        historySection.classList.remove('hidden');
        // Populate select of barbers if empty
        if (histFilterBarber.options.length <= 1) {
            currentBarberos.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.uid;
                opt.textContent = b.nombres;
                histFilterBarber.appendChild(opt);
            });
        }
        await loadAndRenderHistory();
    });
}

if (btnBackFromHistory) {
    btnBackFromHistory.addEventListener('click', () => {
        historySection.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
    });
}

// --- Lógica de Disponibilidad ---

const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

async function refreshAvailability() {
    const config = await DispLib.loadConfiguracion(db, currentManager.uid);
    renderDays(config);
}

function renderDays(config) {
    daysList.innerHTML = '';
    diasSemana.forEach(dia => {
        const diaData = config[dia] || { abierta: true, inicio: "08:00", fin: "20:00" };
        const div = document.createElement('div');
        div.className = 'day-row';
        div.innerHTML = `
            <div class="day-check">
                <input type="checkbox" class="bulk-selector" data-dia="${dia}">
                <span class="day-name">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
            </div>
            <div class="day-config">
                <label class="switch">
                    <input type="checkbox" id="open-${dia}" ${diaData.abierta ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <span class="status-label">${diaData.abierta ? 'Abierto' : 'Cerrado'}</span>
                <div class="time-inputs ${diaData.abierta ? '' : 'disabled-opacity'}">
                    <input type="time" id="start-${dia}" value="${diaData.inicio}" ${diaData.abierta ? '' : 'disabled'}>
                    <span>a</span>
                    <input type="time" id="end-${dia}" value="${diaData.fin}" ${diaData.abierta ? '' : 'disabled'}>
                </div>
            </div>
        `;

        // Toggle abierto/cerrado
        const toggle = div.querySelector(`#open-${dia}`);
        toggle.addEventListener('change', (e) => {
            const isOpen = e.target.checked;
            div.querySelector('.status-label').textContent = isOpen ? 'Abierto' : 'Cerrado';
            const timeInputs = div.querySelector('.time-inputs');
            const inputs = timeInputs.querySelectorAll('input');
            if (isOpen) {
                timeInputs.classList.remove('disabled-opacity');
                inputs.forEach(i => i.disabled = false);
            } else {
                timeInputs.classList.add('disabled-opacity');
                inputs.forEach(i => i.disabled = true);
            }
        });

        daysList.appendChild(div);
    });
}

btnApplyBulk.addEventListener('click', () => {
    const selectedDays = Array.from(document.querySelectorAll('.bulk-selector:checked')).map(cb => cb.dataset.dia);
    if (selectedDays.length === 0) {
        alert("Por favor selecciona al menos un día.");
        return;
    }

    selectedDays.forEach(dia => {
        document.getElementById(`open-${dia}`).checked = true;
        document.getElementById(`open-${dia}`).dispatchEvent(new Event('change'));
        document.getElementById(`start-${dia}`).value = bulkOpen.value;
        document.getElementById(`end-${dia}`).value = bulkClose.value;
    });
});

availabilityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevosHorarios = {};
    diasSemana.forEach(dia => {
        nuevosHorarios[dia] = {
            abierta: document.getElementById(`open-${dia}`).checked,
            inicio: document.getElementById(`start-${dia}`).value,
            fin: document.getElementById(`end-${dia}`).value
        };
    });

    try {
        await DispLib.saveConfiguracion(db, currentManager.uid, nuevosHorarios);
        alert("Configuración de horarios guardada exitosamente.");
    } catch (error) {
        alert("Error al guardar la configuración.");
    }
});

// --- Lógica de Citas ---

async function refreshAppointments() {
    const citas = await DispLib.loadCitasPorBarberia(db, currentManager.uid);
    renderAppointments(citas);
}

function renderAppointments(citas) {
    if (citas.length === 0) {
        appointmentsListByBarber.innerHTML = '<p class="loading-text">No hay citas programadas actualmente.</p>';
        return;
    }

    // Agrupar por barbero
    const grouped = {};
    citas.forEach(cita => {
        if (!grouped[cita.barberoId]) {
            grouped[cita.barberoId] = {
                nombre: cita.barberoNombre,
                items: []
            };
        }
        grouped[cita.barberoId].items.push(cita);
    });

    appointmentsListByBarber.innerHTML = '';
    for (const barberId in grouped) {
        const barberData = grouped[barberId];
        const section = document.createElement('div');
        section.className = 'barber-appointment-group';
        section.innerHTML = `
            <h3>Barbero: ${barberData.nombre}</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Cliente</th>
                            <th>Servicio</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${barberData.items.map(cita => `
                            <tr>
                                <td>${cita.fecha}</td>
                                <td>${cita.hora}</td>
                                <td>${cita.clienteNombre}</td>
                                <td>${cita.servicioNombre}</td>
                                <td><span class="status-pill ${cita.estado}">${cita.estado}</span></td>
                                <td>
                                    <div class="appointment-actions">
                                        ${cita.estado === 'programada' ? `
                                            <button class="action-btn edit" data-id="${cita.id}">✏️</button>
                                            <button class="action-btn cancel" data-id="${cita.id}">🚫</button>
                                        ` : `
                                            <span class="action-locked">No editable</span>
                                        `}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        appointmentsListByBarber.appendChild(section);
    }

    // Attach listeners to new buttons
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => handleEditCita(btn.dataset.id));
    });
    document.querySelectorAll('.action-btn.cancel').forEach(btn => {
        btn.addEventListener('click', () => handleCancelCita(btn.dataset.id));
    });
}

// --- Funciones de Gestión de Citas ---

async function handleEditCita(citaId) {
    activeCitaId = citaId;
    const citas = await DispLib.loadCitasPorBarberia(db, currentManager.uid);
    const cita = citas.find(c => c.id === citaId);
    
    if (!cita) return;

    // Poblar selects
    editCitaBarbero.innerHTML = '';
    currentBarberos.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.uid;
        opt.textContent = b.nombres;
        if (b.uid === cita.barberoId) opt.selected = true;
        editCitaBarbero.appendChild(opt);
    });

    editCitaServicio.innerHTML = '';
    currentServicios.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.nombre} ($${s.precio})`;
        if (s.id === cita.servicioId) opt.selected = true;
        editCitaServicio.appendChild(opt);
    });

    editCitaId.value = citaId;
    modalEditCita.classList.remove('hidden');
}

async function handleCancelCita(citaId) {
    if (confirm("¿Estás seguro de que deseas cancelar esta cita?")) {
        try {
            await DispLib.cancelarCita(db, citaId);
            alert("Cita cancelada.");
            await refreshAppointments();
        } catch (error) {
            alert("Error al cancelar la cita.");
        }
    }
}

// Handlers de Modales
btnCancelEditCita.addEventListener('click', () => modalEditCita.classList.add('hidden'));

editCitaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bId = editCitaBarbero.value;
    const sId = editCitaServicio.value;
    
    const barbero = currentBarberos.find(b => b.uid === bId);
    const servicio = currentServicios.find(s => s.id === sId);

    const updates = {
        barberoId: bId,
        barberoNombre: barbero.nombres,
        servicioId: sId,
        servicioNombre: servicio.nombre,
        servicioPrecio: servicio.precio,
        servicioTiempo: servicio.tiempo
    };

    try {
        await DispLib.updateCita(db, activeCitaId, updates);
        alert("Cita actualizada exitosamente.");
        modalEditCita.classList.add('hidden');
        await refreshAppointments();
    } catch (error) {
        alert("Error al actualizar la cita.");
    }
});


// --- 5. Lógica de Pagos e Ingresos ---

async function refreshPendingPayments() {
    currentPendingAppointments = await PagosLib.loadPendingAppointments(db, currentShop.nit || currentManager.uid);
    renderPendingPayments(currentPendingAppointments);
}

function renderPendingPayments(citas) {
    if (citas.length === 0) {
        pendingPaymentsList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay citas pendientes por cobrar el día de hoy.</td></tr>';
        return;
    }

    pendingPaymentsList.innerHTML = '';
    citas.forEach(cita => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cita.fecha} ${cita.hora}</td>
            <td>${cita.clienteNombre}</td>
            <td>${cita.servicioNombre}</td>
            <td><strong>$${cita.servicioPrecio}</strong></td>
            <td>
                <button class="action-btn done" data-id="${cita.id}" title="Realizar Cobro">💳 Cobrar</button>
            </td>
        `;

        tr.querySelector('.action-btn.done').addEventListener('click', () => {
            pendingPaymentCitaId = cita.id;
            
            // Populate modal
            ccClientInfo.textContent = `Cliente: ${cita.clienteNombre}`;
            ccServiceInfo.textContent = `Servicio: ${cita.servicioNombre}`;
            ccMonto.value = cita.servicioPrecio;
            ccNota.value = "";
            
            modalCompleteCita.classList.remove('hidden');
        });

        pendingPaymentsList.appendChild(tr);
    });
}

// Handler de cobro de cita
btnCancelCompleteCita.addEventListener('click', () => modalCompleteCita.classList.add('hidden'));

paymentBtnsCita.forEach(btn => {
    btn.addEventListener('click', async () => {
        const method = btn.dataset.method;
        const montoStr = ccMonto.value;
        const monto = parseFloat(montoStr);
        if (isNaN(monto) || monto < 0) {
            alert("Por favor ingresa un monto válido."); return;
        }

        try {
            await PagosLib.processAppointmentPayment(db, pendingPaymentCitaId, {
                monto: monto,
                metodoPago: method,
                nota: ccNota.value
            });
            alert(`Cita cobrada con éxito (${method}).`);
            modalCompleteCita.classList.add('hidden');
            await refreshPendingPayments();
        } catch (error) {
            alert("Error al procesar el pago.");
        }
    });
});

// Formularios Directos
function populateDirectPaymentSelects() {
    dpBarberoSelect.innerHTML = '<option value="">-- Selecciona un Barbero --</option>';
    currentBarberos.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.uid;
        opt.textContent = b.nombres;
        dpBarberoSelect.appendChild(opt);
    });

    dpServicioSelect.innerHTML = '<option value="">-- Selecciona el Servicio --</option>';
    currentServicios.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.dataset.precio = s.precio;
        opt.textContent = `${s.nombre} ($${s.precio})`;
        dpServicioSelect.appendChild(opt);
    });
    
    // Auto-completar precio base
    dpServicioSelect.addEventListener('change', () => {
        const opt = dpServicioSelect.options[dpServicioSelect.selectedIndex];
        if (opt.dataset.precio) {
            dpMonto.value = opt.dataset.precio;
        } else {
            dpMonto.value = '';
        }
    });
}

// Búsqueda de Clientes Directa
let searchTimeout;
dpSearchClient.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    
    if (q.length < 2) {
        dpClientSearchResults.classList.add('hidden');
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const results = await PagosLib.searchClients(db, q);
        dpClientSearchResults.innerHTML = '';
        
        if(results.length === 0){
            dpClientSearchResults.innerHTML = '<li style="padding: 10px; color: var(--text-muted);">No se encontraron clientes</li>';
        } else {
            results.forEach(c => {
                const li = document.createElement('li');
                li.style.padding = "10px";
                li.style.borderBottom = "1px solid var(--glass-border)";
                li.style.cursor = "pointer";
                li.innerHTML = `<strong>${c.nombres}</strong> <small>(${c.email})</small>`;
                li.addEventListener('click', () => {
                    selectedDirectClient = { uid: c.uid, nombres: c.nombres };
                    dpSearchClient.value = '';
                    dpClientSearchResults.classList.add('hidden');
                    dpSearchClient.classList.add('hidden');
                    dpSelectedClientBox.classList.remove('hidden');
                    dpSelectedClientName.textContent = c.nombres;
                });
                dpClientSearchResults.appendChild(li);
            });
        }
        dpClientSearchResults.classList.remove('hidden');
    }, 500);
});

dpRemoveClientBtn.addEventListener('click', () => {
    selectedDirectClient = null;
    dpSelectedClientBox.classList.add('hidden');
    dpSearchClient.classList.remove('hidden');
});

dpCasualClient.addEventListener('change', (e) => {
    if (e.target.checked) {
        dpCasualName.classList.remove('hidden');
        dpCasualName.required = true;
        // Deshabilitar buscador original
        dpSearchClient.disabled = true;
        selectedDirectClient = null;
        dpSelectedClientBox.classList.add('hidden');
    } else {
        dpCasualName.classList.add('hidden');
        dpCasualName.required = false;
        dpCasualName.value = '';
        dpSearchClient.disabled = false;
        if(selectedDirectClient) dpSelectedClientBox.classList.remove('hidden');
    }
});

directPaymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validar Cliente
    let clienteNombre = "";
    let clienteId = null;

    if (dpCasualClient.checked) {
        clienteNombre = dpCasualName.value.trim();
        if (!clienteNombre) { alert("Ingresa el nombre del cliente casual."); return; }
    } else {
        if (!selectedDirectClient) { alert("Busca y selecciona un cliente, o marca como Cliente Casual."); return; }
        clienteNombre = selectedDirectClient.nombres;
        clienteId = selectedDirectClient.uid;
    }

    const bId = dpBarberoSelect.value;
    const sId = dpServicioSelect.value;
    const barbero = currentBarberos.find(b => b.uid === bId);
    const servicio = currentServicios.find(s => s.id === sId);
    const monto = parseFloat(dpMonto.value);

    const paymentData = {
        clienteNombre,
        clienteId,
        barberoId: barbero.uid,
        barberoNombre: barbero.nombres,
        servicioId: servicio.id,
        servicioNombre: servicio.nombre,
        montoTotal: monto,
        metodoPago: dpMetodoPago.value,
        nota: dpNota.value
    };

    try {
        await PagosLib.registerDirectPayment(db, currentShop.nit || currentManager.uid, paymentData);
        alert("Pago registrado localmente con éxito.");
        
        // Reset
        directPaymentForm.reset();
        dpCasualClient.dispatchEvent(new Event('change'));
        dpRemoveClientBtn.dispatchEvent(new Event('click'));
    } catch(err) {
        alert("Error al registrar el pago directo.");
    }
});

// --- 6. Lógica de Historial ---
async function loadAndRenderHistory() {
    historyList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Cargando historial...</td></tr>';
    try {
        rawHistoryData = await HistorialLib.loadFullHistory(db, currentManager.uid, currentShop.nit);
        applyFiltersAndRender();
    } catch(err) {
        historyList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--error)">Error al cargar historial.</td></tr>';
    }
}

function applyFiltersAndRender() {
    const filters = {
        cliente: histFilterClient.value.trim(),
        barbero: histFilterBarber.value,
        estado: histFilterType.value,
        fechaInicio: histFilterStart.value,
        fechaFin: histFilterEnd.value
    };

    const filteredData = HistorialLib.applyFilters(rawHistoryData, filters);
    renderHistory(filteredData);
}

function renderHistory(data) {
    historyList.innerHTML = '';
    
    // Calcular "Ganancias de Hoy" desde el historial raw (no afectado por filtros visuales)
    const todayStr = new Date().toISOString().split('T')[0];
    let totalToday = 0;
    rawHistoryData.forEach(item => {
        if (item.estado === 'hecha' && item.fechaEfectiva.startsWith(todayStr)) {
            totalToday += parseFloat(item.monto) || 0;
        }
    });
    
    // Calcular "Ganancias del Filtro" actual
    let totalFiltered = 0;
    data.forEach(item => {
        if (item.estado === 'hecha') {
            totalFiltered += parseFloat(item.monto) || 0;
        }
    });

    if (histEarningsToday) histEarningsToday.textContent = `$${totalToday.toLocaleString('es-CO')}`;
    if (histEarningsFiltered) histEarningsFiltered.textContent = `$${totalFiltered.toLocaleString('es-CO')}`;
    
    if (data.length === 0) {
        historyList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No se encontraron registros.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        
        let pillClass = item.estado.toLowerCase();
        let displayState = item.estado.charAt(0).toUpperCase() + item.estado.slice(1);
        
        tr.innerHTML = `
            <td>
                <strong>${item.fechaEfectiva.split('T')[0]}</strong> <br>
                <small style="color: var(--text-muted)">${item.tipo === 'directo' ? 'Pago Directo' : (item.fechaEfectiva.includes('T') ? item.fechaEfectiva.split('T')[1].substring(0,5) : '')}</small>
            </td>
            <td>${item.clienteNombre || 'N/A'}</td>
            <td>${item.barberoNombre}</td>
            <td>${item.servicioNombre}</td>
            <td><strong>$${item.monto}</strong></td>
            <td>
                <span class="status-pill ${pillClass}">${displayState}</span>
                ${item.estado === 'hecha' ? `<br><small style="color: var(--text-muted); text-transform: uppercase;">💳 ${item.metodoPago}</small>` : ''}
                ${item.nota ? `<br><button class="nota-btn" onclick="alert('📝 Nota:\\n\\n${item.nota.replace(/'/g, "\\'")}')" style="margin-top: 6px; background: transparent; border: 1px solid var(--glass-border); color: var(--primary); font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; cursor: pointer;">Ver nota 📝</button>` : ''}
            </td>
        `;
        historyList.appendChild(tr);
    });
}

if (btnApplyHistFilters) {
    btnApplyHistFilters.addEventListener('click', applyFiltersAndRender);
}

// Opcional: Búsqueda reactiva por nombre de cliente
let histSearchTimeout;
if (histFilterClient) {
    histFilterClient.addEventListener('input', () => {
        clearTimeout(histSearchTimeout);
        histSearchTimeout = setTimeout(applyFiltersAndRender, 400);
    });
}

// --- 7. Sesión ---
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
});
