// ===================================
//      ARCHIVO: script.js
// ===================================

// --- CAMBIO APLICADO AQUÍ ---
// Se unifica la versión de Firebase a 11.9.1 para que coincida con firebase-config.js
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
// Esta importación local desde tu archivo de configuración es correcta.
import { db } from './firebase-config.js';

// --- Variables Globales ---
const SPOTS_COUNT = 5;
const spotsContainer = document.querySelector('.spots-container');
const emailGate = document.getElementById('emailGate');
const loyaltyCard = document.querySelector('.loyalty-card');
const userEmailInput = document.getElementById('userEmail');
const emailError = document.getElementById('emailError');
const continueButton = document.querySelector('#emailGate button');

let currentUser = {
    id: null,
    email: null,
    progreso: Array(SPOTS_COUNT).fill(false),
    ultimaRaspada: null
};

// --- Lógica Principal ---

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
        const q = query(collection(db, "clientes"), where("correo", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Usuario nuevo. Creando registro...");
            const newDocRef = doc(collection(db, "clientes"));
            
            currentUser = {
                id: newDocRef.id,
                email: email,
                progreso: Array(SPOTS_COUNT).fill(false),
                ultimaRaspada: null
            };

            await setDoc(newDocRef, { 
                correo: currentUser.email,
                progreso: currentUser.progreso,
                ultimaRaspada: currentUser.ultimaRaspada
            });
            
        } else {
            console.log("Usuario existente. Cargando datos...");
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();

            currentUser = {
                id: docSnap.id,
                email: data.correo,
                progreso: data.progreso || Array(SPOTS_COUNT).fill(false),
                ultimaRaspada: data.ultimaRaspada || null
            };
        }
        
        showLoyaltyCard();

    } catch (error) {
        console.error("Error al interactuar con Firestore: ", error);
        // Muestra un error más claro al usuario si algo falla con la base de datos.
        emailError.textContent = `Error al verificar: ${error.message}`; 
        continueButton.disabled = false;
        continueButton.textContent = "Continuar";
    }
}

function showLoyaltyCard() {
    emailGate.style.display = "none";
    loyaltyCard.style.display = "block";
    initCard();
}

function initCard() {
    spotsContainer.innerHTML = "";
    const hoy = new Date().toISOString().split("T")[0];
    const yaRaspoHoy = currentUser.ultimaRaspada === hoy;

    if (yaRaspoHoy) {
        // En lugar de un alert, podrías mostrar un mensaje más amigable en la UI.
        const headerText = document.querySelector('.loyalty-card header p');
        if (headerText) headerText.textContent = "¡Ya has participado hoy, vuelve mañana!";
    }

    for (let i = 0; i < SPOTS_COUNT; i++) {
        const spot = document.createElement('div');
        spot.className = 'scratch-spot';

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
            spot.style.pointerEvents = "none";
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.clientWidth || 60;
            canvas.height = canvas.clientHeight || 60;
            ctx.fillStyle = '#888'; // Color para indicar que está desactivado
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
}

function setupScratchableSpot(spotElement, index) {
    const canvas = spotElement.querySelector('canvas');
    // Para simplificar, usamos click en lugar de raspar.
    // Tu lógica original de raspar con mousemove también funcionaría aquí.
    canvas.addEventListener('click', () => revealSpot(spotElement, index));
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function revealSpot(spotElement, index) {
    if (currentUser.progreso[index]) return;

    // Evita que se pueda raspar más de una vez por día
    const hoy = new Date().toISOString().split("T")[0];
    if (currentUser.ultimaRaspada === hoy) return;

    spotElement.classList.add('is-scratched');
    
    currentUser.progreso[index] = true;
    currentUser.ultimaRaspada = hoy;

    const docRef = doc(db, "clientes", currentUser.id);
    try {
        await updateDoc(docRef, {
            progreso: currentUser.progreso,
            ultimaRaspada: currentUser.ultimaRaspada
        });
        console.log("Progreso actualizado en Firestore.");
        
        // Vuelve a dibujar la tarjeta para deshabilitar los otros spots
        initCard();

    } catch(error) {
        console.error("Error al actualizar: ", error);
        alert("Hubo un error al guardar tu progreso. Inténtalo de nuevo.");
    }

    if (currentUser.progreso.every(p => p)) {
        setTimeout(() => {
            document.querySelector('.loyalty-card header p').textContent = "¡FELICIDADES, HAS GANADO!";
        }, 500);
    }
}

function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('from') || urlParams.get('from') !== 'qr') {
        document.body.innerHTML = `<div style="color:white; text-align:center; padding: 40px;"><h1>Acceso no válido</h1><p>Por favor, escanea el código QR en el local para participar.</p></div>`;
        return;
    }
    
    loyaltyCard.style.display = 'none';
    emailGate.style.display = 'block';

    continueButton.addEventListener('click', handleLogin);
    // Permite enviar con la tecla Enter en el campo de email
    userEmailInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializePage);