
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
export function renderBarberos(barberos, container, onDelete) {
    if (!container) return;
    
    if (barberos.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay barberos registrados.</td></tr>';
        return;
    }

    container.innerHTML = '';
    barberos.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="id-badge">${b.barberoId || 'N/A'}</span></td>
            <td>${b.nombres}</td>
            <td>${b.email}</td>
            <td><button class="delete-btn" data-id="${b.uid}">Eliminar</button></td>
        `;
        
        tr.querySelector('.delete-btn').addEventListener('click', () => onDelete(b.uid, b.nombres));
        container.appendChild(tr);
    });
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
