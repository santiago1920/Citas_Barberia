
/**
 * Lógica para la gestión de disponibilidad y supervisión de citas (Gerente)
 */
import { collection, getDocs, setDoc, doc, query, where, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/**
 * Guarda la configuración de horarios en Firestore
 */
export async function saveConfiguracion(db, shopId, horarios) {
    try {
        const configRef = doc(db, "barberias", shopId, "configuracion", "horarios");
        await setDoc(configRef, horarios);
    } catch (error) {
        console.error("Error al guardar configuración de horarios:", error);
        throw error;
    }
}

/**
 * Carga la configuración de horarios de Firestore
 */
export async function loadConfiguracion(db, shopId) {
    try {
        const configRef = doc(db, "barberias", shopId, "configuracion", "horarios");
        const docSnap = await getDoc(configRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Horario por defecto si no existe
            return {
                lunes: { abierta: true, inicio: "08:00", fin: "20:00" },
                martes: { abierta: true, inicio: "08:00", fin: "20:00" },
                miercoles: { abierta: true, inicio: "08:00", fin: "20:00" },
                jueves: { abierta: true, inicio: "08:00", fin: "20:00" },
                viernes: { abierta: true, inicio: "08:00", fin: "20:00" },
                sabado: { abierta: true, inicio: "09:00", fin: "16:00" },
                domingo: { abierta: false, inicio: "00:00", fin: "00:00" }
            };
        }
    } catch (error) {
        console.error("Error al cargar configuración de horarios:", error);
        throw error;
    }
}

/**
 * Carga todas las citas asociadas a la barbería seleccionada
 */
export async function loadCitasPorBarberia(db, shopId) {
    try {
        const citasRef = collection(db, "citas");
        const q = query(citasRef, where("barberiaId", "==", shopId));
        const querySnapshot = await getDocs(q);
        
        const citas = [];
        querySnapshot.forEach((doc) => {
            citas.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordenar por fechaHora
        return citas.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    } catch (error) {
        console.error("Error al cargar citas de la barbería:", error);
        throw error;
    }
}

/**
 * Actualiza los datos de una cita
 */
export async function updateCita(db, citaId, updates) {
    try {
        const citaRef = doc(db, "citas", citaId);
        await updateDoc(citaRef, updates);
    } catch (error) {
        console.error("Error al actualizar cita:", error);
        throw error;
    }
}

/**
 * Marca una cita como cancelada
 */
export async function cancelarCita(db, citaId) {
    try {
        const citaRef = doc(db, "citas", citaId);
        await updateDoc(citaRef, {
            estado: "cancelada"
        });
    } catch (error) {
        console.error("Error al cancelar cita:", error);
        throw error;
    }
}

/**
 * Marca una cita como hecha registrando el método de pago
 */
export async function marcarCitaHecha(db, citaId, metodoPago) {
    try {
        const citaRef = doc(db, "citas", citaId);
        await updateDoc(citaRef, {
            estado: "hecha",
            metodoPago: metodoPago
        });
    } catch (error) {
        console.error("Error al completar cita:", error);
        throw error;
    }
}

