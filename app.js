// APP.JS - Main Application Controller

let gameMode = null; // 'local' or 'online'

// Check internet connection
function isOnline() {
    return navigator.onLine;
}

function showNoInternetModal() {
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>📡 Sem Internet</h3>
                <p style="color:var(--text-dim);font-size:.85rem;margin:16px 0;line-height:1.5">
                    Não foi possível conectar ao servidor.<br>
                    Verifique sua conexão e tente novamente.
                </p>
                <button class="btn btn-primary" onclick="closeOverlay();retryOnlineConnection()" style="margin-bottom:8px">🔄 TENTAR NOVAMENTE</button>
                <button class="btn btn-secondary" onclick="closeOverlay();selectMode('local')">🎮 JOGAR OFFLINE</button>
            </div>
        </div>
    `;
}

function retryOnlineConnection() {
    if (isOnline()) {
        const pendingRoom = localStorage.getItem('retry_room');
        if (pendingRoom) {
            localStorage.removeItem('retry_room');
            localStorage.setItem('pending_room', pendingRoom);
            init();
        } else {
            selectMode('online');
        }
    } else {
        showNoInternetModal();
    }
}

// ROOM CLEANUP - Remove inactive rooms (older than 24 hours)
function cleanupInactiveRooms() {
    if (!db) return;
    
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    db.ref('rooms').once('value').then(snapshot => {
        if (!snapshot.exists()) return;
        
        const rooms = snapshot.val();
        const deletePromises = [];
        
        Object.entries(rooms).forEach(([roomCode, roomData]) => {
            // Check lastActivity or createdAt
            const lastActivity = roomData.lastActivity || roomData.createdAt || 0;
            
            if (lastActivity < cutoffTime) {
                console.log('Cleaning up inactive room:', roomCode);
                deletePromises.push(db.ref('rooms/' + roomCode).remove());
            }
        });
        
        if (deletePromises.length > 0) {
            Promise.all(deletePromises).then(() => {
                console.log('Cleaned up', deletePromises.length, 'inactive rooms');
            });
        }
    }).catch(e => {
        console.log('Cleanup error:', e);
    });
}

// Update room activity timestamp
function updateRoomActivity() {
    if (roomRef) {
        roomRef.child('lastActivity').set(firebase.database.ServerValue.TIMESTAMP);
    }
}

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
    
    // Check for active room (page reload)
    const activeRoom = localStorage.getItem('impostor_active_room');
    
    if (hasPendingRoom || localStorage.getItem('pending_room')) {
        // Auto-join room from QR code - skip language selection
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
            // Run cleanup in background
            setTimeout(cleanupInactiveRooms, 2000);
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
    } else if (activeRoom) {
        // Reconnect to active room (page reload)
        applyTranslations();
        
        let pid = localStorage.getItem('impostor_player_id');
        if (!pid) {
            pid = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('impostor_player_id', pid);
        }
        
        gameMode = 'online';
        
        if (initFirebase()) {
            playerId = pid;
            // Run cleanup in background
            setTimeout(cleanupInactiveRooms, 2000);
            reconnectToRoom(activeRoom);
        } else {
            localStorage.removeItem('impostor_active_room');
            showScreen('screen-mode');
        }
    } else if (!hasLang) {
        showScreen('screen-lang');
    } else {
        applyTranslations();
        showScreen('screen-mode');
    }
}

// Reconnect to room after page reload
function reconnectToRoom(code) {
    // Check internet connection first
    if (!isOnline()) {
        localStorage.setItem('retry_room', code);
        showNoInternetModal();
        return;
    }
    
    const playerName = localStorage.getItem('impostor_player_name') || generateRandomName();
    
    roomRef = db.ref('rooms/' + code);
    roomRef.once('value').then(snap => {
        if (!snap.exists()) {
            // Room no longer exists
            localStorage.removeItem('impostor_active_room');
            showToast('Sala não encontrada');
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
            
            currentLang = onlineState.roomLang;
            localStorage.setItem('impostor_lang', currentLang);
            applyTranslations();
        }
        
        // Check if player still exists in room
        if (data.players && data.players[playerId]) {
            // Player exists - just reconnect
            roomRef.child('players/' + playerId + '/online').set(true);
            setupRoomListeners();
            
            // Restore game state
            if (data.gameState) {
                handleGameStateChange(data.gameState);
            } else {
                showLobby();
            }
            
            showToast('Reconectado!');
        } else {
            // Player was removed or left - rejoin
            roomRef.child('players/' + playerId).set({
                name: playerName,
                score: 0,
                isHost: false,
                online: true,
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
                isNew: data.gameState && data.gameState.phase !== 'lobby'
            }).then(() => {
                setupRoomListeners();
                
                if (data.gameState && data.gameState.phase !== 'lobby') {
                    handleGameStateChange(data.gameState);
                } else {
                    showLobby();
                }
                
                showToast('Bem-vindo de volta!');
            });
        }
        
    }).catch(e => {
        console.error(e);
        if (!isOnline()) {
            localStorage.setItem('retry_room', code);
            showNoInternetModal();
        } else {
            localStorage.removeItem('impostor_active_room');
            showScreen('screen-mode');
        }
    });
}

// Auto join room directly (from QR code)
function autoJoinRoom(code) {
    // Check internet connection first
    if (!isOnline()) {
        localStorage.setItem('retry_room', code);
        showNoInternetModal();
        return;
    }
    
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
        
        // Save active room
        localStorage.setItem('impostor_active_room', code);
        
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
            isNew: data.gameState && data.gameState.phase !== 'lobby'
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
        if (!isOnline()) {
            localStorage.setItem('retry_room', code);
            showNoInternetModal();
        } else {
            showToast('Erro ao conectar');
            applyTranslations();
            showScreen('screen-mode');
        }
    });
}

init();

