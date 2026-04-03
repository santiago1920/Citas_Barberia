import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Carga todos los datos históricos (citas terminadas/canceladas y pagos directos)
 * @param {*} db 
 * @param {string} managerId - UID del gerente (usado para citas)
 * @param {string} shopNit - NIT de la barbería (usado para pagos directos)
 */
export async function loadFullHistory(db, managerId, shopNit) {
    if (!managerId) return [];
    
    try {
        const citasRef = collection(db, "citas");
        const pagosRef = collection(db, "pagos");
        
        // 1. Cargar Citas por UID del gerente (así las guarda la plataforma del cliente)
        const qCitas = query(citasRef, where("barberiaId", "==", managerId));
        const citasSnap = await getDocs(qCitas);
        const citasData = [];
        
        citasSnap.forEach(doc => {
            const data = doc.data();
            if (data.estado !== "programada") {
                citasData.push({
                    id: doc.id,
                    tipo: "cita",
                    fechaOriginal: data.fecha,
                    fechaEfectiva: data.estado === "hecha" ? (data.fechaPago || data.fecha) : data.fecha,
                    clienteNombre: data.clienteNombre,
                    barberoId: data.barberoId,
                    barberoNombre: data.barberoNombre,
                    servicioNombre: data.servicioNombre,
                    monto: data.precioCobrado || data.servicioPrecio || 0,
                    estado: data.estado,
                    metodoPago: data.metodoPago || "N/A",
                    nota: data.nota || ""
                });
            }
        });

        // 2. Cargar Pagos Directos por NIT o UID del gerente
        const pagosQuery = shopNit
            ? query(pagosRef, where("barberiaId", "==", shopNit))
            : query(pagosRef, where("barberiaId", "==", managerId));
        const pagosSnap = await getDocs(pagosQuery);
        const pagosData = [];
        
        pagosSnap.forEach(doc => {
            const data = doc.data();
            pagosData.push({
                id: doc.id,
                tipo: "directo",
                fechaOriginal: "-",
                fechaEfectiva: data.fechaPago,
                clienteNombre: data.clienteNombre,
                barberoId: data.barberoId,
                barberoNombre: data.barberoNombre,
                servicioNombre: data.servicioNombre,
                monto: data.montoTotal || 0,
                estado: "hecha",
                metodoPago: data.metodoPago || "N/A",
                nota: data.nota || ""
            });
        });

        // Combinar y ordenar descendentemente por fecha efectiva
        const combined = [...citasData, ...pagosData];
        return combined.sort((a, b) => b.fechaEfectiva.localeCompare(a.fechaEfectiva));
        
    } catch (error) {
        console.error("Error al cargar historial completo:", error);
        throw error;
    }
}

/**
 * Aplica filtros al conjunto de datos cargado
 */
export function applyFilters(data, filters) {
    return data.filter(item => {
        // Filtro por Cliente (Nombre)
        if (filters.cliente && !item.clienteNombre.toLowerCase().includes(filters.cliente.toLowerCase())) {
            return false;
        }
        
        // Filtro por Barbero
        if (filters.barbero && item.barberoId !== filters.barbero) {
            return false;
        }
        
        // Filtro por Tipo/Estado
        if (filters.estado && filters.estado !== "todos") {
            if (item.estado !== filters.estado) return false;
        }
        
        // Filtro por Rango de Fechas
        if (filters.fechaInicio || filters.fechaFin) {
            const itemDate = item.fechaEfectiva.split('T')[0];
            if (filters.fechaInicio && itemDate < filters.fechaInicio) return false;
            if (filters.fechaFin && itemDate > filters.fechaFin) return false;
        }
        
        return true;
    });
}
