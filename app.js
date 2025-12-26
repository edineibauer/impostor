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

function generateRandomName() {
    const adjectives = ['Rápido', 'Astuto', 'Bravo', 'Forte', 'Ninja', 'Super', 'Mega', 'Ultra', 'Mestre', 'Grande'];
    const nouns = ['Jogador', 'Detetive', 'Agente', 'Espião', 'Herói', 'Lobo', 'Falcão', 'Tigre', 'Dragão', 'Fênix'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return adj + noun + num;
}

// GET WORDS BY LANGUAGE
function getWordCategories(lang) {
    const l = lang || currentLang;
    switch(l) {
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

// PROFILE MODAL
function showProfileModal() {
    const currentName = localStorage.getItem('impostor_player_name') || '';
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay" onclick="closeOverlay(event)">
            <div class="confirm-box" onclick="event.stopPropagation()">
                <h3>👤 ${t('yourName')}</h3>
                <input type="text" id="profile-name-input" value="${currentName}" placeholder="${t('player')}" maxlength="15" style="margin:16px 0">
                <button class="btn btn-primary" onclick="saveProfileName()">${t('saveSettings') || 'SALVAR'}</button>
                <button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:8px">${t('cancel')}</button>
            </div>
        </div>
    `;
    document.getElementById('profile-name-input').focus();
}

function saveProfileName() {
    const name = document.getElementById('profile-name-input').value.trim();
    if (name) {
        localStorage.setItem('impostor_player_name', name);
        // Update in Firebase if in a room
        if (roomRef && playerId) {
            roomRef.child('players/' + playerId + '/name').set(name);
        }
        showToast('Nome atualizado!');
    }
    closeOverlay();
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

// CHECK URL FOR ROOM CODE - AUTO JOIN
function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        localStorage.setItem('pending_room', roomCode.toUpperCase());
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    return false;
}

// INIT
function init() {
    const hasPendingRoom = checkUrlForRoom();
    const hasLang = loadLanguage();
    
    if (hasPendingRoom || localStorage.getItem('pending_room')) {
        // Auto-join room - skip language selection
        const pendingRoom = localStorage.getItem('pending_room');
        localStorage.removeItem('pending_room');
        
        // Ensure player has a name
        let playerName = localStorage.getItem('impostor_player_name');
        if (!playerName) {
            playerName = generateRandomName();
            localStorage.setItem('impostor_player_name', playerName);
        }
        
        // Generate player ID if needed
        let pid = localStorage.getItem('impostor_player_id');
        if (!pid) {
            pid = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('impostor_player_id', pid);
        }
        
        gameMode = 'online';
        
        // Init Firebase and join directly
        if (initFirebase()) {
            playerId = pid;
            autoJoinRoom(pendingRoom);
        } else {
            // Firebase not configured
            if (!hasLang) {
                showScreen('screen-lang');
            } else {
                applyTranslations();
                showScreen('screen-mode');
            }
        }
    } else if (!hasLang) {
        showScreen('screen-lang');
    } else {
        applyTranslations();
        showScreen('screen-mode');
    }
}

// Auto join room directly
function autoJoinRoom(code) {
    const playerName = localStorage.getItem('impostor_player_name');
    
    roomRef = db.ref('rooms/' + code);
    roomRef.once('value').then(snap => {
        if (!snap.exists()) {
            showToast(t('roomNotFound') || 'Sala não encontrada');
            applyTranslations();
            showScreen('screen-mode');
            return;
        }
        
        const data = snap.val();
        onlineState.roomCode = code;
        currentRoom = code;
        isHost = data.host === playerId;
        
        // Apply room settings including language
        if (data.settings) {
            onlineState.maxImpostors = data.settings.maxImpostors;
            onlineState.impostorKnows = data.settings.impostorKnows;
            onlineState.maxPoints = data.settings.maxPoints;
            onlineState.allCategories = data.settings.allCategories;
            onlineState.selectedCategories = data.settings.selectedCategories || [];
            onlineState.roomLang = data.settings.roomLang || 'pt';
            
            // Apply room language
            currentLang = onlineState.roomLang;
            localStorage.setItem('impostor_lang', currentLang);
            applyTranslations();
        }
        
        // Add player to room
        roomRef.child('players/' + playerId).set({
            name: playerName,
            score: 0,
            isHost: false,
            online: true,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            isNew: true // Mark as new player for mid-game joins
        }).then(() => {
            setupRoomListeners();
            
            // Check current game state
            if (data.gameState && data.gameState.phase !== 'lobby') {
                // Joined mid-game - show waiting screen or word screen
                handleGameStateChange(data.gameState);
            } else {
                showLobby();
            }
            
            showToast('Bem-vindo, ' + playerName + '!');
        });
        
    }).catch(e => {
        console.error(e);
        applyTranslations();
        showScreen('screen-mode');
    });
}

init();

