
/**
 * Lógica para la gestión de citas desde el lado del cliente
 */
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Carga los servicios asociados a la barbería actual
 */
export async function loadServicios(db, shopId) {
    if (!shopId) return [];
    
    try {
        const serviciosRef = collection(db, "barberias", shopId, "servicios");
        const querySnapshot = await getDocs(serviciosRef);
        
        const servicios = [];
        querySnapshot.forEach((doc) => {
            servicios.push({ id: doc.id, ...doc.data() });
        });
        
        return servicios;
    } catch (error) {
        console.error("Error al cargar servicios:", error);
        throw error;
    }
}

/**
 * Carga los barberos asociados a una barbería (por NIT)
 */
export async function loadBarberos(db, shopNit) {
    if (!shopNit) return [];
    
    try {
        const q = query(collection(db, "usuarios"), 
                        where("rol", "==", "barbero"), 
                        where("nit", "==", shopNit));
        const querySnapshot = await getDocs(q);
        
        const barberos = [];
        querySnapshot.forEach((doc) => {
            barberos.push({ id: doc.id, ...doc.data() });
        });
        
        return barberos;
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        throw error;
    }
}

/**
 * Crea una nueva cita en la colección 'citas'
 */
export async function crearCita(db, citaData) {
    try {
        const citasRef = collection(db, "citas");
        const docRef = await addDoc(citasRef, {
            ...citaData,
            estado: "programada",
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error al crear la cita:", error);
        throw error;
    }
}

/**
 * Carga las citas programadas de un cliente en una barbería
 */
export async function loadClientAppointments(db, clienteUid, barberiaId) {
    if (!clienteUid || !barberiaId) return [];
    try {
        const q = query(
            collection(db, "citas"),
            where("clienteUid", "==", clienteUid),
            where("barberiaId", "==", barberiaId),
            where("estado", "==", "programada")
        );
        const snap = await getDocs(q);
        const citas = [];
        snap.forEach(d => citas.push({ id: d.id, ...d.data() }));
        // Ordenar por fecha/hora ascendente
        return citas.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    } catch (error) {
        console.error("Error al cargar citas del cliente:", error);
        throw error;
    }
}

/**
 * Cancela una cita del cliente
 */
export async function cancelCita(db, citaId) {
    try {
        await updateDoc(doc(db, "citas", citaId), {
            estado: "cancelada",
            fechaCancelacion: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al cancelar cita:", error);
        throw error;
    }
}

/**
 * Actualiza una cita existente del cliente
 */
export async function updateCita(db, citaId, updatedData) {
    try {
        await updateDoc(doc(db, "citas", citaId), {
            ...updatedData,
            fechaHora: `${updatedData.fecha}T${updatedData.hora}`
        });
    } catch (error) {
        console.error("Error al actualizar cita:", error);
        throw error;
    }
}

/**
 * Obtiene los horarios de la barbería
 */
export async function getShopHorarios(db, shopId) {
    if (!shopId) return null;
    
    try {
        const configRef = doc(db, "barberias", shopId, "configuracion", "horarios");
        const docSnap = await getDoc(configRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
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
        console.error("Error al cargar horarios de la barbería:", error);
        throw error;
    }
}

/**
 * Obtiene las citas de un barbero para una fecha específica
 */
export async function getBarberAppointmentsByDay(db, barberoId, fecha) {
    if (!barberoId || !fecha) return [];
    
    try {
        const citasRef = collection(db, "citas");
        const q = query(citasRef, 
                        where("barberoId", "==", barberoId),
                        where("fecha", "==", fecha));
        const querySnapshot = await getDocs(q);
        
        const citas = [];
        querySnapshot.forEach((doc) => {
            citas.push({ id: doc.id, ...doc.data() });
        });
        
        return citas;
    } catch (error) {
        console.error("Error al cargar citas del barbero:", error);
        throw error;
    }
}

/**
 * Verifica si el cliente tiene al menos una cita 'hecha' con el barbero
 * o un pago directo registrado.
 */
export async function canClientReviewBarber(db, clienteUid, barberoId) {
    if (!clienteUid || !barberoId) return false;
    
    try {
        // 1. Revisar citas programadas marcadas como hechas
        const citasRef = collection(db, "citas");
        const qCitas = query(citasRef, 
                        where("clienteUid", "==", clienteUid), 
                        where("barberoId", "==", barberoId), 
                        where("estado", "==", "hecha"));
        const snapshotCitas = await getDocs(qCitas);
        
        if (!snapshotCitas.empty) return true;

        // 2. Revisar si tuvo un servicio de venta directa/pago
        const pagosRef = collection(db, "pagos");
        const qPagos = query(pagosRef,
                        where("clienteId", "==", clienteUid),
                        where("barberoId", "==", barberoId));
        const snapshotPagos = await getDocs(qPagos);
        
        return !snapshotPagos.empty;

    } catch (error) {
        console.error("Error al verificar elegibilidad de reseña:", error);
        return false;
    }
}

/**
 * Guarda una nueva reseña en la colección 'resenas'
 */
export async function submitBarberReview(db, reviewData) {
    try {
        const resenasRef = collection(db, "resenas");
        const docRef = await addDoc(resenasRef, {
            ...reviewData,
            fecha: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error al enviar reseña:", error);
        throw error;
    }
}

/**
 * Obtiene todas las reseñas de un barbero
 */
export async function getBarberReviews(db, barberoId) {
    if (!barberoId) return [];
    try {
        const q = query(collection(db, "resenas"), where("barberoId", "==", barberoId));
        const querySnapshot = await getDocs(q);
        const resenas = [];
        querySnapshot.forEach(doc => {
            resenas.push({ id: doc.id, ...doc.data() });
        });
        return resenas;
    } catch (error) {
        console.error("Error al obtener reseñas del barbero:", error);
        return [];
    }
}

/**
 * Obtiene la reseña previa del usuario para un barbero específico
 */
export async function getUserReviewForBarber(db, clienteUid, barberoId) {
    if (!clienteUid || !barberoId) return null;
    try {
        const q = query(collection(db, "resenas"), 
            where("clienteUid", "==", clienteUid), 
            where("barberoId", "==", barberoId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            return { id: docData.id, ...docData.data() };
        }
        return null;
    } catch (error) {
        console.error("Error al verificar reseña existente:", error);
        return null;
    }
}

/**
 * Actualiza una reseña existente
 */
export async function updateBarberReview(db, reviewId, data) {
    try {
        const reviewRef = doc(db, "resenas", reviewId);
        await updateDoc(reviewRef, {
            ...data,
            fechaEditada: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al actualizar la reseña:", error);
        throw error;
    }
}


