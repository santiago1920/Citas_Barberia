
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
 * Renderiza la lista de servicios en la tabla
 */
export function renderServicios(servicios, container, onDelete, onEdit) {
    if (!container) return;
    
    if (servicios.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay servicios registrados.</td></tr>';
        return;
    }

    container.innerHTML = '';
    servicios.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.nombre}</td>
            <td>$${s.precio.toLocaleString()}</td>
            <td>${s.tiempo} min</td>
            <td class="actions-td">
                <button class="edit-btn" data-id="${s.id}">Editar</button>
                <button class="delete-btn" data-id="${s.id}">Eliminar</button>
            </td>
        `;
        
        tr.querySelector('.edit-btn').addEventListener('click', () => onEdit(s));
        tr.querySelector('.delete-btn').addEventListener('click', () => onDelete(s.id, s.nombre));
        container.appendChild(tr);
    });
}

/**
 * Agrega un nuevo servicio a la barbería en Firestore
 */
export async function addServicio(db, shopId, serviceData) {
    try {
        const serviciosRef = collection(db, "barberias", shopId, "servicios");
        
        // Verificación de duplicados por nombre
        const q = query(serviciosRef, where("nombre", "==", serviceData.nombre));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            throw new Error(`Ya existe un servicio con el nombre "${serviceData.nombre}".`);
        }

        const docRef = await addDoc(serviciosRef, {
            nombre: serviceData.nombre,
            precio: parseFloat(serviceData.precio),
            tiempo: parseInt(serviceData.tiempo),
            fechaRegistro: new Date().toISOString()
        });
        return { id: docRef.id, ...serviceData };
    } catch (error) {
        console.error("Error al agregar servicio:", error);
        throw error;
    }
}

/**
 * Actualiza un servicio existente en Firestore
 */
export async function updateServicio(db, shopId, serviceId, updatedData) {
    try {
        const serviciosRef = collection(db, "barberias", shopId, "servicios");
        
        // Verificación de duplicados por nombre (excluyendo el actual)
        const q = query(serviciosRef, where("nombre", "==", updatedData.nombre));
        const querySnapshot = await getDocs(q);
        
        const duplicate = querySnapshot.docs.find(doc => doc.id !== serviceId);
        if (duplicate) {
            throw new Error(`Ya existe otro servicio con el nombre "${updatedData.nombre}".`);
        }

        const docRef = doc(db, "barberias", shopId, "servicios", serviceId);
        await updateDoc(docRef, {
            nombre: updatedData.nombre,
            precio: parseFloat(updatedData.precio),
            tiempo: parseInt(updatedData.tiempo),
            fechaUltimaEdicion: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al actualizar servicio:", error);
        throw error;
    }
}

/**
 * Elimina un servicio de Firestore
 */
export async function deleteServicio(db, shopId, serviceId) {
    try {
        const docRef = doc(db, "barberias", shopId, "servicios", serviceId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error al eliminar servicio:", error);
        throw error;
    }
}
