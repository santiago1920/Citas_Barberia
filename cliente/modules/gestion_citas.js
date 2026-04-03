/**
 * modules/gestion_citas.js
 * Responsabilidad: gestión de citas del cliente (listar, editar, cancelar).
 * La edición usa el mismo flujo de calendario + slots que booking.js.
 */
import { db } from "../firebase.config.js";
import * as CitasLib from "../citas_logic.js";
import { state } from "../platform_c.js";

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const actionMenu            = document.getElementById('actionMenu');
const manageApptsSection    = document.getElementById('manageApptsSection');
const myAppointmentsList    = document.getElementById('myAppointmentsList');
const btnManageAppointments = document.getElementById('btnManageAppointments');
const btnBackToMenuFromManage = document.getElementById('btnBackToMenuFromManage');

// Modal de edición
const modalEditAppointment  = document.getElementById('modalEditAppointment');
const editApptForm          = document.getElementById('editApptForm');
const editApptId            = document.getElementById('editApptId');
const editApptFecha         = document.getElementById('editApptFecha');   // hidden
const editApptHora          = document.getElementById('editApptHora');    // hidden
const editApptBarbero       = document.getElementById('editApptBarbero');
const editApptServicio      = document.getElementById('editApptServicio');
const btnCancelEditAppt     = document.getElementById('btnCancelEditAppt');

// Calendario y slots dentro del modal
const editDynamicCalendar   = document.getElementById('editDynamicCalendar');
const editTimeSlotsGroup    = document.getElementById('editTimeSlotsGroup');
const editTimeSlotsGrid     = document.getElementById('editTimeSlotsGrid');
const editTimeTabs          = document.getElementById('editTimeTabs');
const editTabBtns           = document.querySelectorAll('.edit-tab');
const editBookingSummary    = document.getElementById('editBookingSummary');

// ─── Estado local del módulo ──────────────────────────────────────────────────
const DAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
let editCurrentPeriod = 'morning';
let editShopHorarios = null;
let editBarberos = [];
let editServicios = [];

// ─── Navegación principal ─────────────────────────────────────────────────────

btnManageAppointments.addEventListener('click', async () => {
    if (!state.selectedShopId) return;
    actionMenu.classList.add('hidden');
    manageApptsSection.classList.remove('hidden');
    await loadMyAppointments();
});

btnBackToMenuFromManage.addEventListener('click', () => {
    manageApptsSection.classList.add('hidden');
    actionMenu.classList.remove('hidden');
});

// ─── Listar citas ─────────────────────────────────────────────────────────────

async function loadMyAppointments() {
    myAppointmentsList.innerHTML = '<p class="loading-text">Cargando tus citas...</p>';
    try {
        const citas = await CitasLib.loadClientAppointments(db, state.currentUserData.uid, state.selectedShopId);
        renderMyAppointments(citas);
    } catch (err) {
        myAppointmentsList.innerHTML = '<p class="error-text">No se pudieron cargar tus citas.</p>';
    }
}

function renderMyAppointments(citas) {
    if (citas.length === 0) {
        myAppointmentsList.innerHTML = '<p class="loading-text">No tienes citas pendientes en esta barbería.</p>';
        return;
    }
    myAppointmentsList.innerHTML = '';
    citas.forEach(cita => myAppointmentsList.appendChild(buildAppointmentCard(cita)));
}

function buildAppointmentCard(cita) {
    const card = document.createElement('div');
    card.className = 'appt-card';
    card.innerHTML = `
        <div class="appt-info">
            <p class="appt-datetime">📅 ${cita.fecha} a las ${cita.hora}</p>
            <h3>${cita.servicioNombre}</h3>
            <p>👤 Barbero: ${cita.barberoNombre}</p>
            <p>💰 Precio: $${(cita.servicioPrecio || 0).toLocaleString()}</p>
        </div>
        <div class="appt-actions">
            <button class="appt-edit-btn" data-id="${cita.id}">✏️ Editar</button>
            <button class="appt-cancel-btn" data-id="${cita.id}">✖ Cancelar</button>
        </div>
    `;
    card.querySelector('.appt-edit-btn').addEventListener('click', () => openEditModal(cita));
    card.querySelector('.appt-cancel-btn').addEventListener('click', () => handleCancelAppt(cita.id));
    return card;
}

// ─── Cancelar cita ────────────────────────────────────────────────────────────

async function handleCancelAppt(citaId) {
    if (!confirm('¿Estás seguro que deseas cancelar esta cita?')) return;
    try {
        await CitasLib.cancelCita(db, citaId);
        alert('Cita cancelada correctamente.');
        await loadMyAppointments();
    } catch (err) {
        alert('Error al cancelar la cita.');
    }
}

// ─── Abrir modal de edición ───────────────────────────────────────────────────

async function openEditModal(cita) {
    // Guardar id de la cita a editar
    editApptId.value = cita.id;
    editApptFecha.value = '';
    editApptHora.value = '';
    editBookingSummary.innerHTML = '';
    resetEditSlots();

    // Precargar barberos y servicios junto con horarios
    editApptBarbero.innerHTML = '<option value="">Cargando...</option>';
    editApptServicio.innerHTML = '<option value="">Cargando...</option>';

    const [barberos, servicios, horarios] = await Promise.all([
        CitasLib.loadBarberos(db, state.selectedShopNit),
        CitasLib.loadServicios(db, state.selectedShopId),
        CitasLib.getShopHorarios(db, state.selectedShopId)
    ]);

    editBarberos = barberos;
    editServicios = servicios;
    editShopHorarios = horarios;

    populateEditSelect(editApptBarbero, barberos, b => ({ value: b.id, text: b.nombres }), cita.barberoId);
    populateEditSelect(editApptServicio, servicios,
        s => ({ value: s.id, text: `${s.nombre} - $${s.precio.toLocaleString()} (${s.tiempo} min)` }),
        cita.servicioId
    );

    // Mostrar el calendario
    renderEditCalendar();
    modalEditAppointment.classList.remove('hidden');
}

// ─── Calendario de edición ────────────────────────────────────────────────────

function renderEditCalendar() {
    editDynamicCalendar.innerHTML = '';
    const startDate = new Date();

    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateString = d.toISOString().split('T')[0];
        const dayName = DAY_NAMES[d.getDay()];
        const isOpen = editShopHorarios?.[dayName]?.abierta;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `calendar-day-btn ${isOpen ? '' : 'closed-day'}`;
        btn.innerHTML = `<span>${d.getDate()}/${d.getMonth() + 1}</span><small>${dayName.substring(0, 3)}</small>`;

        if (isOpen) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#editDynamicCalendar .calendar-day-btn')
                    .forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                editApptFecha.value = dateString;
                editApptHora.value = '';
                updateEditSummary();
                loadEditTimeSlots(dateString, dayName);
            });
        } else {
            btn.disabled = true;
            btn.title = 'Cerrado';
        }
        editDynamicCalendar.appendChild(btn);
    }
}

// ─── Slots de tiempo de edición ───────────────────────────────────────────────

async function loadEditTimeSlots(dateString, dayName) {
    const barberoId = editApptBarbero.value;
    editTimeSlotsGroup.style.display = 'block';

    if (!barberoId) {
        editTimeSlotsGrid.innerHTML = '<p class="error-text">Selecciona un barbero primero.</p>';
        return;
    }
    if (!editApptServicio.value) {
        editTimeSlotsGrid.innerHTML = '<p class="error-text">Selecciona un servicio primero.</p>';
        return;
    }

    editTimeSlotsGrid.innerHTML = '<p class="loading-text">Cargando disponibilidad...</p>';

    try {
        const appointments = await CitasLib.getBarberAppointmentsByDay(db, barberoId, dateString);
        const shopConfig = editShopHorarios[dayName];

        if (!shopConfig?.abierta) {
            editTimeSlotsGrid.innerHTML = '<p class="error-text">La barbería está cerrada este día.</p>';
            return;
        }
        renderEditSlotsGrid(shopConfig.inicio, shopConfig.fin, dateString, appointments);
    } catch (err) {
        console.error("Error cargando slots de edición:", err);
        editTimeSlotsGrid.innerHTML = '<p class="error-text">Error al cargar horarios.</p>';
    }
}

function renderEditSlotsGrid(startStr, endStr, dateString, appointments) {
    editTimeSlotsGrid.innerHTML = '';
    const startHour = parseInt(startStr.split(':')[0]);
    const endHour   = parseInt(endStr.split(':')[0]);
    const isToday   = new Date().toISOString().split('T')[0] === dateString;
    const nowHour   = new Date().getHours();

    const servicioId = editApptServicio.value;
    const servicio   = editServicios.find(s => s.id === servicioId);
    const slotsReq   = Math.ceil((servicio?.tiempo || 60) / 60);

    const occupied = new Set();
    appointments.forEach(app => {
        const h = parseInt(app.hora.split(':')[0]);
        const slots = Math.ceil((app.servicioTiempo || 60) / 60);
        for (let i = 0; i < slots; i++) occupied.add(h + i);
    });

    let added = 0;
    for (let h = startHour; h < endHour; h++) {
        if (isToday && h <= nowHour) continue;

        let free = true;
        for (let i = 0; i < slotsReq; i++) {
            if (occupied.has(h + i) || (h + i >= endHour)) { free = false; break; }
        }

        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const slotBtn = document.createElement('button');
        slotBtn.type = 'button';
        slotBtn.className = `time-slot-btn ${free ? '' : 'occupied-slot'}`;
        slotBtn.textContent = timeStr;

        let period = 'morning';
        if (h >= 13 && h < 18) period = 'afternoon';
        if (h >= 18) period = 'evening';
        slotBtn.dataset.period = period;

        if (free) {
            slotBtn.addEventListener('click', () => {
                document.querySelectorAll('#editTimeSlotsGrid .time-slot-btn')
                    .forEach(b => b.classList.remove('selected'));
                slotBtn.classList.add('selected');
                editApptHora.value = timeStr;
                updateEditSummary();
            });
        } else {
            slotBtn.disabled = true;
            slotBtn.title = 'Ocupado o no cabe el servicio.';
        }
        editTimeSlotsGrid.appendChild(slotBtn);
        added++;
    }

    if (added === 0) {
        editTimeTabs.style.display = 'none';
        editTimeSlotsGrid.innerHTML = '<p class="error-text">No hay disponibilidad para este día.</p>';
    } else {
        editTimeTabs.style.display = 'flex';
        filterEditSlots();
    }
}

// ─── Filtro de período ────────────────────────────────────────────────────────

function filterEditSlots() {
    const slots = editTimeSlotsGrid.querySelectorAll('.time-slot-btn');
    let visible = 0;
    slots.forEach(s => {
        const show = s.dataset.period === editCurrentPeriod;
        s.style.display = show ? 'block' : 'none';
        if (show) visible++;
    });
    let msgEl = document.getElementById('editNoSlotsMsg');
    if (visible === 0 && slots.length > 0) {
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'editNoSlotsMsg';
            msgEl.className = 'no-slots-msg';
            msgEl.textContent = 'No se puede reservar cita en este horario';
            editTimeSlotsGrid.appendChild(msgEl);
        }
        msgEl.style.display = 'block';
    } else if (msgEl) {
        msgEl.style.display = 'none';
    }
}

editTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        editTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editCurrentPeriod = btn.dataset.period;
        filterEditSlots();
    });
});

// ─── Recargar slots al cambiar barbero o servicio ─────────────────────────────

editApptBarbero.addEventListener('change', () => {
    if (editApptFecha.value) {
        const date = new Date(editApptFecha.value + "T12:00:00");
        editApptHora.value = '';
        updateEditSummary();
        loadEditTimeSlots(editApptFecha.value, DAY_NAMES[date.getDay()]);
    }
});

editApptServicio.addEventListener('change', () => {
    if (editApptFecha.value && editApptBarbero.value) {
        const date = new Date(editApptFecha.value + "T12:00:00");
        editApptHora.value = '';
        loadEditTimeSlots(editApptFecha.value, DAY_NAMES[date.getDay()]);
    }
    updateEditSummary();
});

// ─── Resumen de cita ──────────────────────────────────────────────────────────

function updateEditSummary() {
    const barberoId  = editApptBarbero.value;
    const servicioId = editApptServicio.value;
    const fecha      = editApptFecha.value;
    const hora       = editApptHora.value;

    if (!barberoId || !servicioId || !fecha || !hora) {
        editBookingSummary.innerHTML = '';
        return;
    }
    const barbero  = editBarberos.find(b => b.id === barberoId);
    const servicio = editServicios.find(s => s.id === servicioId);

    editBookingSummary.innerHTML = `
        <div class="summary-card">
            <h4>Nueva Configuración de Cita</h4>
            <p><strong>Barbero:</strong> ${barbero?.nombres}</p>
            <p><strong>Servicio:</strong> ${servicio?.nombre} (${servicio?.tiempo} min)</p>
            <p><strong>Precio:</strong> $${servicio?.precio?.toLocaleString()}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Hora:</strong> ${hora}</p>
        </div>
    `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetEditSlots() {
    editTimeSlotsGroup.style.display = 'none';
    editTimeSlotsGrid.innerHTML = '';
    editTimeTabs.style.display = 'none';
    editCurrentPeriod = 'morning';
    editTabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.period === 'morning');
    });
}

function populateEditSelect(selectEl, items, mapper, selectedValue) {
    selectEl.innerHTML = '';
    items.forEach(item => {
        const { value, text } = mapper(item);
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        opt.selected = value === selectedValue;
        selectEl.appendChild(opt);
    });
}

// ─── Cerrar modal ─────────────────────────────────────────────────────────────

btnCancelEditAppt.addEventListener('click', () => {
    modalEditAppointment.classList.add('hidden');
});

// ─── Submit: guardar cambios ──────────────────────────────────────────────────

editApptForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fecha = editApptFecha.value;
    const hora  = editApptHora.value;

    if (!fecha) { alert('Por favor selecciona una fecha.'); return; }
    if (!hora)  { alert('Por favor selecciona una hora.'); return; }

    const barberoId  = editApptBarbero.value;
    const servicioId = editApptServicio.value;
    const barbero    = editBarberos.find(b => b.id === barberoId);
    const servicio   = editServicios.find(s => s.id === servicioId);

    const updatedData = {
        barberoId,
        barberoNombre:   barbero?.nombres || '',
        servicioId,
        servicioNombre:  servicio?.nombre || '',
        servicioPrecio:  servicio?.precio || 0,
        servicioTiempo:  servicio?.tiempo || 0,
        fecha,
        hora
    };

    try {
        await CitasLib.updateCita(db, editApptId.value, updatedData);
        alert('¡Cita actualizada con éxito!');
        modalEditAppointment.classList.add('hidden');
        await loadMyAppointments();
    } catch (err) {
        alert('Error al actualizar la cita.');
    }
});
