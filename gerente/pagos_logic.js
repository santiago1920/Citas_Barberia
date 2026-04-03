import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Carga las citas programadas (pendientes de pago) para hoy (y anteriores) de una barbería.
 */
export async function loadPendingAppointments(db, shopId) {
    if (!shopId) return [];
    
    try {
        const citasRef = collection(db, "citas");
        const q = query(citasRef, 
                        where("barberiaId", "==", shopId),
                        where("estado", "==", "programada"));
        const querySnapshot = await getDocs(q);
        
        const citas = [];
        querySnapshot.forEach((doc) => {
            citas.push({ id: doc.id, ...doc.data() });
        });
        
        // Normalmente filtraríamos por fecha, pero por seguridad listamos todas las programadas (para cobrar atrasadas).
        // Ordenamos por fecha y hora
        return citas.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    } catch (error) {
        console.error("Error al cargar citas pendientes:", error);
        throw error;
    }
}

/**
 * Procesa el pago de una cita existente
 */
export async function processAppointmentPayment(db, citaId, paymentData) {
    try {
        const citaRef = doc(db, "citas", citaId);
        await updateDoc(citaRef, {
            estado: "hecha",
            precioCobrado: paymentData.monto,
            metodoPago: paymentData.metodoPago,
            notaPago: paymentData.nota,
            fechaPago: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al cobrar la cita:", error);
        throw error;
    }
}

/**
 * Busca clientes en la colección usuarios
 */
export async function searchClients(db, queryText) {
    if (!queryText || queryText.length < 2) return [];
    
    try {
        // En Firestore buscar texto libre complejo es difícil sin Algolia,
        // Haremos una búsqueda simple en memoria de los clientes para este MVP.
        const q = query(collection(db, "usuarios"), where("rol", "==", "cliente"));
        const querySnapshot = await getDocs(q);
        
        const clients = [];
        const lowerQuery = queryText.toLowerCase();
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const nombre = (data.nombres || "").toLowerCase();
            const email = (data.email || "").toLowerCase();
            
            if (nombre.includes(lowerQuery) || email.includes(lowerQuery)) {
                clients.push({ uid: doc.id, ...data });
            }
        });
        
        return clients;
    } catch (error) {
        console.error("Error al buscar clientes:", error);
        throw error;
    }
}

/**
 * Registra una venta/pago directo sin cita
 */
export async function registerDirectPayment(db, shopId, paymentData) {
    try {
        const pagosRef = collection(db, "pagos");
        const docRef = await addDoc(pagosRef, {
            barberiaId: shopId,
            ...paymentData,
            tipo: "directo",
            fechaPago: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error al registrar pago directo:", error);
        throw error;
    }
}
