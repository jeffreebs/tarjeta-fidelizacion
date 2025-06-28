// Importar funciones de Firebase
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Variables Globales ---
const SPOTS_COUNT = 5;
const spotsContainer = document.querySelector('.spots-container');
const emailGate = document.getElementById('emailGate');
const loyaltyCard = document.querySelector('.loyalty-card');
const userEmailInput = document.getElementById('userEmail');
const emailError = document.getElementById('emailError');
const continueButton = document.querySelector('#emailGate button');

let currentUser = {
    id: null, // El ID del documento en Firestore
    email: null,
    progreso: Array(SPOTS_COUNT).fill(false),
    ultimaRaspada: null
};

// --- Lógica Principal ---

/**
 * Función que se ejecuta al hacer clic en "Continuar"
 */
async function handleLogin() {
    const email = userEmailInput.value.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email)) {
        emailError.textContent = "Por favor, ingresa un correo válido.";
        return;
    }
    emailError.textContent = "";
    continueButton.disabled = true;
    continueButton.textContent = "Verificando...";

    try {
        // Correcto: Buscar un documento DONDE el campo 'correo' sea igual al email ingresado
        const q = query(collection(db, "clientes"), where("correo", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // -- CASO 1: Usuario Nuevo --
            console.log("Usuario nuevo. Creando registro...");
            const newDocRef = doc(collection(db, "clientes")); // Crea referencia con ID automático
            
            currentUser = {
                id: newDocRef.id,
                email: email,
                progreso: Array(SPOTS_COUNT).fill(false),
                ultimaRaspada: null
            };

            // Guardamos el nuevo usuario en la base de datos
            await setDoc(newDocRef, { 
                correo: currentUser.email,
                progreso: currentUser.progreso,
                ultimaRaspada: currentUser.ultimaRaspada
            });
            
        } else {
            // -- CASO 2: Usuario Existente --
            console.log("Usuario existente. Cargando datos...");
            const docSnap = querySnapshot.docs[0]; // Tomamos el primer resultado
            const data = docSnap.data();

            currentUser = {
                id: docSnap.id,
                email: data.correo,
                progreso: data.progreso || Array(SPOTS_COUNT).fill(false),
                ultimaRaspada: data.ultimaRaspada || null
            };
        }
        
        // Una vez tenemos los datos, mostramos la tarjeta
        showLoyaltyCard();

    } catch (error) {
        console.error("Error al interactuar con Firestore: ", error);
        emailError.textContent = "Ocurrió un error. Inténtalo de nuevo.";
        continueButton.disabled = false;
        continueButton.textContent = "Continuar";
    }
}

/**
 * Muestra la tarjeta de fidelización y la inicializa
 */
function showLoyaltyCard() {
    emailGate.style.display = "none";
    loyaltyCard.style.display = "block";
    initCard();
}

/**
 * Inicializa y renderiza los spots de la tarjeta
 */
function initCard() {
    spotsContainer.innerHTML = ""; // Limpiar antes de renderizar
    const hoy = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
    const yaRaspoHoy = currentUser.ultimaRaspada === hoy;

    if (yaRaspoHoy) {
        alert("Ya has participado hoy. ¡Vuelve mañana!");
    }

    for (let i = 0; i < SPOTS_COUNT; i++) {
        const spot = document.createElement('div');
        spot.className = 'scratch-spot';

        // ... (código para crear el SVG y el canvas, sin cambios)
        const prize = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        prize.setAttribute('class', 'spot-prize');
        prize.setAttribute('viewBox', '0 0 100 100');
        prize.innerHTML = `<polyline points="20 60 40 80 80 30" fill="none" />`;
        const canvas = document.createElement('canvas');
        spot.appendChild(prize);
        spot.appendChild(canvas);
        spotsContainer.appendChild(spot);

        if (currentUser.progreso[i]) {
            spot.classList.add('is-scratched');
        } else if (!yaRaspoHoy) {
            setupScratchableSpot(spot, i);
        } else {
             // Bloquear si ya raspó hoy
            spot.style.pointerEvents = "none";
            spot.querySelector('canvas').style.backgroundColor = "#888"; // Indicar visualmente que está bloqueado
        }
    }
}

/**
 * Configura un spot para que pueda ser raspado
 */
function setupScratchableSpot(spotElement, index) {
    // ... (Tu código de canvas para raspar es bueno, lo movemos aquí)
    // Se puede copiar y pegar la mayor parte de tu función `setupSpot` original.
    // La clave es que al revelar, llamamos a revealSpot.
    const canvas = spotElement.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let isDrawing = false;
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    
    function getEventLocation(e) { return e.touches?.[0] || e; }
    
    function scratch(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    function checkReveal() {
        // ... (lógica para comprobar el porcentaje raspado)
        // Si es suficiente, llamar a revealSpot
        revealSpot(spotElement, index);
    }
    
    // Añadir todos los listeners (mousedown, mousemove, etc.)
    // Al final del `mouseup` o `touchend`, llamar a `checkReveal()`.
    // Por simplicidad, aquí lo revelamos al hacer click.
    canvas.addEventListener('click', () => revealSpot(spotElement, index));
}


/**
 * Revela un spot y actualiza la base de datos
 */
async function revealSpot(spotElement, index) {
    if (currentUser.progreso[index]) return;

    spotElement.classList.add('is-scratched');
    
    // Actualizar estado local
    currentUser.progreso[index] = true;
    currentUser.ultimaRaspada = new Date().toISOString().split("T")[0];

    // Actualizar en Firestore
    const docRef = doc(db, "clientes", currentUser.id);
    try {
        await updateDoc(docRef, {
            progreso: currentUser.progreso,
            ultimaRaspada: currentUser.ultimaRaspada
        });
        console.log("Progreso actualizado en Firestore.");
        
        // Deshabilitar el resto de los spots
        initCard();

    } catch(error) {
        console.error("Error al actualizar: ", error);
    }

    if (currentUser.progreso.every(p => p)) {
        setTimeout(() => {
            document.querySelector('.loyalty-card header p').textContent = "¡FELICIDADES, HAS GANADO!";
        }, 500);
    }
}

/**
 * Función de inicialización de la página
 */
function initializePage() {
    // REGLA DEL QR: Comprobar si la URL tiene el parámetro secreto
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('from') || urlParams.get('from') !== 'qr') {
        document.body.innerHTML = `<div style="color:white; text-align:center; padding: 40px;"><h1>Acceso no válido</h1><p>Por favor, escanea el código QR en el local para participar.</p></div>`;
        return;
    }
    
    // Si el acceso es válido, ocultamos la tarjeta y mostramos el login
    loyaltyCard.style.display = 'none';
    emailGate.style.display = 'block';

    // Asignar el evento al botón
    continueButton.addEventListener('click', handleLogin);
}

// Iniciar todo cuando la página cargue
document.addEventListener('DOMContentLoaded', initializePage);