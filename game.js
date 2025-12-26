// GAME STATE
let state = {
    playerCount: 4,
    maxImpostors: 1,
    players: [],
    scores: {},
    currentPlayerIndex: 0,
    word: null,
    category: null,
    impostorIndices: [],
    actualImpostorCount: 0,
    round: 1,
    seenPlayers: [],
    gameInProgress: false,
    eliminatedPlayers: [],
    revealedImpostors: []
};

// STORAGE
function saveState() {
    try { localStorage.setItem('impostor_game_state', JSON.stringify(state)); } catch (e) {}
}
function loadState() {
    try {
        const saved = localStorage.getItem('impostor_game_state');
        if (saved) {
            const loaded = JSON.parse(saved);
            if (loaded.gameInProgress) { 
                state = loaded; 
                // Ensure new properties exist
                if (!state.eliminatedPlayers) state.eliminatedPlayers = [];
                if (!state.revealedImpostors) state.revealedImpostors = [];
                return true; 
            }
        }
    } catch (e) {}
    return false;
}
function clearState() {
    try { localStorage.removeItem('impostor_game_state'); } catch (e) {}
}

// UTILITIES
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    saveState();
}
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function closeOverlay(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('overlay-container').innerHTML = '';
}

// INIT PLAYER SELECTOR (3-20)
function initPlayerSelector() {
    const selector = document.getElementById('player-selector');
    selector.innerHTML = '';
    for (let i = 3; i <= 20; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === 4 ? ' selected' : '');
        btn.dataset.num = i;
        btn.textContent = i;
        selector.appendChild(btn);
    }
}

// SELECTORS
document.getElementById('player-selector').addEventListener('click', function(e) {
    if (e.target.classList.contains('number-btn')) {
        this.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        state.playerCount = parseInt(e.target.dataset.num);
        generatePlayerInputs();
        updateImpostorSelector();
    }
});
document.getElementById('impostor-selector').addEventListener('click', function(e) {
    if (e.target.classList.contains('number-btn')) {
        this.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        state.maxImpostors = parseInt(e.target.dataset.num);
    }
});
function updateImpostorSelector() {
    const maxPossible = Math.floor(state.playerCount / 2);
    const selector = document.getElementById('impostor-selector');
    selector.innerHTML = '';
    for (let i = 1; i <= Math.min(maxPossible, 5); i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === 1 ? ' selected' : '');
        btn.dataset.num = i;
        btn.textContent = i;
        selector.appendChild(btn);
    }
    state.maxImpostors = 1;
}
function generatePlayerInputs() {
    const container = document.getElementById('player-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= state.playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'player-config';
        div.innerHTML = '<div class="player-number">' + i + '</div><input type="text" id="player-' + i + '" placeholder="Jogador ' + i + '" maxlength="15">';
        container.appendChild(div);
    }
}

// GAME LOGIC
function startGame() {
    state.players = [];
    state.scores = {};
    for (let i = 1; i <= state.playerCount; i++) {
        const name = document.getElementById('player-' + i).value.trim() || 'Jogador ' + i;
        state.players.push(name);
        state.scores[name] = 0;
    }
    state.players = shuffle(state.players);
    state.round = 1;
    state.gameInProgress = true;
    state.eliminatedPlayers = [];
    state.revealedImpostors = [];
    startRound();
}
function startRound() {
    const categoryData = wordCategories[Math.floor(Math.random() * wordCategories.length)];
    state.word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    state.category = categoryData.category;
    state.actualImpostorCount = Math.floor(Math.random() * state.maxImpostors) + 1;
    state.impostorIndices = [];
    const indices = [...Array(state.players.length).keys()];
    const shuffledIndices = shuffle(indices);
    for (let i = 0; i < state.actualImpostorCount; i++) {
        state.impostorIndices.push(shuffledIndices[i]);
    }
    state.currentPlayerIndex = 0;
    state.seenPlayers = [];
    state.eliminatedPlayers = [];
    state.revealedImpostors = [];
    state.players = shuffle(state.players);
    saveState();
    showPlayerTurn();
}
function showPlayerTurn() {
    document.getElementById('turn-round-num').textContent = state.round;
    document.getElementById('current-player-name').textContent = state.players[state.currentPlayerIndex];
    const progress = document.getElementById('players-progress');
    progress.innerHTML = state.players.map((name, idx) => {
        let cls = 'player-chip';
        if (idx === state.currentPlayerIndex) cls += ' current';
        else if (state.seenPlayers.includes(idx)) cls += ' seen';
        return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
    showScreen('screen-turn');
}
function showWord() {
    const isImpostor = state.impostorIndices.includes(state.currentPlayerIndex);
    const wordText = document.getElementById('word-text');
    const categoryTag = document.getElementById('category-tag');
    const wordDisplay = document.getElementById('word-display');
    wordDisplay.classList.remove('word-reveal-animation');
    void wordDisplay.offsetWidth;
    wordDisplay.classList.add('word-reveal-animation');
    if (isImpostor) {
        wordText.textContent = '🎭 IMPOSTOR';
        wordText.className = 'word-text is-impostor';
    } else {
        wordText.textContent = state.word;
        wordText.className = 'word-text is-word';
    }
    categoryTag.textContent = state.category;
    showScreen('screen-word');
}
function nextPlayer() {
    state.seenPlayers.push(state.currentPlayerIndex);
    state.currentPlayerIndex++;
    if (state.currentPlayerIndex >= state.players.length) {
        showGameScreen();
    } else {
        showPlayerTurn();
    }
    saveState();
}
function showGameScreen() {
    document.getElementById('game-round-num').textContent = state.round;
    document.getElementById('total-players').textContent = state.players.length;
    const impostorDisplay = state.maxImpostors > 1 ? '1-' + state.maxImpostors : '1';
    document.getElementById('impostor-count-display').textContent = impostorDisplay;
    updateGamePlayersList();
    showScreen('screen-game');
}
function updateGamePlayersList() {
    const gamePlayers = document.getElementById('game-players');
    gamePlayers.innerHTML = state.players.map((name, idx) => {
        let cls = 'player-chip';
        if (state.eliminatedPlayers.includes(idx)) cls += ' eliminated';
        return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
}

// VOTING SYSTEM
function showVoteScreen() {
    const activePlayers = state.players.filter((_, idx) => !state.eliminatedPlayers.includes(idx));
    
    if (activePlayers.length <= state.actualImpostorCount - state.revealedImpostors.length) {
        showToast('Não há jogadores suficientes para votar!');
        return;
    }
    
    let playerButtonsHTML = state.players.map((name, idx) => {
        const isEliminated = state.eliminatedPlayers.includes(idx);
        return '<button class="player-vote-btn' + (isEliminated ? ' eliminated' : '') + '" onclick="votePlayer(' + idx + ')" ' + (isEliminated ? 'disabled' : '') + '>' + name + '</button>';
    }).join('');
    
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay"><div class="confirm-box"><h3>🗳️ QUEM É O IMPOSTOR?</h3><p style="color:var(--text-dim);font-size:.8rem;margin-bottom:16px">Escolha quem vocês acham que é o impostor:</p><div class="player-vote-list">' + playerButtonsHTML + '</div><button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:20px">CANCELAR</button></div></div>';
}

function votePlayer(playerIndex) {
    const playerName = state.players[playerIndex];
    const isImpostor = state.impostorIndices.includes(playerIndex);
    
    state.eliminatedPlayers.push(playerIndex);
    
    if (isImpostor) {
        state.revealedImpostors.push(playerIndex);
    }
    
    saveState();
    
    showVoteResult(playerName, isImpostor, playerIndex);
}

function showVoteResult(playerName, wasImpostor, playerIndex) {
    const remainingImpostors = state.actualImpostorCount - state.revealedImpostors.length;
    const allImpostorsFound = remainingImpostors === 0;
    
    let resultHTML = '';
    if (wasImpostor) {
        resultHTML = '<div class="result-icon">✅</div><h3 style="color:var(--success)">ACERTARAM!</h3><p style="font-size:1.2rem;margin:16px 0"><strong>' + playerName + '</strong> era um impostor!</p>';
        if (!allImpostorsFound) {
            resultHTML += '<p style="color:var(--warning);font-size:.85rem">Ainda há ' + remainingImpostors + ' impostor(es) restante(s)!</p>';
        }
    } else {
        resultHTML = '<div class="result-icon">❌</div><h3 style="color:#ff4444">ERRARAM!</h3><p style="font-size:1.2rem;margin:16px 0"><strong>' + playerName + '</strong> era inocente!</p><p style="color:var(--text-dim);font-size:.85rem">Ainda há ' + remainingImpostors + ' impostor(es) escondido(s)!</p>';
    }
    
    // Score controls
    let scoreControlsHTML = '<div class="section-title">AJUSTAR PONTOS</div><div class="score-controls">';
    state.players.forEach(name => {
        const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
        scoreControlsHTML += '<div class="score-player"><span class="score-player-name">' + name + '</span><div class="score-btns"><button class="score-btn minus" onclick="adjustScore(\'' + name.replace(/'/g, "\\'") + '\', -1)">−</button><span class="score-value" id="score-' + safeId + '">' + state.scores[name] + '</span><button class="score-btn plus" onclick="adjustScore(\'' + name.replace(/'/g, "\\'") + '\', 1)">+</button></div></div>';
    });
    scoreControlsHTML += '</div>';
    
    let buttonsHTML = '';
    if (allImpostorsFound) {
        buttonsHTML = '<button class="btn btn-primary" onclick="closeOverlay();showRoundSummary();" style="margin-top:16px">VER RESUMO DA RODADA</button>';
    } else {
        buttonsHTML = '<button class="btn btn-warning" onclick="closeOverlay();showVoteScreen();" style="margin-top:16px">CONTINUAR VOTANDO</button><button class="btn btn-secondary" onclick="closeOverlay();updateGamePlayersList();" style="margin-top:8px">VOLTAR AO JOGO</button>';
    }
    
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay"><div class="confirm-box">' + resultHTML + scoreControlsHTML + buttonsHTML + '</div></div>';
}

function showRoundSummary() {
    const impostorNames = state.impostorIndices.map(i => state.players[i]);
    
    let scoreControlsHTML = state.players.map(name => {
        const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
        return '<div class="score-player"><span class="score-player-name">' + name + '</span><div class="score-btns"><button class="score-btn minus" onclick="adjustScore(\'' + name.replace(/'/g, "\\'") + '\', -1)">−</button><span class="score-value" id="score-' + safeId + '">' + state.scores[name] + '</span><button class="score-btn plus" onclick="adjustScore(\'' + name.replace(/'/g, "\\'") + '\', 1)">+</button></div></div>';
    }).join('');
    
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay"><div class="confirm-box"><h3>🏁 FIM DA RODADA ' + state.round + '</h3><p style="margin-bottom:8px;color:var(--text-dim);font-size:.8rem">' + (state.actualImpostorCount > 1 ? 'Os impostores eram:' : 'O impostor era:') + '</p><p style="font-size:1.3rem;color:var(--accent);margin:12px 0;font-family:\'Bebas Neue\',sans-serif;letter-spacing:2px">' + impostorNames.join(', ') + '</p><p style="margin:16px 0;font-size:.9rem">Palavra: <strong style="color:var(--success)">' + state.word + '</strong></p><div class="section-title">PONTUAÇÃO FINAL</div><div class="score-controls">' + scoreControlsHTML + '</div><button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:16px">PRÓXIMA RODADA</button><button class="btn btn-secondary" onclick="closeOverlay();showGameScreen();" style="margin-top:8px">FECHAR</button></div></div>';
}

function adjustScore(name, delta) {
    state.scores[name] += delta;
    const el = document.getElementById('score-' + name.replace(/[^a-zA-Z0-9]/g, '_'));
    if (el) el.textContent = state.scores[name];
    saveState();
}
function newRound() {
    state.round++;
    startRound();
    showToast('Rodada ' + state.round);
}
function showRanking() {
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return '<li class="' + cls + '"><div class="ranking-position">' + (idx + 1) + '</div><span class="ranking-name">' + name + '</span><span class="' + scoreClass + '">' + score + '</span></li>';
    }).join('');
    document.getElementById('ranking-list').innerHTML = rankingHTML;
    showScreen('screen-ranking');
}
function confirmNewGame() {
    document.getElementById('overlay-container').innerHTML = '<div class="confirm-overlay" onclick="closeOverlay(event)"><div class="confirm-box" onclick="event.stopPropagation()"><h3>⚠️ REINICIAR?</h3><p style="color:var(--text-dim);font-size:.85rem;margin-bottom:20px">Isso vai apagar todas as pontuações e reiniciar o jogo do zero.</p><button class="btn btn-danger" onclick="resetGame()" style="opacity:1;padding:14px">SIM, REINICIAR TUDO</button><button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:8px">CANCELAR</button></div></div>';
}
function resetGame() {
    closeOverlay();
    state = { playerCount: 4, maxImpostors: 1, players: [], scores: {}, currentPlayerIndex: 0, word: null, category: null, impostorIndices: [], actualImpostorCount: 0, round: 1, seenPlayers: [], gameInProgress: false, eliminatedPlayers: [], revealedImpostors: [] };
    clearState();
    generatePlayerInputs();
    showScreen('screen-home');
    showToast('Jogo reiniciado');
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

// INIT
initPlayerSelector();
generatePlayerInputs();
if (loadState()) {
    if (state.gameInProgress) {
        if (state.seenPlayers.length >= state.players.length) {
            showGameScreen();
        } else {
            showPlayerTurn();
        }
        showToast('Jogo restaurado');
    }
}
