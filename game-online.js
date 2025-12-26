// GAME-ONLINE.JS - Online Game Logic with Firebase
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

function isFirebaseConfigured() { return firebaseConfig.apiKey !== "YOUR_API_KEY"; }

let db = null, roomRef = null, playerId = null, isHost = false, currentRoom = null;
let onlineState = { roomCode: null, players: {}, round: 1, word: null, category: null, impostorIds: [], votes: {}, eliminated: [], phase: 'lobby', maxImpostors: 1, impostorKnows: true, maxPoints: null, allCategories: true, selectedCategories: [], roomLang: 'pt', votingRound: 0, readyPlayers: [], voteRequests: {} };

function initFirebase() {
    if (!isFirebaseConfigured()) return false;
    if (!db) { try { firebase.initializeApp(firebaseConfig); db = firebase.database(); } catch (e) { db = firebase.database(); } }
    return true;
}

function updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    el.style.display = (status === 'connected' || status === '') ? 'none' : 'block';
    if (status) { el.className = 'connection-status ' + status; el.textContent = t(status); }
}

function initOnlineMenu() {
    if (!initFirebase()) {
        document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay"><div class="confirm-box"><h3>⚠️ Firebase Required</h3><p style="color:var(--text-dim);font-size:.75rem;margin:16px 0;line-height:1.6;text-align:left">O modo online requer Firebase.<br><br>1. Crie projeto em console.firebase.google.com<br>2. Habilite Realtime Database<br>3. Edite game-online.js com sua config</p><button class="btn btn-secondary" onclick="closeOverlay();showScreen(\'screen-mode\')">OK</button></div></div>';
        return;
    }
    const savedName = localStorage.getItem('impostor_player_name');
    if (savedName) document.getElementById('online-player-name').value = savedName;
    if (!playerId) {
        playerId = localStorage.getItem('impostor_player_id');
        if (!playerId) { playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('impostor_player_id', playerId); }
    }
}

function createRoom() {
    const name = document.getElementById('online-player-name').value.trim();
    if (!name) { showToast(t('nameRequired')); return; }
    localStorage.setItem('impostor_player_name', name);
    isHost = true;
    populateRoomCategoriesList();
    updateRoomImpostorSelector();
    document.querySelectorAll('[id^="room-lang-"]').forEach(b => b.style.borderColor = 'var(--border)');
    document.getElementById('room-lang-' + currentLang).style.borderColor = 'var(--accent)';
    onlineState.roomLang = currentLang;
    showScreen('screen-create-room');
}

function setRoomLanguage(lang) {
    onlineState.roomLang = lang;
    document.querySelectorAll('[id^="room-lang-"]').forEach(b => b.style.borderColor = 'var(--border)');
    document.getElementById('room-lang-' + lang).style.borderColor = 'var(--accent)';
    populateRoomCategoriesList();
}

function updateRoomImpostorSelector() {
    const sel = document.getElementById('room-impostor-selector');
    sel.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === 1 ? ' selected' : '');
        btn.textContent = i;
        btn.onclick = function() { sel.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected')); this.classList.add('selected'); onlineState.maxImpostors = i; };
        sel.appendChild(btn);
    }
}

function toggleRoomImpostorKnows() { const t = document.getElementById('room-toggle-impostor-knows'); onlineState.impostorKnows = !onlineState.impostorKnows; t.classList.toggle('active', onlineState.impostorKnows); }

function populateRoomCategoriesList() {
    const c = document.getElementById('room-categories-list');
    const cats = getWordCategories(onlineState.roomLang);
    c.innerHTML = cats.map((cat, i) => '<div class="category-item selected" data-idx="' + i + '" onclick="toggleRoomCategory(' + i + ')">' + cat.category + '</div>').join('');
    onlineState.selectedCategories = cats.map((_, i) => i);
}

function toggleRoomCategory(idx) {
    const item = document.querySelector('#room-categories-list .category-item[data-idx="' + idx + '"]');
    item.classList.toggle('selected');
    if (item.classList.contains('selected')) { if (!onlineState.selectedCategories.includes(idx)) onlineState.selectedCategories.push(idx); }
    else { onlineState.selectedCategories = onlineState.selectedCategories.filter(i => i !== idx); }
}

function toggleRoomAllCategories() {
    const tog = document.getElementById('room-toggle-all-categories');
    onlineState.allCategories = !onlineState.allCategories;
    tog.classList.toggle('active', onlineState.allCategories);
    document.getElementById('room-categories-list').style.display = onlineState.allCategories ? 'none' : 'grid';
    if (onlineState.allCategories) {
        const cats = getWordCategories(onlineState.roomLang);
        onlineState.selectedCategories = cats.map((_, i) => i);
        document.querySelectorAll('#room-categories-list .category-item').forEach(i => i.classList.add('selected'));
    }
}

function confirmCreateRoom() {
    if (!onlineState.allCategories && onlineState.selectedCategories.length === 0) { showToast(t('selectCategories')); return; }
    const mp = document.getElementById('room-max-points').value;
    onlineState.maxPoints = mp ? parseInt(mp) : null;
    onlineState.roomCode = generateRoomCode();
    const playerName = localStorage.getItem('impostor_player_name');
    roomRef = db.ref('rooms/' + onlineState.roomCode);
    roomRef.set({
        host: playerId, hostName: playerName,
        settings: { maxImpostors: onlineState.maxImpostors, impostorKnows: onlineState.impostorKnows, maxPoints: onlineState.maxPoints, allCategories: onlineState.allCategories, selectedCategories: onlineState.selectedCategories, roomLang: onlineState.roomLang },
        players: { [playerId]: { name: playerName, score: 0, isHost: true, online: true, joinedAt: firebase.database.ServerValue.TIMESTAMP } },
        gameState: { phase: 'lobby', round: 0 },
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { currentRoom = onlineState.roomCode; setupRoomListeners(); showLobby(); }).catch(e => { showToast('Error'); console.error(e); });
}

function showJoinRoom() {
    const name = document.getElementById('online-player-name').value.trim();
    if (!name) { showToast(t('nameRequired')); return; }
    localStorage.setItem('impostor_player_name', name);
    isHost = false;
    showScreen('screen-join-room');
}

function joinRoom() {
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (!code || code.length !== 4) { showToast(t('roomCode')); return; }
    const playerName = localStorage.getItem('impostor_player_name');
    if (!playerName) { showToast(t('nameRequired')); showScreen('screen-online-menu'); return; }
    updateConnectionStatus('connecting');
    roomRef = db.ref('rooms/' + code);
    roomRef.once('value').then(snap => {
        if (!snap.exists()) { showToast(t('roomNotFound')); updateConnectionStatus(''); return; }
        const data = snap.val();
        onlineState.roomCode = code; currentRoom = code; isHost = data.host === playerId;
        if (data.settings) {
            onlineState.maxImpostors = data.settings.maxImpostors; onlineState.impostorKnows = data.settings.impostorKnows;
            onlineState.maxPoints = data.settings.maxPoints; onlineState.allCategories = data.settings.allCategories;
            onlineState.selectedCategories = data.settings.selectedCategories || []; onlineState.roomLang = data.settings.roomLang || 'pt';
            currentLang = onlineState.roomLang; localStorage.setItem('impostor_lang', currentLang); applyTranslations();
        }
        roomRef.child('players/' + playerId).set({ name: playerName, score: 0, isHost: false, online: true, joinedAt: firebase.database.ServerValue.TIMESTAMP }).then(() => {
            setupRoomListeners(); updateConnectionStatus('');
            if (data.gameState && data.gameState.phase !== 'lobby') handleGameStateChange(data.gameState);
            else showLobby();
        });
    }).catch(e => { showToast('Error'); updateConnectionStatus(''); console.error(e); });
}

function setupRoomListeners() {
    roomRef.child('host').on('value', s => { isHost = s.val() === playerId; });
    roomRef.child('players').on('value', s => { onlineState.players = s.val() || {}; updateLobbyPlayers(); updateOnlinePlayersStatus(); });
    roomRef.child('gameState').on('value', s => { if (s.val()) handleGameStateChange(s.val()); });
    roomRef.child('votes').on('value', s => { onlineState.votes = s.val() || {}; updateVotesProgress(); checkAllVoted(); });
    roomRef.child('voteRequests').on('value', s => { onlineState.voteRequests = s.val() || {}; checkVoteMajority(); updateVoteRequestStatus(); });
    roomRef.child('readyPlayers').on('value', s => { onlineState.readyPlayers = s.val() ? Object.keys(s.val()) : []; updateReadyStatus(); checkAllReady(); });
    roomRef.child('kicked/' + playerId).on('value', s => { if (s.val()) { showToast('Você foi removido'); leaveRoom(); } });
    roomRef.child('players/' + playerId + '/online').onDisconnect().set(false);
    db.ref('.info/connected').on('value', s => { if (s.val()) roomRef.child('players/' + playerId + '/online').set(true); });
}

function showQRModal() {
    const url = 'https://edineibauer.github.io/impostor/?room=' + onlineState.roomCode;
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay" onclick="closeOverlay(event)"><div class="confirm-box" onclick="event.stopPropagation()"><h3>📱 Compartilhar Sala</h3><div class="room-code" style="font-size:2.5rem;margin:16px 0">' + onlineState.roomCode + '</div><div style="display:flex;justify-content:center;margin:16px 0"><div class="qr-wrapper" id="qr-modal-container"></div></div><p style="font-size:.65rem;color:var(--text-dim);word-break:break-all">' + url + '</p><button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:16px">' + t('close') + '</button></div></div>';
    if (typeof QRCode !== 'undefined') new QRCode(document.getElementById('qr-modal-container'), { text: url, width: 150, height: 150, colorDark: '#000', colorLight: '#fff' });
}

function confirmLeaveRoom() {
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay" onclick="closeOverlay(event)"><div class="confirm-box" onclick="event.stopPropagation()"><h3>⚠️ Sair da Sala?</h3><p style="color:var(--text-dim);font-size:.8rem;margin:16px 0">Tem certeza que deseja sair?</p><button class="btn btn-danger" onclick="closeOverlay();leaveRoom()" style="opacity:1;padding:12px">SIM, SAIR</button><button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:8px">' + t('cancel') + '</button></div></div>';
}

function showLobby() {
    document.getElementById('lobby-room-code').textContent = onlineState.roomCode;
    var qc = document.getElementById('qr-wrapper');
    if (qc) {
        qc.innerHTML = '';
        if (typeof QRCode !== 'undefined') new QRCode(qc, { text: 'https://edineibauer.github.io/impostor/?room=' + onlineState.roomCode, width: 150, height: 150, colorDark: '#000', colorLight: '#fff' });
    }
    document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
    document.getElementById('guest-waiting').style.display = isHost ? 'none' : 'block';
    updateRoomHeaders();
    showScreen('screen-lobby');
}

function updateRoomHeaders() {
    var headers = ['room-header-lobby', 'room-header-word', 'room-header-vote', 'room-header-result', 'room-header-round-end'];
    headers.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<div class="room-header-left"><div class="room-header-code" onclick="showQRModal()">🎮 ' + onlineState.roomCode + ' <span style="font-size:.7rem">📱</span></div></div><div class="room-header-right"><button class="profile-btn" onclick="showProfileModal()">👤</button><button class="leave-btn" onclick="confirmLeaveRoom()">✕</button></div>';
        }
    });
}

function updateLobbyPlayers() {
    const c = document.getElementById('lobby-players'); if (!c) return;
    const count = Object.keys(onlineState.players).length;
    document.getElementById('player-count').textContent = count;
    c.innerHTML = Object.entries(onlineState.players).map(function(entry) {
        var id = entry[0], p = entry[1];
        var isYou = id === playerId, isH = p.isHost;
        var badges = isH ? '<span class="player-badge">' + t('host') + '</span>' : '';
        badges += isYou ? '<span class="player-badge" style="background:var(--success)">' + t('you') + '</span>' : '';
        var kick = isHost && !isYou ? '<button class="kick-btn" onclick="confirmKickPlayer(\'' + id + '\',\'' + p.name.replace(/'/g, "\\'") + '\')">✕</button>' : '';
        return '<div class="player-item ' + (isH ? 'host' : '') + ' ' + (isYou ? 'you' : '') + '"><div class="player-avatar">' + p.name.charAt(0).toUpperCase() + '</div><span class="player-name">' + p.name + '</span>' + badges + '<div class="status-indicator ' + (p.online ? '' : 'offline') + '"></div>' + kick + '</div>';
    }).join('');
    var btn = document.getElementById('start-online-btn');
    if (btn) { btn.disabled = count < 3; btn.textContent = count < 3 ? t('minPlayers') : t('startGame'); }
}

function confirmKickPlayer(pid, name) {
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay" onclick="closeOverlay(event)"><div class="confirm-box" onclick="event.stopPropagation()"><h3>⚠️ Remover Jogador?</h3><p style="color:var(--text-dim);font-size:.8rem;margin:16px 0">Remover <strong>' + name + '</strong>?</p><button class="btn btn-danger" onclick="closeOverlay();kickPlayer(\'' + pid + '\')" style="opacity:1;padding:12px">SIM, REMOVER</button><button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:8px">' + t('cancel') + '</button></div></div>';
}

function kickPlayer(pid) { if (!isHost) return; roomRef.child('kicked/' + pid).set(true); roomRef.child('players/' + pid).remove(); }

function startOnlineGame() {
    if (!isHost) return;
    // Get only players that are not marked as new (mid-game joiners)
    var pids = Object.keys(onlineState.players).filter(function(id) {
        return !onlineState.players[id].isNew;
    });
    if (pids.length < 3) { showToast(t('minPlayers')); return; }
    var maxP = Math.floor((pids.length - 1) / 2);
    var actMax = Math.min(onlineState.maxImpostors, maxP);
    var impCount = Math.floor(Math.random() * actMax) + 1;
    var cats = getWordCategories(onlineState.roomLang);
    var avail = onlineState.allCategories ? cats : onlineState.selectedCategories.map(function(i) { return cats[i]; });
    var catData = avail[Math.floor(Math.random() * avail.length)];
    var word = catData.words[Math.floor(Math.random() * catData.words.length)];
    var shuffled = shuffle(pids);
    var impIds = shuffled.slice(0, impCount);
    var simWords = {};
    if (!onlineState.impostorKnows) impIds.forEach(function(id) { simWords[id] = findSimilarWordOnline(word, catData); });
    // Save active players for this round
    roomRef.child('gameState').set({ phase: 'playing', round: 1, word: word, category: catData.category, impostorIds: impIds, impostorKnows: onlineState.impostorKnows, similarWords: simWords, eliminated: [], votingRound: 0, roundPlayers: pids });
    roomRef.child('votes').remove(); roomRef.child('voteRequests').remove(); roomRef.child('readyPlayers').remove();
    // Clear isNew flag for all players
    pids.forEach(function(id) { roomRef.child('players/' + id + '/isNew').remove(); });
}

function findSimilarWordOnline(word, catData) {
    if (catData.similar && catData.similar[word]) return catData.similar[word][Math.floor(Math.random() * catData.similar[word].length)];
    var other = catData.words.filter(function(w) { return w !== word; });
    return other.length ? other[Math.floor(Math.random() * other.length)] : word;
}

function handleGameStateChange(gs) {
    onlineState.phase = gs.phase; onlineState.round = gs.round || 1; onlineState.word = gs.word; onlineState.category = gs.category;
    onlineState.impostorIds = gs.impostorIds || []; onlineState.eliminated = gs.eliminated || []; onlineState.votingRound = gs.votingRound || 0;
    switch(gs.phase) {
        case 'lobby': showLobby(); break;
        case 'playing': showOnlineWord(gs); break;
        case 'voting': showOnlineVoting(); break;
        case 'result': showOnlineResult(gs.lastResult); break;
        case 'roundEnd': showOnlineRoundEnd(gs); break;
        case 'gameOver': showOnlineGameOver(gs.winner); break;
    }
}

function showOnlineWord(gs) {
    document.getElementById('online-round-num').textContent = onlineState.round;
    var wt = document.getElementById('online-word-text');
    var ct = document.getElementById('online-category-tag');
    
    // Check if player is participating in this round
    var roundPlayers = gs.roundPlayers || Object.keys(onlineState.players);
    var isParticipating = roundPlayers.includes(playerId);
    
    if (!isParticipating) {
        // New player - show waiting message
        wt.textContent = '⏳ AGUARDANDO';
        wt.className = 'word-text';
        wt.style.color = 'var(--warning)';
        ct.textContent = 'Você entrará na próxima rodada';
        document.getElementById('online-word-display').style.display = 'block';
        document.getElementById('hide-word-btn').style.display = 'none';
        document.getElementById('word-hidden-container').style.display = 'none';
        document.getElementById('request-vote-control').style.display = 'none';
    } else {
        wt.style.color = '';
        var isImp = onlineState.impostorIds.includes(playerId);
        if (isImp) {
            if (gs.impostorKnows) { wt.textContent = t('impostor'); wt.className = 'word-text is-impostor'; }
            else { wt.textContent = (gs.similarWords && gs.similarWords[playerId]) || onlineState.word; wt.className = 'word-text is-word'; }
        } else { wt.textContent = onlineState.word; wt.className = 'word-text is-word'; }
        ct.textContent = 'Categoria: ' + onlineState.category;
        document.getElementById('online-word-display').style.display = 'block';
        document.getElementById('hide-word-btn').style.display = 'block';
        document.getElementById('word-hidden-container').style.display = 'none';
        document.getElementById('request-vote-control').style.display = 'block';
    }
    updateVoteRequestStatus(); updateOnlinePlayersStatus();
    updateRoomHeaders();
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

function requestVote() { roomRef.child('voteRequests/' + playerId).set(true); }

function checkVoteMajority() {
    if (onlineState.phase !== 'playing') return;
    var active = Object.keys(onlineState.players).filter(function(id) { return !onlineState.eliminated.includes(id); });
    var reqs = Object.keys(onlineState.voteRequests || {}).filter(function(id) { return active.includes(id); }).length;
    if (reqs >= Math.ceil(active.length / 2) && isHost) {
        roomRef.child('voteRequests').remove();
        roomRef.child('gameState/phase').set('voting');
        roomRef.child('gameState/votingRound').set((onlineState.votingRound || 0) + 1);
    }
}

function updateVoteRequestStatus() {
    var el = document.getElementById('vote-request-status'); if (!el) return;
    var active = Object.keys(onlineState.players).filter(function(id) { return !onlineState.eliminated.includes(id); });
    var reqs = Object.keys(onlineState.voteRequests || {}).filter(function(id) { return active.includes(id); }).length;
    var maj = Math.ceil(active.length / 2);
    var hasReq = onlineState.voteRequests && onlineState.voteRequests[playerId];
    var btn = document.getElementById('request-vote-btn');
    if (btn) { btn.disabled = hasReq; btn.textContent = hasReq ? '✓ Solicitado (' + reqs + '/' + maj + ')' : '🗳️ SOLICITAR VOTAÇÃO'; }
    el.textContent = reqs > 0 ? reqs + '/' + maj + ' querem votar' : '';
}

function updateOnlinePlayersStatus() {
    var c = document.getElementById('online-players-status'); if (!c) return;
    c.innerHTML = Object.entries(onlineState.players).map(function(entry) {
        var id = entry[0], p = entry[1];
        var elim = onlineState.eliminated.includes(id), isYou = id === playerId;
        var kick = isHost && !isYou && !elim ? '<button class="kick-btn" onclick="confirmKickPlayer(\'' + id + '\',\'' + p.name.replace(/'/g, "\\'") + '\')">✕</button>' : '';
        return '<div class="player-item ' + (elim ? 'eliminated' : '') + ' ' + (isYou ? 'you' : '') + '"><div class="player-avatar" style="' + (elim ? 'opacity:0.4' : '') + '">' + p.name.charAt(0).toUpperCase() + '</div><span class="player-name" style="' + (elim ? 'text-decoration:line-through;opacity:0.4' : '') + '">' + p.name + '</span>' + (isYou ? '<span class="player-badge" style="background:var(--success)">' + t('you') + '</span>' : '') + (elim ? '<span class="vote-status">' + t('eliminated') + '</span>' : '') + kick + '</div>';
    }).join('');
}

function showOnlineVoting() {
    var c = document.getElementById('online-vote-list');
    var myVote = onlineState.votes[playerId];
    var amElim = onlineState.eliminated.includes(playerId);
    c.innerHTML = Object.entries(onlineState.players).map(function(entry) {
        var id = entry[0], p = entry[1];
        if (id === playerId || onlineState.eliminated.includes(id)) return '';
        return '<button class="player-vote-btn ' + (myVote === id ? 'selected' : '') + '" onclick="castVote(\'' + id + '\')" ' + (amElim ? 'disabled' : '') + '>' + p.name + (myVote === id ? ' ✓' : '') + '</button>';
    }).join('');
    document.getElementById('vote-waiting').style.display = myVote || amElim ? 'block' : 'none';
    updateRoomHeaders();
    showScreen('screen-online-vote');
}

function castVote(tid) { if (onlineState.eliminated.includes(playerId)) return; roomRef.child('votes/' + playerId).set(tid); }

function updateVotesProgress() {
    var active = Object.keys(onlineState.players).filter(function(id) { return !onlineState.eliminated.includes(id); });
    var voted = Object.keys(onlineState.votes).filter(function(id) { return active.includes(id); }).length;
    var el = document.getElementById('votes-progress');
    if (el) el.textContent = voted + '/' + active.length;
}

function checkAllVoted() {
    if (onlineState.phase !== 'voting' || !isHost) return;
    var active = Object.keys(onlineState.players).filter(function(id) { return !onlineState.eliminated.includes(id); });
    var allVoted = active.every(function(id) { return onlineState.votes[id]; });
    if (allVoted && active.length > 0) processVotes();
}

function processVotes() {
    var active = Object.keys(onlineState.players).filter(function(id) { return !onlineState.eliminated.includes(id); });
    var counts = {};
    active.forEach(function(vid) { var t = onlineState.votes[vid]; if (t) counts[t] = (counts[t] || 0) + 1; });
    var maxV = 0, mostV = [];
    Object.entries(counts).forEach(function(entry) { var id = entry[0], c = entry[1]; if (c > maxV) { maxV = c; mostV = [id]; } else if (c === maxV) mostV.push(id); });
    if (mostV.length > 1) {
        roomRef.child('votes').remove();
        roomRef.child('gameState/lastResult').set({ type: 'tie', tiedPlayers: mostV.map(function(id) { return onlineState.players[id] ? onlineState.players[id].name : '?'; }) });
        roomRef.child('gameState/phase').set('result');
        return;
    }
    var elim = mostV[0], isImp = onlineState.impostorIds.includes(elim), elimName = onlineState.players[elim] ? onlineState.players[elim].name : '?';
    var newElim = onlineState.eliminated.slice(); newElim.push(elim);
    var isFirst = (onlineState.votingRound || 1) === 1;
    var changes = {};
    active.forEach(function(vid) {
        if (onlineState.votes[vid] === elim) changes[vid] = (changes[vid] || 0) + (isImp ? 1 : -1);
    });
    if (isImp && isFirst) changes[elim] = (changes[elim] || 0) - 1;
    if (!isImp) onlineState.impostorIds.forEach(function(iid) { if (!newElim.includes(iid)) changes[iid] = (changes[iid] || 0) + 1; });
    Object.entries(changes).forEach(function(entry) { roomRef.child('players/' + entry[0] + '/score').transaction(function(c) { return (c || 0) + entry[1]; }); });
    var remImp = onlineState.impostorIds.filter(function(id) { return !newElim.includes(id); });
    var remPlayers = Object.keys(onlineState.players).filter(function(id) { return !newElim.includes(id); });
    var remInn = remPlayers.filter(function(id) { return !onlineState.impostorIds.includes(id); });
    var gameEnd = null;
    if (remImp.length === 0) gameEnd = 'innocentsWin';
    else if (remInn.length <= remImp.length) gameEnd = 'impostorsWin';
    roomRef.child('gameState/eliminated').set(newElim);
    roomRef.child('gameState/lastResult').set({ type: isImp ? 'correct' : 'wrong', eliminatedId: elim, eliminatedName: elimName, wasImpostor: isImp, scoreChanges: changes, remainingImpostors: remImp.length, gameEnd: gameEnd });
    roomRef.child('votes').remove();
    roomRef.child('gameState/phase').set('result');
}

function showOnlineResult(r) {
    var c = document.getElementById('online-result-content');
    if (r.type === 'tie') {
        c.innerHTML = '<div class="result-icon">⚖️</div><h3 style="color:var(--warning)">EMPATE!</h3><p style="color:var(--text-dim);margin:14px 0">Votem novamente!</p><p style="font-size:.8rem;color:var(--text-dim)">' + (r.tiedPlayers ? r.tiedPlayers.join(', ') : '') + '</p>';
        document.getElementById('continue-voting-btn').style.display = 'block';
        document.getElementById('continue-voting-btn').textContent = '🗳️ VOTAR NOVAMENTE';
    } else {
        var icon = r.wasImpostor ? '✅' : '❌', color = r.wasImpostor ? 'var(--success)' : '#ff4444';
        var scHTML = '';
        if (r.scoreChanges) {
            var scParts = [];
            Object.entries(r.scoreChanges).forEach(function(entry) {
                var id = entry[0], d = entry[1];
                var n = onlineState.players[id] ? onlineState.players[id].name : '?', col = d > 0 ? 'var(--success)' : '#ff4444';
                scParts.push('<span style="color:' + col + '">' + n + ': ' + (d > 0 ? '+' : '') + d + '</span>');
            });
            scHTML = '<p style="font-size:.75rem;margin-top:10px">' + scParts.join(', ') + '</p>';
        }
        c.innerHTML = '<div class="result-icon">' + icon + '</div><h3 style="color:' + color + '">' + (r.wasImpostor ? t('correct') : t('wrong')) + '</h3><p style="font-size:1.1rem;margin:14px 0"><strong>' + r.eliminatedName + '</strong> ' + (r.wasImpostor ? t('wasImpostor') : t('wasInnocent')) + '</p>' + (r.remainingImpostors > 0 && !r.wasImpostor ? '<p style="color:var(--text-dim);font-size:.85rem">' + t('hiddenImpostors').replace('{n}', r.remainingImpostors) + '</p>' : '') + (r.wasImpostor && r.remainingImpostors > 0 ? '<p style="color:var(--warning);font-size:.85rem">' + t('remainingImpostors').replace('{n}', r.remainingImpostors) + '</p>' : '') + scHTML;
        var btn = document.getElementById('continue-voting-btn');
        if (r.gameEnd) { btn.style.display = 'none'; setTimeout(function() { if (isHost) roomRef.child('gameState/phase').set('roundEnd'); }, 3000); }
        else { btn.style.display = 'block'; btn.textContent = t('continueVoting'); }
    }
    updateRoomHeaders();
    showScreen('screen-online-result');
}

function continueOnlineVoting() {
    roomRef.child('votes').remove();
    roomRef.child('voteRequests').remove();
    roomRef.child('gameState/phase').set('playing');
}

function showOnlineRoundEnd(gs) {
    var c = document.getElementById('online-round-summary');
    var impNames = onlineState.impostorIds.map(function(id) { return onlineState.players[id] ? onlineState.players[id].name : '?'; }).join(', ');
    var endMsg = '';
    if (gs.lastResult && gs.lastResult.gameEnd === 'innocentsWin') endMsg = '<div class="result-icon">🎉</div><h3 style="color:var(--success)">INOCENTES VENCERAM!</h3>';
    else if (gs.lastResult && gs.lastResult.gameEnd === 'impostorsWin') endMsg = '<div class="result-icon">🎭</div><h3 style="color:var(--accent)">' + t('impostorWins') + '</h3>';
    c.innerHTML = endMsg + '<p style="margin:14px 0;color:var(--text-dim);font-size:.85rem">' + t(onlineState.impostorIds.length > 1 ? 'impostorsWere' : 'impostorWas') + '</p><p style="font-size:1.2rem;color:var(--accent);font-family:\'Bebas Neue\',sans-serif">' + impNames + '</p><p style="margin:14px 0;font-size:.9rem">' + t('word') + ' <strong style="color:var(--success)">' + onlineState.word + '</strong></p><p style="font-size:.75rem;color:var(--text-dim)">Categoria: ' + onlineState.category + '</p>';
    updateOnlineRanking();
    document.getElementById('ready-next-btn').disabled = false;
    document.getElementById('ready-next-btn').textContent = t('ready');
    updateRoomHeaders();
    showScreen('screen-online-round-end');
}

function updateOnlineRanking() {
    var sorted = Object.entries(onlineState.players).map(function(entry) { return { name: entry[1].name, score: entry[1].score || 0 }; }).sort(function(a, b) { return b.score - a.score; });
    document.getElementById('online-ranking-list').innerHTML = sorted.map(function(p, i) {
        var cls = 'ranking-item';
        if (i === 0 && p.score > 0) cls += ' gold'; else if (i === 1 && p.score > 0) cls += ' silver'; else if (i === 2 && p.score > 0) cls += ' bronze';
        return '<li class="' + cls + '"><div class="ranking-position">' + (i + 1) + '</div><span class="ranking-name">' + p.name + '</span><span class="ranking-score ' + (p.score < 0 ? 'negative' : '') + '">' + p.score + '</span></li>';
    }).join('');
}

function readyNextRound() {
    roomRef.child('readyPlayers/' + playerId).set(true);
    document.getElementById('ready-next-btn').disabled = true;
    document.getElementById('ready-next-btn').textContent = t('waitingPlayers') + '...';
}

function updateReadyStatus() {
    var total = Object.keys(onlineState.players).length, ready = onlineState.readyPlayers.length;
    var el = document.getElementById('ready-status');
    if (el) el.textContent = ready + '/' + total + ' ' + t('ready').toLowerCase();
}

function checkAllReady() {
    if (onlineState.phase !== 'roundEnd' || !isHost) return;
    var all = Object.keys(onlineState.players);
    var allReady = all.every(function(id) { return onlineState.readyPlayers.includes(id); });
    if (allReady && all.length > 0) {
        if (onlineState.maxPoints) {
            for (var i = 0; i < Object.entries(onlineState.players).length; i++) {
                var entry = Object.entries(onlineState.players)[i];
                if ((entry[1].score || 0) >= onlineState.maxPoints) {
                    roomRef.child('gameState/phase').set('gameOver');
                    roomRef.child('gameState/winner').set({ id: entry[0], name: entry[1].name, score: entry[1].score });
                    return;
                }
            }
        }
        startNextOnlineRound();
    }
}

function startNextOnlineRound() {
    var nr = onlineState.round + 1;
    var cats = getWordCategories(onlineState.roomLang);
    var avail = onlineState.allCategories ? cats : onlineState.selectedCategories.map(function(i) { return cats[i]; });
    var catData = avail[Math.floor(Math.random() * avail.length)];
    var word = catData.words[Math.floor(Math.random() * catData.words.length)];
    // All players participate in new round (including those who joined mid-game)
    var pids = Object.keys(onlineState.players);
    var maxP = Math.floor((pids.length - 1) / 2);
    var actMax = Math.min(onlineState.maxImpostors, maxP);
    var impCount = Math.floor(Math.random() * actMax) + 1;
    var shuffled = shuffle(pids);
    var impIds = shuffled.slice(0, impCount);
    var simWords = {};
    if (!onlineState.impostorKnows) impIds.forEach(function(id) { simWords[id] = findSimilarWordOnline(word, catData); });
    roomRef.child('gameState').set({ phase: 'playing', round: nr, word: word, category: catData.category, impostorIds: impIds, impostorKnows: onlineState.impostorKnows, similarWords: simWords, eliminated: [], votingRound: 0, roundPlayers: pids });
    roomRef.child('readyPlayers').remove();
    roomRef.child('votes').remove();
    roomRef.child('voteRequests').remove();
    // Clear isNew flag for all players
    pids.forEach(function(id) { roomRef.child('players/' + id + '/isNew').remove(); });
}

function showOnlineGameOver(winner) {
    document.getElementById('winner-name').textContent = winner.name;
    var sorted = Object.entries(onlineState.players).map(function(entry) { return { name: entry[1].name, score: entry[1].score || 0 }; }).sort(function(a, b) { return b.score - a.score; });
    document.getElementById('final-ranking-list').innerHTML = sorted.map(function(p, i) {
        var cls = 'ranking-item';
        if (i === 0) cls += ' gold'; else if (i === 1) cls += ' silver'; else if (i === 2) cls += ' bronze';
        return '<li class="' + cls + '"><div class="ranking-position">' + (i + 1) + '</div><span class="ranking-name">' + p.name + '</span><span class="ranking-score ' + (p.score < 0 ? 'negative' : '') + '">' + p.score + '</span></li>';
    }).join('');
    document.getElementById('host-restart-controls').style.display = isHost ? 'block' : 'none';
    showScreen('screen-online-game-over');
}

function restartOnlineGame() {
    if (!isHost) return;
    Object.keys(onlineState.players).forEach(function(id) { roomRef.child('players/' + id + '/score').set(0); });
    roomRef.child('votes').remove();
    roomRef.child('voteRequests').remove();
    roomRef.child('readyPlayers').remove();
    roomRef.child('kicked').remove();
    roomRef.child('gameState').set({ phase: 'lobby', round: 0 });
}

function leaveRoom() {
    if (roomRef) { roomRef.child('players/' + playerId).remove(); roomRef.off(); }
    roomRef = null; currentRoom = null; isHost = false;
    onlineState = { roomCode: null, players: {}, round: 1, word: null, category: null, impostorIds: [], votes: {}, eliminated: [], phase: 'lobby', maxImpostors: 1, impostorKnows: true, maxPoints: null, allCategories: true, selectedCategories: [], roomLang: 'pt', votingRound: 0, readyPlayers: [], voteRequests: {} };
    updateConnectionStatus('');
    showScreen('screen-mode');
}
