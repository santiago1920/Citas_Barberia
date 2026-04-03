
// Firebase SDK Modular (v10.x+) vía CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de tu proyecto Firebase (proporcionada por el usuario)
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
let currentRole = 'cliente';
const btnCliente = document.getElementById('btnCliente');
const btnGerente = document.getElementById('btnGerente');
const empresaContainer = document.getElementById('empresaContainer');
const nombreEmpresaInput = document.getElementById('nombreEmpresa');
const nitInput = document.getElementById('nit');

btnCliente.addEventListener('click', () => {
    currentRole = 'cliente';
    btnCliente.classList.add('active');
    btnGerente.classList.remove('active');
    empresaContainer.classList.add('hidden');
    nombreEmpresaInput.removeAttribute('required');
    nitInput.removeAttribute('required');
});

btnGerente.addEventListener('click', () => {
    currentRole = 'gerente';
    btnGerente.classList.add('active');
    btnCliente.classList.remove('active');
    empresaContainer.classList.remove('hidden');
    nombreEmpresaInput.setAttribute('required', '');
    nitInput.setAttribute('required', '');
});

// Manejador del envío del formulario
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const nombres = document.getElementById('nombres').value;
    const apellidos = document.getElementById('apellidos').value;
    const nombreEmpresa = document.getElementById('nombreEmpresa').value;
    const nit = document.getElementById('nit').value;

    // Validación básica local
    if (!email || !password || !nombres || !apellidos) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    if (currentRole === 'gerente' && (!nombreEmpresa || !nit)) {
        alert('Por favor, ingresa el nombre y NIT de tu empresa.');
        return;
    }

    if (confirmPassword && password !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    try {
        // Si es gerente, verificar si la barbería ya existe (Nombre o NIT)
        if (currentRole === 'gerente') {
            const barberiasRef = collection(db, "barberias");
            
            // Check by NIT
            const qNit = query(barberiasRef, where("nit", "==", nit));
            const nitSnapshot = await getDocs(qNit);
            if (!nitSnapshot.empty) {
                alert('Ya existe una barbería con este NIT.');
                return;
            }

            // Check by Name
            const qNombre = query(barberiasRef, where("nombre", "==", nombreEmpresa));
            const nameSnapshot = await getDocs(qNombre);
            if (!nameSnapshot.empty) {
                alert('Ya existe una barbería con este nombre.');
                return;
            }
        }
        // Registrar usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Guardar metadata en Firestore
        const userData = {
            nombres: nombres,
            apellidos: apellidos,
            email: email,
            rol: currentRole === 'gerente' ? 'admin' : 'cliente',
            fechaRegistro: new Date().toISOString()
        };

        if (currentRole === 'gerente') {
            userData.nombreEmpresa = nombreEmpresa;
            userData.nit = nit;
        }

        // 1. Guardar perfil de usuario
        await setDoc(doc(db, "usuarios", user.uid), userData);

        // 2. Si es gerente, crear registro en la colección 'barberias'
        if (currentRole === 'gerente') {
            await setDoc(doc(db, "barberias", user.uid), {
                nombre: nombreEmpresa,
                nit: nit,
                gerenteUid: user.uid,
                fechaCreacion: new Date().toISOString()
            });
        }

        console.log('Registro exitoso en Auth y Firestore:', user.uid);
        alert('¡Bienvenido! Cuenta creada con éxito como ' + (currentRole === 'gerente' ? 'Gerente (Admin)' : 'Cliente'));
        
        // Aquí podrías redirigir al usuario, por ejemplo:
        // window.location.href = 'index.html';

    } catch (error) {
        console.error('Error en el registro:', error.code, error.message);
        
        // Manejo de errores amigable
        switch (error.code) {
            case 'auth/email-already-in-use':
                alert('Este correo ya está registrado.');
                break;
            case 'auth/invalid-email':
                alert('El correo electrónico no es válido.');
                break;
            case 'auth/weak-password':
                alert('La contraseña debe tener al menos 6 caracteres.');
                break;
            case 'auth/operation-not-allowed':
                alert('El registro por correo/contraseña no está habilitado en Firebase.');
                break;
            default:
                alert('Ocurrió un error inesperado: ' + error.message);
        }
    }
});
