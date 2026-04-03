/**
 * modules/booking.js
 * Responsabilidad: flujo completo de agendado de citas.
 * Maneja la navegación a la sección, calendario dinámico, slots de tiempo y submit.
 */
import { db } from "../firebase.config.js";
import * as CitasLib from "../citas_logic.js";
import { state } from "../platform_c.js";

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const actionMenu = document.getElementById('actionMenu');
const bookingSection = document.getElementById('bookingSection');
const bookingForm = document.getElementById('bookingForm');
const bookingBarbero = document.getElementById('bookingBarbero');
const bookingServicio = document.getElementById('bookingServicio');
const calendarGroup = document.getElementById('calendarGroup');
const dynamicCalendar = document.getElementById('dynamicCalendar');
const timeTabs = document.getElementById('timeTabs');
const timeTabBtns = document.querySelectorAll('.time-tab-btn');
const timeSlotsGroup = document.getElementById('timeSlotsGroup');
const timeSlotsGrid = document.getElementById('timeSlotsGrid');
const bookingFecha = document.getElementById('bookingFecha');
const bookingHora = document.getElementById('bookingHora');
const bookingSummary = document.getElementById('bookingSummary');
const btnOpenBooking = document.getElementById('btnOpenBooking');
const btnBackToMenuFromBooking = document.getElementById('btnBackToMenuFromBooking');
const selectedShopNameH1 = document.getElementById('selectedShopName');

// ─── Estado local del módulo ─────────────────────────────────────────────────
let currentPeriod = 'morning';

// ─── Navegación ──────────────────────────────────────────────────────────────

btnOpenBooking.addEventListener('click', async () => {
    if (!state.selectedShopId || !state.selectedShopNit) return;
    actionMenu.classList.add('hidden');
    bookingSection.classList.remove('hidden');

    bookingBarbero.innerHTML = '<option value="" disabled selected>Cargando barberos...</option>';
    bookingServicio.innerHTML = '<option value="" disabled selected>Cargando servicios...</option>';

    try {
        const [barberos, servicios, horarios] = await Promise.all([
            CitasLib.loadBarberos(db, state.selectedShopNit),
            CitasLib.loadServicios(db, state.selectedShopId),
            CitasLib.getShopHorarios(db, state.selectedShopId)
        ]);

        state.currentBarberos = barberos;
        state.currentServicios = servicios;
        state.currentShopHorarios = horarios;

        populateSelect(bookingBarbero, barberos, b => ({ value: b.id, text: b.nombres }), 'Selecciona un barbero');
        populateSelect(bookingServicio, servicios, s => ({
            value: s.id,
            text: `${s.nombre} - $${s.precio.toLocaleString()} (${s.tiempo} min)`
        }), 'Selecciona un servicio');

        if (horarios) {
            calendarGroup.classList.remove('hidden');
            renderDynamicCalendar();
        } else {
            alert("La barbería aún no ha configurado sus horarios de atención.");
            btnBackToMenuFromBooking.click();
        }
    } catch (error) {
        alert("Error al cargar datos de la barbería.");
        btnBackToMenuFromBooking.click();
    }
});

btnBackToMenuFromBooking.addEventListener('click', () => {
    bookingSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
    bookingForm.reset();
    bookingSummary.innerHTML = '';
});

// ─── Utilidades ──────────────────────────────────────────────────────────────

/**
 * Puebla un <select> a partir de un array de objetos, usando una función mapeadora.
 */
function populateSelect(selectEl, items, mapper, placeholder) {
    selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    items.forEach(item => {
        const { value, text } = mapper(item);
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        selectEl.appendChild(opt);
    });
}

// ─── Resumen de cita ──────────────────────────────────────────────────────────

const updateSummary = () => {
    const barberoId = bookingBarbero.value;
    const servicioId = bookingServicio.value;
    const fecha = bookingFecha.value;
    const hora = bookingHora.value;

    if (!barberoId || !servicioId || !fecha || !hora) {
        bookingSummary.innerHTML = '';
        return;
    }

    const barbero = state.currentBarberos.find(b => b.id === barberoId);
    const servicio = state.currentServicios.find(s => s.id === servicioId);

    bookingSummary.innerHTML = `
        <div class="summary-card">
            <h4>Resumen de tu Cita</h4>
            <p><strong>Barbero:</strong> ${barbero.nombres}</p>
            <p><strong>Servicio:</strong> ${servicio.nombre} (${servicio.tiempo} min)</p>
            <p><strong>Precio:</strong> $${servicio.precio.toLocaleString()}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Hora:</strong> ${hora}</p>
        </div>
    `;
};

// ─── Calendario dinámico ──────────────────────────────────────────────────────

const DAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function renderDynamicCalendar() {
    dynamicCalendar.innerHTML = '';
    const startDate = new Date();

    for (let i = 0; i < 14; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        const dayName = DAY_NAMES[currentDate.getDay()];
        const isOpen = state.currentShopHorarios?.[dayName]?.abierta;

        const dayBtn = document.createElement('button');
        dayBtn.type = 'button';
        dayBtn.className = `calendar-day-btn ${isOpen ? '' : 'closed-day'}`;
        dayBtn.innerHTML = `<span>${currentDate.getDate()}/${currentDate.getMonth() + 1}</span><small>${dayName.substring(0, 3)}</small>`;

        if (isOpen) {
            dayBtn.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('selected'));
                dayBtn.classList.add('selected');
                bookingFecha.value = dateString;
                bookingHora.value = '';
                updateSummary();
                loadTimeSlots(dateString, dayName);
            });
        } else {
            dayBtn.disabled = true;
            dayBtn.title = 'Cerrado';
        }
        dynamicCalendar.appendChild(dayBtn);
    }
}

// ─── Slots de tiempo ─────────────────────────────────────────────────────────

async function loadTimeSlots(dateString, dayName) {
    const barberoId = bookingBarbero.value;
    timeSlotsGroup.classList.remove('hidden');

    if (!barberoId) {
        timeSlotsGrid.innerHTML = '<p class="error-text">Por favor selecciona un barbero primero.</p>';
        return;
    }
    if (!bookingServicio.value) {
        timeSlotsGrid.innerHTML = '<p class="error-text">Por favor selecciona un servicio primero.</p>';
        return;
    }

    timeSlotsGrid.innerHTML = '<p class="loading-text">Cargando disponibilidad...</p>';

    try {
        const appointments = await CitasLib.getBarberAppointmentsByDay(db, barberoId, dateString);
        const shopConfig = state.currentShopHorarios[dayName];

        if (!shopConfig?.abierta) {
            timeSlotsGrid.innerHTML = '<p class="error-text">La barbería está cerrada este día.</p>';
            return;
        }
        renderTimeSlotsGrid(shopConfig.inicio, shopConfig.fin, dateString, appointments);
    } catch (error) {
        console.error("Error cargando slots:", error);
        timeSlotsGrid.innerHTML = '<p class="error-text">Error al cargar horarios.</p>';
    }
}

function renderTimeSlotsGrid(startTimeStr, endTimeStr, dateString, appointments) {
    timeSlotsGrid.innerHTML = '';
    const startHour = parseInt(startTimeStr.split(':')[0]);
    const endHour = parseInt(endTimeStr.split(':')[0]);
    const isToday = new Date().toISOString().split('T')[0] === dateString;
    const currentHour = new Date().getHours();

    const servicioId = bookingServicio.value;
    const servicio = state.currentServicios.find(s => s.id === servicioId);
    const tiempoEstimado = servicio ? servicio.tiempo : 60;
    const slotsRequeridos = Math.ceil(tiempoEstimado / 60);

    // Construir set de horas ocupadas
    const occupiedSlots = new Set();
    appointments.forEach(app => {
        const h = parseInt(app.hora.split(':')[0]);
        const slots = Math.ceil((app.servicioTiempo || 60) / 60);
        for (let i = 0; i < slots; i++) occupiedSlots.add(h + i);
    });

    let slotsAdded = 0;

    for (let h = startHour; h < endHour; h++) {
        if (isToday && h <= currentHour) continue;

        let isFree = true;
        for (let i = 0; i < slotsRequeridos; i++) {
            if (occupiedSlots.has(h + i) || (h + i >= endHour)) {
                isFree = false;
                break;
            }
        }

        const timeString = `${h.toString().padStart(2, '0')}:00`;
        const slotBtn = document.createElement('button');
        slotBtn.type = 'button';
        slotBtn.className = `time-slot-btn ${isFree ? '' : 'occupied-slot'}`;
        slotBtn.textContent = timeString;

        let period = 'morning';
        if (h >= 13 && h < 18) period = 'afternoon';
        if (h >= 18) period = 'evening';
        slotBtn.dataset.period = period;

        if (isFree) {
            slotBtn.addEventListener('click', () => {
                document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                slotBtn.classList.add('selected');
                bookingHora.value = timeString;
                updateSummary();
            });
        } else {
            slotBtn.disabled = true;
            slotBtn.title = 'Agotado o el servicio no cabe antes de la siguiente cita/cierre.';
        }

        timeSlotsGrid.appendChild(slotBtn);
        slotsAdded++;
    }

    if (slotsAdded === 0) {
        timeTabs.classList.add('hidden');
        timeSlotsGrid.innerHTML = '<p class="error-text">No hay disponibilidad para el resto del día.</p>';
    } else {
        timeTabs.classList.remove('hidden');
        filterTimeSlots();
    }
}

// ─── Filtro de período (mañana / tarde / noche) ───────────────────────────────

function filterTimeSlots() {
    const slots = document.querySelectorAll('.time-slot-btn');
    let visibleCount = 0;
    slots.forEach(slot => {
        const show = slot.dataset.period === currentPeriod;
        slot.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
    });

    let msgEl = document.getElementById('noSlotsMsg');
    if (visibleCount === 0 && slots.length > 0) {
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'noSlotsMsg';
            msgEl.className = 'no-slots-msg';
            msgEl.textContent = 'No se puede reservar cita en este horario';
            timeSlotsGrid.appendChild(msgEl);
        }
        msgEl.style.display = 'block';
    } else if (msgEl) {
        msgEl.style.display = 'none';
    }
}

timeTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period;
        filterTimeSlots();
    });
});

// ─── Eventos de cambio en selects ────────────────────────────────────────────

bookingBarbero.addEventListener('change', () => {
    if (bookingFecha.value) {
        const date = new Date(bookingFecha.value + "T12:00:00");
        loadTimeSlots(bookingFecha.value, DAY_NAMES[date.getDay()]);
        bookingHora.value = '';
        updateSummary();
    }
});

bookingServicio.addEventListener('change', () => {
    if (bookingFecha.value && bookingBarbero.value) {
        const date = new Date(bookingFecha.value + "T12:00:00");
        loadTimeSlots(bookingFecha.value, DAY_NAMES[date.getDay()]);
        bookingHora.value = '';
    }
    updateSummary();
});

// ─── Submit del formulario ────────────────────────────────────────────────────

bookingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const barberoId = bookingBarbero.value;
    const servicioId = bookingServicio.value;
    const fecha = bookingFecha.value;
    const hora = bookingHora.value;

    const barbero = state.currentBarberos.find(b => b.id === barberoId);
    const servicio = state.currentServicios.find(s => s.id === servicioId);

    const citaData = {
        clienteUid: state.currentUserData.uid,
        clienteNombre: state.currentUserData.nombres,
        barberiaId: state.selectedShopId,
        barberiaNombre: selectedShopNameH1.textContent,
        barberoId: barbero.id,
        barberoNombre: barbero.nombres,
        servicioId: servicio.id,
        servicioNombre: servicio.nombre,
        servicioPrecio: servicio.precio,
        servicioTiempo: servicio.tiempo,
        fecha,
        hora,
        fechaHora: `${fecha}T${hora}`
    };

    try {
        await CitasLib.crearCita(db, citaData);
        alert("¡Cita agendada con éxito!");
        btnBackToMenuFromBooking.click();
    } catch (error) {
        alert("Hubo un error al agendar la cita. Inténtalo de nuevo.");
    }
});
