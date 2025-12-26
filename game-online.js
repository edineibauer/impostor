// GAME-ONLINE.JS - Online Game Logic with Firebase

// IMPORTANT: To use online mode, you need to:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Realtime Database
// 3. Set rules to allow read/write
// 4. Replace the config below with your project's config

// Firebase Config - REPLACE WITH YOUR OWN CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyA3CHzkPfT-2FNOPQ1Up0HxSSiGpGZ1epM",
    authDomain: "impostor-1bd7a.firebaseapp.com",
    databaseURL: "https://impostor-1bd7a-default-rtdb.firebaseio.com",
    projectId: "impostor-1bd7a",
    storageBucket: "impostor-1bd7a.firebasestorage.app",
    messagingSenderId: "629463705730",
    appId: "1:629463705730:web:bf3521149f90dc5d77ac9b",
    measurementId: "G-VKN15517B9"
};

// Check if Firebase is configured
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "1";
}

let db = null;
let roomRef = null;
let playerId = null;
let isHost = false;
let currentRoom = null;
let qrCode = null;

// Online state
let onlineState = {
    roomCode: null,
    players: {},
    gameStarted: false,
    round: 1,
    word: null,
    category: null,
    impostorIds: [],
    votes: {},
    eliminated: [],
    scores: {},
    phase: 'lobby', // lobby, playing, voting, result, roundEnd, gameOver
    maxImpostors: 1,
    impostorKnows: true,
    maxPoints: null,
    allCategories: true,
    selectedCategories: [],
    roomLang: 'pt',
    votingRound: 0,
    readyPlayers: []
};

// Initialize Firebase
function initFirebase() {
    if (!isFirebaseConfigured()) {
        return false;
    }
    
    if (!db) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
        } catch (e) {
            console.log('Firebase already initialized');
            db = firebase.database();
        }
    }
    return true;
}

// Connection status
function updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    el.className = 'connection-status ' + status;
    el.textContent = t(status);
}

// Init Online Menu
function initOnlineMenu() {
    if (!initFirebase()) {
        document.getElementById('overlay-container').innerHTML = `
            <div class="confirm-overlay">
                <div class="confirm-box">
                    <h3>⚠️ Firebase Required</h3>
                    <p style="color:var(--text-dim);font-size:.75rem;margin:16px 0;line-height:1.6;text-align:left">
                        O modo online requer Firebase Realtime Database.<br><br>
                        Para habilitar:<br>
                        1. Crie um projeto em <strong>console.firebase.google.com</strong><br>
                        2. Habilite Realtime Database<br>
                        3. Configure as regras de segurança<br>
                        4. Edite <strong>game-online.js</strong> com sua configuração
                    </p>
                    <button class="btn btn-secondary" onclick="closeOverlay();showScreen('screen-mode')">OK</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Load saved player name
    const savedName = localStorage.getItem('impostor_player_name');
    if (savedName) {
        document.getElementById('online-player-name').value = savedName;
    }
    
    // Generate player ID
    if (!playerId) {
        playerId = localStorage.getItem('impostor_player_id');
        if (!playerId) {
            playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('impostor_player_id', playerId);
        }
    }
}

// Create Room
function createRoom() {
    const name = document.getElementById('online-player-name').value.trim();
    if (!name) {
        showToast(t('nameRequired'));
        return;
    }
    localStorage.setItem('impostor_player_name', name);
    
    isHost = true;
    
    // Init room settings
    populateRoomCategoriesList();
    updateRoomImpostorSelector();
    document.getElementById('room-lang-' + currentLang).style.borderColor = 'var(--accent)';
    onlineState.roomLang = currentLang;
    
    showScreen('screen-create-room');
}

// Room Settings
function setRoomLanguage(lang) {
    onlineState.roomLang = lang;
    document.querySelectorAll('[id^="room-lang-"]').forEach(btn => {
        btn.style.borderColor = 'var(--border)';
    });
    document.getElementById('room-lang-' + lang).style.borderColor = 'var(--accent)';
}

function updateRoomImpostorSelector() {
    const selector = document.getElementById('room-impostor-selector');
    selector.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === 1 ? ' selected' : '');
        btn.dataset.num = i;
        btn.textContent = i;
        btn.onclick = function() {
            selector.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            onlineState.maxImpostors = parseInt(this.dataset.num);
        };
        selector.appendChild(btn);
    }
}

function toggleRoomImpostorKnows() {
    const toggle = document.getElementById('room-toggle-impostor-knows');
    onlineState.impostorKnows = !onlineState.impostorKnows;
    toggle.classList.toggle('active', onlineState.impostorKnows);
}

function populateRoomCategoriesList() {
    const container = document.getElementById('room-categories-list');
    const categories = getWordCategories(onlineState.roomLang);
    container.innerHTML = categories.map((cat, idx) => 
        `<div class="category-item selected" data-idx="${idx}" onclick="toggleRoomCategory(${idx})">${cat.category}</div>`
    ).join('');
    onlineState.selectedCategories = categories.map((_, idx) => idx);
}

function toggleRoomCategory(idx) {
    const item = document.querySelector(`#room-categories-list .category-item[data-idx="${idx}"]`);
    item.classList.toggle('selected');
    
    if (item.classList.contains('selected')) {
        if (!onlineState.selectedCategories.includes(idx)) {
            onlineState.selectedCategories.push(idx);
        }
    } else {
        onlineState.selectedCategories = onlineState.selectedCategories.filter(i => i !== idx);
    }
}

function toggleRoomAllCategories() {
    const toggle = document.getElementById('room-toggle-all-categories');
    onlineState.allCategories = !onlineState.allCategories;
    toggle.classList.toggle('active', onlineState.allCategories);
    document.getElementById('room-categories-list').style.display = onlineState.allCategories ? 'none' : 'grid';
    
    if (onlineState.allCategories) {
        const categories = getWordCategories(onlineState.roomLang);
        onlineState.selectedCategories = categories.map((_, idx) => idx);
        document.querySelectorAll('#room-categories-list .category-item').forEach(item => item.classList.add('selected'));
    }
}

// Confirm Create Room
function confirmCreateRoom() {
    if (!onlineState.allCategories && onlineState.selectedCategories.length === 0) {
        showToast(t('selectCategories'));
        return;
    }
    
    const maxPointsInput = document.getElementById('room-max-points').value;
    onlineState.maxPoints = maxPointsInput ? parseInt(maxPointsInput) : null;
    
    // Generate room code
    onlineState.roomCode = generateRoomCode();
    
    const playerName = localStorage.getItem('impostor_player_name');
    
    // Create room in Firebase
    roomRef = db.ref('rooms/' + onlineState.roomCode);
    
    const roomData = {
        host: playerId,
        hostName: playerName,
        settings: {
            maxImpostors: onlineState.maxImpostors,
            impostorKnows: onlineState.impostorKnows,
            maxPoints: onlineState.maxPoints,
            allCategories: onlineState.allCategories,
            selectedCategories: onlineState.selectedCategories,
            roomLang: onlineState.roomLang
        },
        players: {
            [playerId]: {
                name: playerName,
                score: 0,
                isHost: true,
                online: true,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            }
        },
        gameState: {
            phase: 'lobby',
            round: 0
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    roomRef.set(roomData).then(() => {
        currentRoom = onlineState.roomCode;
        setupRoomListeners();
        showLobby();
    }).catch(err => {
        showToast('Error creating room');
        console.error(err);
    });
}

// Show Join Room
function showJoinRoom() {
    const name = document.getElementById('online-player-name').value.trim();
    if (!name) {
        showToast(t('nameRequired'));
        return;
    }
    localStorage.setItem('impostor_player_name', name);
    
    isHost = false;
    showScreen('screen-join-room');
}

// Join Room
function joinRoom() {
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (!code || code.length !== 4) {
        showToast(t('roomCode'));
        return;
    }
    
    const playerName = localStorage.getItem('impostor_player_name');
    if (!playerName) {
        showToast(t('nameRequired'));
        showScreen('screen-online-menu');
        return;
    }
    
    updateConnectionStatus('connecting');
    
    // Check if room exists
    roomRef = db.ref('rooms/' + code);
    roomRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            showToast(t('roomNotFound'));
            updateConnectionStatus('disconnected');
            return;
        }
        
        const roomData = snapshot.val();
        
        // Check if game already started
        if (roomData.gameState && roomData.gameState.phase !== 'lobby') {
            showToast('Game already started');
            updateConnectionStatus('disconnected');
            return;
        }
        
        // Join room
        onlineState.roomCode = code;
        currentRoom = code;
        isHost = roomData.host === playerId;
        
        // Apply room settings
        if (roomData.settings) {
            onlineState.maxImpostors = roomData.settings.maxImpostors;
            onlineState.impostorKnows = roomData.settings.impostorKnows;
            onlineState.maxPoints = roomData.settings.maxPoints;
            onlineState.allCategories = roomData.settings.allCategories;
            onlineState.selectedCategories = roomData.settings.selectedCategories || [];
            onlineState.roomLang = roomData.settings.roomLang || 'pt';
            
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
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            setupRoomListeners();
            showLobby();
        });
        
    }).catch(err => {
        showToast('Error joining room');
        updateConnectionStatus('disconnected');
        console.error(err);
    });
}

// Setup Room Listeners
function setupRoomListeners() {
    updateConnectionStatus('connected');
    
    // Listen for player changes
    roomRef.child('players').on('value', snapshot => {
        onlineState.players = snapshot.val() || {};
        updateLobbyPlayers();
        updateOnlinePlayersStatus();
    });
    
    // Listen for game state changes
    roomRef.child('gameState').on('value', snapshot => {
        const gameState = snapshot.val();
        if (gameState) {
            handleGameStateChange(gameState);
        }
    });
    
    // Listen for votes
    roomRef.child('votes').on('value', snapshot => {
        onlineState.votes = snapshot.val() || {};
        updateVotesProgress();
        checkAllVoted();
    });
    
    // Listen for ready players
    roomRef.child('readyPlayers').on('value', snapshot => {
        onlineState.readyPlayers = snapshot.val() ? Object.keys(snapshot.val()) : [];
        updateReadyStatus();
        checkAllReady();
    });
    
    // Set presence
    roomRef.child('players/' + playerId + '/online').onDisconnect().set(false);
    
    // Connection state
    db.ref('.info/connected').on('value', snapshot => {
        if (snapshot.val() === true) {
            updateConnectionStatus('connected');
            roomRef.child('players/' + playerId + '/online').set(true);
        } else {
            updateConnectionStatus('disconnected');
        }
    });
}

// Show Lobby
function showLobby() {
    document.getElementById('lobby-room-code').textContent = onlineState.roomCode;
    
    // Generate QR Code
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '';
    const gameUrl = `https://edineibauer.github.io/impostor/?room=${onlineState.roomCode}`;
    
    if (typeof QRCode !== 'undefined') {
        qrCode = new QRCode(qrContainer, {
            text: gameUrl,
            width: 150,
            height: 150,
            colorDark: '#ffffff',
            colorLight: '#12121a',
            correctLevel: QRCode.CorrectLevel.L
        });
    }
    
    // Show/hide host controls
    document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
    document.getElementById('guest-waiting').style.display = isHost ? 'none' : 'block';
    
    showScreen('screen-lobby');
}

// Update Lobby Players
function updateLobbyPlayers() {
    const container = document.getElementById('lobby-players');
    const playerCount = Object.keys(onlineState.players).length;
    document.getElementById('player-count').textContent = playerCount;
    
    container.innerHTML = Object.entries(onlineState.players).map(([id, player]) => {
        const isYou = id === playerId;
        const isPlayerHost = player.isHost;
        let badges = '';
        if (isPlayerHost) badges += `<span class="player-badge">${t('host')}</span>`;
        if (isYou) badges += `<span class="player-badge" style="background:var(--success)">${t('you')}</span>`;
        
        return `
            <div class="player-item ${isPlayerHost ? 'host' : ''} ${isYou ? 'you' : ''}">
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <span class="player-name">${player.name}</span>
                ${badges}
                <div class="status-indicator ${player.online ? '' : 'offline'}"></div>
            </div>
        `;
    }).join('');
    
    // Enable start button if enough players
    const startBtn = document.getElementById('start-online-btn');
    if (startBtn) {
        startBtn.disabled = playerCount < 3;
        if (playerCount < 3) {
            startBtn.textContent = t('minPlayers');
        } else {
            startBtn.textContent = t('startGame');
        }
    }
}

// Start Online Game
function startOnlineGame() {
    if (!isHost) return;
    
    const playerCount = Object.keys(onlineState.players).length;
    if (playerCount < 3) {
        showToast(t('minPlayers'));
        return;
    }
    
    // Calculate actual impostor count
    const maxPossible = Math.floor((playerCount - 1) / 2);
    const actualMax = Math.min(onlineState.maxImpostors, maxPossible);
    const actualImpostorCount = Math.floor(Math.random() * actualMax) + 1;
    
    // Select word
    const categories = getWordCategories(onlineState.roomLang);
    let availableCategories = onlineState.allCategories ? 
        categories : 
        onlineState.selectedCategories.map(idx => categories[idx]);
    
    const categoryData = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    
    // Select impostors
    const playerIds = Object.keys(onlineState.players);
    const shuffledIds = shuffle(playerIds);
    const impostorIds = shuffledIds.slice(0, actualImpostorCount);
    
    // Generate similar words for impostors if needed
    let similarWords = {};
    if (!onlineState.impostorKnows) {
        impostorIds.forEach(id => {
            similarWords[id] = findSimilarWordOnline(word, categoryData.category, categoryData);
        });
    }
    
    // Update game state
    roomRef.child('gameState').set({
        phase: 'playing',
        round: 1,
        word: word,
        category: categoryData.category,
        impostorIds: impostorIds,
        impostorKnows: onlineState.impostorKnows,
        similarWords: similarWords,
        eliminated: [],
        votingRound: 0
    });
    
    // Clear votes and ready
    roomRef.child('votes').remove();
    roomRef.child('readyPlayers').remove();
}

function findSimilarWordOnline(originalWord, category, categoryData) {
    if (categoryData && categoryData.similar && categoryData.similar[originalWord]) {
        const similarOptions = categoryData.similar[originalWord];
        return similarOptions[Math.floor(Math.random() * similarOptions.length)];
    }
    
    if (categoryData) {
        const otherWords = categoryData.words.filter(w => w !== originalWord);
        if (otherWords.length > 0) {
            return otherWords[Math.floor(Math.random() * otherWords.length)];
        }
    }
    
    return originalWord;
}

// Handle Game State Changes
function handleGameStateChange(gameState) {
    onlineState.phase = gameState.phase;
    onlineState.round = gameState.round || 1;
    onlineState.word = gameState.word;
    onlineState.category = gameState.category;
    onlineState.impostorIds = gameState.impostorIds || [];
    onlineState.eliminated = gameState.eliminated || [];
    onlineState.votingRound = gameState.votingRound || 0;
    
    switch(gameState.phase) {
        case 'lobby':
            showLobby();
            break;
        case 'playing':
            showOnlineWord(gameState);
            break;
        case 'voting':
            showOnlineVoting();
            break;
        case 'result':
            showOnlineResult(gameState.lastResult);
            break;
        case 'roundEnd':
            showOnlineRoundEnd(gameState);
            break;
        case 'gameOver':
            showOnlineGameOver(gameState.winner);
            break;
    }
}

// Show Online Word
function showOnlineWord(gameState) {
    document.getElementById('online-round-num').textContent = onlineState.round;
    
    const wordText = document.getElementById('online-word-text');
    const categoryTag = document.getElementById('online-category-tag');
    
    const isImpostor = onlineState.impostorIds.includes(playerId);
    
    if (isImpostor) {
        if (gameState.impostorKnows) {
            wordText.textContent = t('impostor');
            wordText.className = 'word-text is-impostor';
        } else {
            const similarWord = gameState.similarWords && gameState.similarWords[playerId] ? 
                gameState.similarWords[playerId] : onlineState.word;
            wordText.textContent = similarWord;
            wordText.className = 'word-text is-word';
        }
    } else {
        wordText.textContent = onlineState.word;
        wordText.className = 'word-text is-word';
    }
    
    categoryTag.textContent = onlineState.category;
    
    // Show word, hide hidden container
    document.getElementById('online-word-display').style.display = 'block';
    document.getElementById('hide-word-btn').style.display = 'block';
    document.getElementById('word-hidden-container').style.display = 'none';
    
    // Host controls
    document.getElementById('host-vote-control').style.display = isHost ? 'block' : 'none';
    
    updateOnlinePlayersStatus();
    showScreen('screen-online-word');
}

function hideOnlineWord() {
    document.getElementById('online-word-display').style.display = 'none';
    document.getElementById('hide-word-btn').style.display = 'none';
    document.getElementById('word-hidden-container').style.display = 'block';
}

function showOnlineWordAgain() {
    document.getElementById('online-word-display').style.display = 'block';
    document.getElementById('hide-word-btn').style.display = 'block';
    document.getElementById('word-hidden-container').style.display = 'none';
}

// Update Online Players Status
function updateOnlinePlayersStatus() {
    const container = document.getElementById('online-players-status');
    if (!container) return;
    
    container.innerHTML = Object.entries(onlineState.players).map(([id, player]) => {
        const isEliminated = onlineState.eliminated.includes(id);
        const isYou = id === playerId;
        
        return `
            <div class="player-item ${isEliminated ? 'eliminated' : ''} ${isYou ? 'you' : ''}">
                <div class="player-avatar" style="${isEliminated ? 'opacity:0.4' : ''}">${player.name.charAt(0).toUpperCase()}</div>
                <span class="player-name" style="${isEliminated ? 'text-decoration:line-through;opacity:0.4' : ''}">${player.name}</span>
                ${isYou ? `<span class="player-badge" style="background:var(--success)">${t('you')}</span>` : ''}
                ${isEliminated ? `<span class="vote-status">${t('eliminated')}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Start Voting (Host only)
function startVoting() {
    if (!isHost) return;
    
    roomRef.child('votes').remove();
    roomRef.child('gameState/phase').set('voting');
    roomRef.child('gameState/votingRound').set((onlineState.votingRound || 0) + 1);
}

// Show Online Voting
function showOnlineVoting() {
    const container = document.getElementById('online-vote-list');
    const myVote = onlineState.votes[playerId];
    
    container.innerHTML = Object.entries(onlineState.players).map(([id, player]) => {
        if (id === playerId) return ''; // Can't vote for yourself
        if (onlineState.eliminated.includes(id)) return ''; // Can't vote eliminated
        
        const isSelected = myVote === id;
        
        return `
            <button class="player-vote-btn ${isSelected ? 'selected' : ''}" onclick="castVote('${id}')">
                ${player.name}
                ${isSelected ? ' ✓' : ''}
            </button>
        `;
    }).join('');
    
    document.getElementById('vote-waiting').style.display = myVote ? 'block' : 'none';
    
    showScreen('screen-online-vote');
}

// Cast Vote
function castVote(targetId) {
    roomRef.child('votes/' + playerId).set(targetId);
}

// Update Votes Progress
function updateVotesProgress() {
    const totalActive = Object.keys(onlineState.players).filter(id => !onlineState.eliminated.includes(id)).length;
    const votedCount = Object.keys(onlineState.votes).length;
    
    const progressEl = document.getElementById('votes-progress');
    if (progressEl) {
        progressEl.textContent = `${votedCount}/${totalActive}`;
    }
}

// Check if All Voted
function checkAllVoted() {
    if (!isHost) return;
    if (onlineState.phase !== 'voting') return;
    
    const activePlayers = Object.keys(onlineState.players).filter(id => !onlineState.eliminated.includes(id));
    const allVoted = activePlayers.every(id => onlineState.votes[id]);
    
    if (allVoted && activePlayers.length > 0) {
        processVotes();
    }
}

// Process Votes (Host)
function processVotes() {
    // Count votes
    const voteCounts = {};
    Object.values(onlineState.votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    
    // Find most voted
    let maxVotes = 0;
    let eliminated = null;
    Object.entries(voteCounts).forEach(([id, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            eliminated = id;
        }
    });
    
    // Check for tie - in case of tie, no one is eliminated
    const tiedPlayers = Object.entries(voteCounts).filter(([_, count]) => count === maxVotes);
    if (tiedPlayers.length > 1) {
        // Tie - show result but no elimination
        roomRef.child('gameState/lastResult').set({
            type: 'tie',
            voteCounts: voteCounts
        });
        roomRef.child('gameState/phase').set('result');
        return;
    }
    
    const isImpostor = onlineState.impostorIds.includes(eliminated);
    const eliminatedName = onlineState.players[eliminated].name;
    
    // Update scores
    const newEliminated = [...onlineState.eliminated, eliminated];
    const isFirstVotingRound = (onlineState.votingRound || 1) === 1;
    
    // Calculate score changes
    Object.entries(onlineState.votes).forEach(([voterId, targetId]) => {
        if (targetId === eliminated) {
            if (isImpostor) {
                // Correct vote - voter gains 1 point
                updatePlayerScore(voterId, 1);
            } else {
                // Wrong vote - voter loses 1 point
                updatePlayerScore(voterId, -1);
            }
        }
    });
    
    // Impostor score changes
    if (isImpostor) {
        if (isFirstVotingRound) {
            // Caught in first round - impostor loses 1 point
            updatePlayerScore(eliminated, -1);
        }
        // If caught after first round, impostor keeps points earned from surviving
    } else {
        // Innocent eliminated - all impostors gain 1 point for surviving
        onlineState.impostorIds.forEach(impId => {
            if (!newEliminated.includes(impId)) {
                updatePlayerScore(impId, 1);
            }
        });
    }
    
    // Check game end conditions
    const remainingImpostors = onlineState.impostorIds.filter(id => !newEliminated.includes(id));
    const remainingPlayers = Object.keys(onlineState.players).filter(id => !newEliminated.includes(id));
    const remainingInnocents = remainingPlayers.filter(id => !onlineState.impostorIds.includes(id));
    
    let gameEndType = null;
    if (remainingImpostors.length === 0) {
        gameEndType = 'innocentsWin';
    } else if (remainingInnocents.length <= remainingImpostors.length) {
        gameEndType = 'impostorsWin';
    }
    
    // Update game state
    roomRef.child('gameState/eliminated').set(newEliminated);
    roomRef.child('gameState/lastResult').set({
        type: isImpostor ? 'correct' : 'wrong',
        eliminatedId: eliminated,
        eliminatedName: eliminatedName,
        wasImpostor: isImpostor,
        voteCounts: voteCounts,
        remainingImpostors: remainingImpostors.length,
        gameEnd: gameEndType
    });
    
    // Clear votes
    roomRef.child('votes').remove();
    
    roomRef.child('gameState/phase').set('result');
}

function updatePlayerScore(playerId, delta) {
    roomRef.child('players/' + playerId + '/score').transaction(current => {
        return (current || 0) + delta;
    });
}

// Show Online Result
function showOnlineResult(result) {
    const container = document.getElementById('online-result-content');
    
    if (result.type === 'tie') {
        container.innerHTML = `
            <div class="result-icon">⚖️</div>
            <h3 style="color:var(--warning)">EMPATE!</h3>
            <p style="color:var(--text-dim);margin:14px 0">Ninguém foi eliminado nesta votação.</p>
        `;
    } else {
        const icon = result.wasImpostor ? '✅' : '❌';
        const color = result.wasImpostor ? 'var(--success)' : '#ff4444';
        const message = result.wasImpostor ? t('correct') : t('wrong');
        const subMessage = result.wasImpostor ? t('wasImpostor') : t('wasInnocent');
        
        container.innerHTML = `
            <div class="result-icon">${icon}</div>
            <h3 style="color:${color}">${message}</h3>
            <p style="font-size:1.1rem;margin:14px 0"><strong>${result.eliminatedName}</strong> ${subMessage}</p>
            ${result.remainingImpostors > 0 && !result.wasImpostor ? 
                `<p style="color:var(--text-dim);font-size:.85rem">${t('hiddenImpostors').replace('{n}', result.remainingImpostors)}</p>` : ''}
            ${result.wasImpostor && result.remainingImpostors > 0 ? 
                `<p style="color:var(--warning);font-size:.85rem">${t('remainingImpostors').replace('{n}', result.remainingImpostors)}</p>` : ''}
        `;
    }
    
    // Show/hide continue button based on game end
    const continueBtn = document.getElementById('continue-voting-btn');
    if (result.gameEnd) {
        continueBtn.style.display = 'none';
        // Auto-advance to round end after delay
        setTimeout(() => {
            if (isHost) {
                roomRef.child('gameState/phase').set('roundEnd');
            }
        }, 3000);
    } else {
        continueBtn.style.display = 'block';
    }
    
    showScreen('screen-online-result');
}

// Continue Online Voting
function continueOnlineVoting() {
    if (isHost) {
        roomRef.child('gameState/phase').set('voting');
    }
}

// Show Online Round End
function showOnlineRoundEnd(gameState) {
    const container = document.getElementById('online-round-summary');
    const impostorNames = onlineState.impostorIds.map(id => onlineState.players[id]?.name || 'Unknown').join(', ');
    
    let endMessage = '';
    if (gameState.lastResult?.gameEnd === 'innocentsWin') {
        endMessage = `<div class="result-icon">🎉</div><h3 style="color:var(--success)">${t('correct')}</h3>`;
    } else if (gameState.lastResult?.gameEnd === 'impostorsWin') {
        endMessage = `<div class="result-icon">🎭</div><h3 style="color:var(--accent)">${t('impostorWins')}</h3>`;
    }
    
    container.innerHTML = `
        ${endMessage}
        <p style="margin:14px 0;color:var(--text-dim);font-size:.85rem">${t(onlineState.impostorIds.length > 1 ? 'impostorsWere' : 'impostorWas')}</p>
        <p style="font-size:1.2rem;color:var(--accent);font-family:'Bebas Neue',sans-serif;letter-spacing:2px">${impostorNames}</p>
        <p style="margin:14px 0;font-size:.9rem">${t('word')} <strong style="color:var(--success)">${onlineState.word}</strong></p>
    `;
    
    // Build ranking
    updateOnlineRanking();
    
    // Reset ready button
    document.getElementById('ready-next-btn').disabled = false;
    document.getElementById('ready-next-btn').textContent = t('ready');
    
    showScreen('screen-online-round-end');
}

function updateOnlineRanking() {
    const sorted = Object.entries(onlineState.players)
        .map(([id, p]) => ({ name: p.name, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score);
    
    const rankingHTML = sorted.map((p, idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && p.score > 0) cls += ' gold';
        else if (idx === 1 && p.score > 0) cls += ' silver';
        else if (idx === 2 && p.score > 0) cls += ' bronze';
        const scoreClass = p.score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${p.name}</span><span class="${scoreClass}">${p.score}</span></li>`;
    }).join('');
    
    document.getElementById('online-ranking-list').innerHTML = rankingHTML;
}

// Ready for Next Round
function readyNextRound() {
    roomRef.child('readyPlayers/' + playerId).set(true);
    document.getElementById('ready-next-btn').disabled = true;
    document.getElementById('ready-next-btn').textContent = t('waitingPlayers') + '...';
}

function updateReadyStatus() {
    const total = Object.keys(onlineState.players).length;
    const ready = onlineState.readyPlayers.length;
    
    const statusEl = document.getElementById('ready-status');
    if (statusEl) {
        statusEl.textContent = `${ready}/${total} ${t('ready').toLowerCase()}`;
    }
}

function checkAllReady() {
    if (!isHost) return;
    if (onlineState.phase !== 'roundEnd') return;
    
    const allPlayers = Object.keys(onlineState.players);
    const allReady = allPlayers.every(id => onlineState.readyPlayers.includes(id));
    
    if (allReady && allPlayers.length > 0) {
        // Check for winner
        if (onlineState.maxPoints) {
            for (const [id, player] of Object.entries(onlineState.players)) {
                if ((player.score || 0) >= onlineState.maxPoints) {
                    roomRef.child('gameState/phase').set('gameOver');
                    roomRef.child('gameState/winner').set({ id, name: player.name, score: player.score });
                    return;
                }
            }
        }
        
        // Start next round
        startNextOnlineRound();
    }
}

function startNextOnlineRound() {
    const newRound = onlineState.round + 1;
    
    // Select new word
    const categories = getWordCategories(onlineState.roomLang);
    let availableCategories = onlineState.allCategories ? 
        categories : 
        onlineState.selectedCategories.map(idx => categories[idx]);
    
    const categoryData = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    
    // Select new impostors
    const playerIds = Object.keys(onlineState.players);
    const maxPossible = Math.floor((playerIds.length - 1) / 2);
    const actualMax = Math.min(onlineState.maxImpostors, maxPossible);
    const actualImpostorCount = Math.floor(Math.random() * actualMax) + 1;
    
    const shuffledIds = shuffle(playerIds);
    const impostorIds = shuffledIds.slice(0, actualImpostorCount);
    
    let similarWords = {};
    if (!onlineState.impostorKnows) {
        impostorIds.forEach(id => {
            similarWords[id] = findSimilarWordOnline(word, categoryData.category, categoryData);
        });
    }
    
    // Update game state
    roomRef.child('gameState').set({
        phase: 'playing',
        round: newRound,
        word: word,
        category: categoryData.category,
        impostorIds: impostorIds,
        impostorKnows: onlineState.impostorKnows,
        similarWords: similarWords,
        eliminated: [],
        votingRound: 0
    });
    
    // Clear ready and votes
    roomRef.child('readyPlayers').remove();
    roomRef.child('votes').remove();
}

// Show Online Game Over
function showOnlineGameOver(winner) {
    document.getElementById('winner-name').textContent = winner.name;
    
    const sorted = Object.entries(onlineState.players)
        .map(([id, p]) => ({ name: p.name, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score);
    
    const rankingHTML = sorted.map((p, idx) => {
        let cls = 'ranking-item';
        if (idx === 0) cls += ' gold';
        else if (idx === 1) cls += ' silver';
        else if (idx === 2) cls += ' bronze';
        const scoreClass = p.score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${p.name}</span><span class="${scoreClass}">${p.score}</span></li>`;
    }).join('');
    
    document.getElementById('final-ranking-list').innerHTML = rankingHTML;
    document.getElementById('host-restart-controls').style.display = isHost ? 'block' : 'none';
    
    showScreen('screen-online-game-over');
}

// Restart Online Game
function restartOnlineGame() {
    if (!isHost) return;
    
    // Reset scores
    Object.keys(onlineState.players).forEach(id => {
        roomRef.child('players/' + id + '/score').set(0);
    });
    
    // Clear state
    roomRef.child('votes').remove();
    roomRef.child('readyPlayers').remove();
    roomRef.child('gameState').set({
        phase: 'lobby',
        round: 0
    });
}

// Leave Room
function leaveRoom() {
    if (roomRef) {
        roomRef.child('players/' + playerId).remove();
        roomRef.off();
    }
    
    roomRef = null;
    currentRoom = null;
    isHost = false;
    onlineState = {
        roomCode: null, players: {}, gameStarted: false, round: 1,
        word: null, category: null, impostorIds: [], votes: {},
        eliminated: [], scores: {}, phase: 'lobby', maxImpostors: 1,
        impostorKnows: true, maxPoints: null, allCategories: true,
        selectedCategories: [], roomLang: 'pt', votingRound: 0, readyPlayers: []
    };
    
    updateConnectionStatus('');
    showScreen('screen-mode');
}
