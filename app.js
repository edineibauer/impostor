// APP.JS - Main Application Controller

let gameMode = null; // 'local' or 'online'

// UTILITIES
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function closeOverlay(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('overlay-container').innerHTML = '';
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET WORDS BY LANGUAGE
function getWordCategories(lang = currentLang) {
    switch(lang) {
        case 'en': return wordCategoriesEN;
        case 'es': return wordCategoriesES;
        default: return wordCategoriesPT;
    }
}

// LANGUAGE SELECTION
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('impostor_lang', lang);
    applyTranslations();
    showScreen('screen-mode');
}

// MODE SELECTION
function selectMode(mode) {
    gameMode = mode;
    if (mode === 'local') {
        initLocalGame();
        showScreen('screen-home');
    } else {
        initOnlineMenu();
        showScreen('screen-online-menu');
    }
}

// PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner').classList.add('show');
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            document.getElementById('install-banner').classList.remove('show');
        });
    }
}

function closeInstallBanner() {
    document.getElementById('install-banner').classList.remove('show');
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// CHECK URL FOR ROOM CODE
function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        // Auto-join room
        localStorage.setItem('pending_room', roomCode.toUpperCase());
        // Clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// INIT
function init() {
    checkUrlForRoom();
    
    const hasLang = loadLanguage();
    
    if (!hasLang) {
        showScreen('screen-lang');
    } else {
        applyTranslations();
        
        // Check for pending room join
        const pendingRoom = localStorage.getItem('pending_room');
        if (pendingRoom) {
            localStorage.removeItem('pending_room');
            gameMode = 'online';
            initOnlineMenu();
            document.getElementById('join-room-code').value = pendingRoom;
            showScreen('screen-join-room');
            // Auto-join after a moment
            setTimeout(() => {
                const name = localStorage.getItem('impostor_player_name');
                if (name) {
                    joinRoom();
                }
            }, 500);
        } else {
            showScreen('screen-mode');
        }
    }
}

init();
