
// Firebase SDK Modular via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Misma configuración de Firebase
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

// Estado y UI del Rol
let selectedRole = 'cliente';
const btnCliente = document.getElementById('btnCliente');
const btnGerente = document.getElementById('btnGerente');
const btnBarbero = document.getElementById('btnBarbero');

btnCliente.addEventListener('click', () => {
    selectedRole = 'cliente';
    btnCliente.classList.add('active');
    btnGerente.classList.remove('active');
    btnBarbero.classList.remove('active');
});

btnGerente.addEventListener('click', () => {
    selectedRole = 'gerente';
    btnGerente.classList.add('active');
    btnCliente.classList.remove('active');
    btnBarbero.classList.remove('active');
});

btnBarbero.addEventListener('click', () => {
    selectedRole = 'barbero';
    btnBarbero.classList.add('active');
    btnCliente.classList.remove('active');
    btnGerente.classList.remove('active');
});

// Manejador del inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    try {
        // 1. Intentar autenticar con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Consultar el rol en Firestore
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            const actualRole = userData.rol; // 'admin' o 'cliente'
            
            // Mapeo de selección vs valor en DB
            const roleMapping = {
                'cliente': 'cliente',
                'gerente': 'admin',
                'barbero': 'barbero'
            };
            const targetRole = roleMapping[selectedRole];

            if (actualRole === targetRole) {
                console.log('Inicio de sesión exitoso como:', actualRole);
                alert(`¡Bienvenido de nuevo, ${userData.nombres}! Has iniciado sesión como ${selectedRole}.`);
                
                // Redirigir según el rol
                if (actualRole === 'cliente') {
                    window.location.href = 'cliente/platform_c.html';
                }
                else if (actualRole === 'admin') {
                    window.location.href = 'gerente/platform_g.html';
                }
                else if (actualRole === 'barbero') {
                    // Por ahora solo mensaje, la plataforma del barbero se hará a futuro
                    alert(`¡Hola! Como Barbero, pronto tendrás tu propia plataforma para gestionar citas.`);
                    // window.location.href = 'barbero/platform_b.html'; 
                }
            } else {
                // El rol no coincide -> Cerrar sesión por seguridad
                await signOut(auth);
                alert(`Acceso denegado: Tu cuenta no tiene permisos de ${selectedRole}.`);
            }
        } else {
            await signOut(auth);
            alert('Error: No se encontraron datos de perfil para este usuario.');
        }

    } catch (error) {
        console.error('Error en el inicio de sesión:', error.code, error.message);
        
        switch (error.code) {
            case 'auth/invalid-credential':
                alert('Correo o contraseña incorrectos.');
                break;
            case 'auth/user-not-found':
                alert('No existe una cuenta con este correo.');
                break;
            case 'auth/wrong-password':
                alert('Contraseña incorrecta.');
                break;
            case 'auth/too-many-requests':
                alert('Demasiados intentos fallidos. Inténtalo más tarde.');
                break;
            default:
                alert('Ocurrió un error: ' + error.message);
        }
    }
});
