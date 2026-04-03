
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * Carga los barberos asociados al NIT de la barbería actual
 */
export async function loadBarberos(db, currentShop) {
    if (!currentShop) return [];
    
    try {
        const q = query(collection(db, "usuarios"), 
                        where("rol", "==", "barbero"), 
                        where("nit", "==", currentShop.nit));
        const querySnapshot = await getDocs(q);
        
        const barberos = [];
        querySnapshot.forEach((doc) => {
            barberos.push({ uid: doc.id, ...doc.data() });
        });
        
        // Ordenar por ID para visualización
        return barberos.sort((a, b) => (a.barberoId || 0) - (b.barberoId || 0));
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        throw error;
    }
}

/**
 * Renderiza la lista de barberos en la tabla
 */
export async function renderBarberos(db, barberos, container, onDelete, onViewReviews) {
    if (!container) return;
    
    if (barberos.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay barberos registrados.</td></tr>';
        return;
    }

    container.innerHTML = '';
    for (const b of barberos) {
        // Obtenemos reseñas
        const reseñas = await getBarberReviews(db, b.uid);
        let rating = 0;
        let averageText = "Sin reseñas";
        if (reseñas.length > 0) {
            const sum = reseñas.reduce((acc, curr) => acc + curr.calificacion, 0);
            rating = sum / reseñas.length;
            averageText = `${rating.toFixed(1)} ★ (${reseñas.length})`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="id-badge">${b.barberoId || 'N/A'}</span></td>
            <td>${b.nombres}</td>
            <td>${b.email}</td>
            <td>${b.passOriginal || '<em>N/A</em>'}</td>
            <td><strong>${averageText}</strong></td>
            <td>
                <button class="edit-btn update-barber-btn" data-id="${b.uid}">Editar</button>
                <button class="edit-btn view-reviews-btn" data-id="${b.uid}">Ver Reseñas</button>
                <button class="delete-btn" data-id="${b.uid}">Eliminar</button>
            </td>
        `;
        
        tr.querySelector('.delete-btn').addEventListener('click', () => onDelete(b.uid, b.nombres));
        if (onViewReviews) {
            tr.querySelector('.view-reviews-btn').addEventListener('click', () => onViewReviews(b.uid, b.nombres, reseñas));
        }
        tr.querySelector('.update-barber-btn').addEventListener('click', () => {
            // Se puede disparar un evento global o añadir otro callback, pero para simplicar 
            // llamaremos al global si se pasa o usamos el DOM. Usaremos un custom event o un modo global.
            // Para no romper la firma de renderBarberos, despacharemos un CustomEvent sobre la tabla.
            container.dispatchEvent(new CustomEvent('editBarbero', { detail: b }));
        });
        
        container.appendChild(tr);
    }
}

/**
 * Calcula la siguiente ID disponible para un nuevo barbero
 */
export function getNextAvailableId(barberos) {
    const existingIds = barberos.map(b => parseInt(b.barberoId)).filter(id => !isNaN(id)).sort((a, b) => a - b);
    
    let nextId = 1;
    for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] === nextId) {
            nextId++;
        } else if (existingIds[i] > nextId) {
            break;
        }
    }
    return nextId;
}

/**
 * Crea un nuevo barbero en Auth y Firestore
 */
export async function createBarbero(secondaryAuth, db, currentShop, barberData, nextId) {
    const { email, pass, nombre } = barberData;

    try {
        // VERIFICACIÓN GLOBAL
        const qEmail = query(collection(db, "usuarios"), where("email", "==", email));
        const emailSnap = await getDocs(qEmail);
        
        if (!emailSnap.empty) {
            throw new Error("Este correo ya está registrado en el sistema.");
        }

        // Crear en Auth secundaria
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        const newBarber = userCredential.user;
        
        // Guardar en Firestore
        await setDoc(doc(db, "usuarios", newBarber.uid), {
            nombres: nombre,
            email: email,
            rol: 'barbero',
            nit: currentShop.nit,
            passOriginal: pass,
            barberoId: nextId,
            fechaRegistro: new Date().toISOString()
        });

        // Limpiar sesión secundaria
        await signOut(secondaryAuth);
        
        return { uid: newBarber.uid, nombre, email, barberoId: nextId };
    } catch (error) {
        console.error("Error al crear barbero:", error);
        throw error;
    }
}

/**
 * Elimina un barbero de Firestore
 */
export async function deleteBarbero(db, uid) {
    try {
        await deleteDoc(doc(db, "usuarios", uid));
    } catch (error) {
        console.error("Error al eliminar barbero:", error);
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
// Sort descending by date
        return resenas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    } catch (error) {
        console.error("Error al obtener reseñas del barbero:", error);
        return [];
    }
}

/**
 * Actualiza los datos editables del barbero en Firestore sin modificar Auth
 */
export async function updateBarberoLocally(db, uid, data) {
    try {
        const barberoRef = doc(db, "usuarios", uid);
        await setDoc(barberoRef, data, { merge: true });
    } catch (error) {
        console.error("Error actualizando barbero:", error);
        throw error;
    }
}
