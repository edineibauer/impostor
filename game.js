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
    revealedImpostors: [],
    impostorKnows: true,
    similarWords: {}
};

// GET WORDS BY LANGUAGE
function getWordCategories() {
    switch(currentLang) {
        case 'en': return wordCategoriesEN;
        case 'es': return wordCategoriesES;
        default: return wordCategoriesPT;
    }
}

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
                if (!state.eliminatedPlayers) state.eliminatedPlayers = [];
                if (!state.revealedImpostors) state.revealedImpostors = [];
                if (state.impostorKnows === undefined) state.impostorKnows = true;
                if (!state.similarWords) state.similarWords = {};
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

// UPDATE IMPOSTOR SELECTOR BASED ON PLAYER COUNT
function updateImpostorSelector() {
    const maxPossible = Math.floor((state.playerCount - 1) / 2);
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

function toggleImpostorKnows() {
    const toggle = document.getElementById('toggle-impostor-knows');
    state.impostorKnows = !state.impostorKnows;
    toggle.classList.toggle('active', state.impostorKnows);
}

function generatePlayerInputs() {
    const container = document.getElementById('player-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= state.playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'player-config';
        div.innerHTML = '<div class="player-number">' + i + '</div><input type="text" id="player-' + i + '" placeholder="' + t('player') + ' ' + i + '" maxlength="15">';
        container.appendChild(div);
    }
}

// FIND SIMILAR WORD (not synonym, but related/close)
function findSimilarWord(originalWord, category) {
    const categories = getWordCategories();
    const categoryData = categories.find(c => c.category === category);
    
    if (categoryData && categoryData.similar && categoryData.similar[originalWord]) {
        const similarOptions = categoryData.similar[originalWord];
        return similarOptions[Math.floor(Math.random() * similarOptions.length)];
    }
    
    // Fallback: pick another word from same category
    if (categoryData) {
        const otherWords = categoryData.words.filter(w => w !== originalWord);
        if (otherWords.length > 0) {
            return otherWords[Math.floor(Math.random() * otherWords.length)];
        }
    }
    
    return originalWord;
}

// GAME LOGIC
function startGame() {
    state.players = [];
    state.scores = {};
    for (let i = 1; i <= state.playerCount; i++) {
        const name = document.getElementById('player-' + i).value.trim() || t('player') + ' ' + i;
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
    const categories = getWordCategories();
    const categoryData = categories[Math.floor(Math.random() * categories.length)];
    state.word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    state.category = categoryData.category;
    state.actualImpostorCount = Math.floor(Math.random() * state.maxImpostors) + 1;
    state.impostorIndices = [];
    state.similarWords = {};
    
    const indices = [...Array(state.players.length).keys()];
    const shuffledIndices = shuffle(indices);
    for (let i = 0; i < state.actualImpostorCount; i++) {
        const impostorIdx = shuffledIndices[i];
        state.impostorIndices.push(impostorIdx);
        
        // Generate similar word for this impostor if mode is "doesn't know"
        if (!state.impostorKnows) {
            state.similarWords[impostorIdx] = findSimilarWord(state.word, state.category);
        }
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
        if (state.impostorKnows) {
            // Impostor knows they are impostor
            wordText.textContent = t('impostor');
            wordText.className = 'word-text is-impostor';
            categoryTag.textContent = state.category;
        } else {
            // Impostor gets similar word (doesn't know they're impostor)
            // Same color as normal word so they don't know
            const similarWord = state.similarWords[state.currentPlayerIndex] || state.word;
            wordText.textContent = similarWord;
            wordText.className = 'word-text is-word';
            categoryTag.textContent = state.category;
        }
    } else {
        wordText.textContent = state.word;
        wordText.className = 'word-text is-word';
        categoryTag.textContent = state.category;
    }
    
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
        showToast('Não há jogadores suficientes!');
        return;
    }
    
    let playerButtonsHTML = state.players.map((name, idx) => {
        const isEliminated = state.eliminatedPlayers.includes(idx);
        return '<button class="player-vote-btn' + (isEliminated ? ' eliminated' : '') + '" onclick="votePlayer(' + idx + ')" ' + (isEliminated ? 'disabled' : '') + '>' + name + '</button>';
    }).join('');
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>${t('whoIsImpostor')}</h3>
                <p style="color:var(--text-dim);font-size:.75rem;margin-bottom:14px">${t('chooseWhoYouThink')}</p>
                <div class="player-vote-list">${playerButtonsHTML}</div>
                <button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:18px">${t('cancel')}</button>
            </div>
        </div>
    `;
}

function votePlayer(playerIndex) {
    const playerName = state.players[playerIndex];
    const isImpostor = state.impostorIndices.includes(playerIndex);
    
    state.eliminatedPlayers.push(playerIndex);
    
    if (isImpostor) {
        state.revealedImpostors.push(playerIndex);
    }
    
    saveState();
    
    // Check if impostors won (only impostors remain)
    const remainingPlayers = state.players.filter((_, idx) => !state.eliminatedPlayers.includes(idx));
    const remainingImpostors = state.impostorIndices.filter(idx => !state.eliminatedPlayers.includes(idx));
    
    // Impostors win if all remaining players are impostors
    const impostorsWon = remainingPlayers.length > 0 && 
                         remainingPlayers.every((_, i) => {
                             const originalIdx = state.players.findIndex((p, idx) => 
                                 !state.eliminatedPlayers.includes(idx) && 
                                 state.players.filter((_, j) => !state.eliminatedPlayers.includes(j)).indexOf(p) === i
                             );
                             // Find actual remaining indices
                             const remainingIndices = state.players.map((_, idx) => idx).filter(idx => !state.eliminatedPlayers.includes(idx));
                             return remainingIndices.every(idx => state.impostorIndices.includes(idx));
                         });
    
    // Simpler check: remaining non-eliminated indices that are impostors
    const remainingIndices = state.players.map((_, idx) => idx).filter(idx => !state.eliminatedPlayers.includes(idx));
    const allRemainingAreImpostors = remainingIndices.length > 0 && remainingIndices.every(idx => state.impostorIndices.includes(idx));
    
    if (allRemainingAreImpostors && !isImpostor) {
        // Wrong vote and only impostors remain - impostors win!
        showImpostorWins(playerName);
    } else {
        showVoteResult(playerName, isImpostor, playerIndex);
    }
}

function showImpostorWins(eliminatedPlayerName) {
    const impostorNames = state.impostorIndices.map(i => state.players[i]);
    const impostorLabel = state.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Build ranking display
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
    
    // Show similar words if mode was "doesn't know"
    let similarWordsInfo = '';
    if (!state.impostorKnows && Object.keys(state.similarWords).length > 0) {
        const similarList = state.impostorIndices.map(idx => {
            const name = state.players[idx];
            const word = state.similarWords[idx];
            return `${name}: ${word}`;
        }).join(', ');
        similarWordsInfo = `<p style="font-size:.75rem;color:var(--text-dim);margin-top:8px">${t('impostorWords')}: ${similarList}</p>`;
    }
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <div class="result-icon">🎭</div>
                <h3 style="color:var(--accent)">${t('impostorWins')}</h3>
                <p style="font-size:.9rem;margin:14px 0;color:var(--text-dim)">${t('eliminatedWrong')}</p>
                <p style="margin-bottom:6px;color:var(--text-dim);font-size:.75rem">${impostorLabel}</p>
                <p style="font-size:1.2rem;color:var(--accent);margin:10px 0;font-family:'Bebas Neue',sans-serif;letter-spacing:2px">${impostorNames.join(', ')}</p>
                <p style="margin:14px 0;font-size:.85rem">${t('word')} <strong style="color:var(--success)">${state.word}</strong></p>
                ${similarWordsInfo}
                <div class="section-title">🏆 RANKING</div>
                <ul class="ranking-list">${rankingHTML}</ul>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
}

function voteResultHTML(playerName, wasImpostor) {
    const remainingImpostors = state.actualImpostorCount - state.revealedImpostors.length;
    
    if (wasImpostor) {
        let html = `<div class="result-icon">✅</div><h3 style="color:var(--success)">${t('correct')}</h3>
            <p style="font-size:1.1rem;margin:14px 0"><strong>${playerName}</strong> ${t('wasImpostor')}</p>`;
        if (remainingImpostors > 0) {
            html += `<p style="color:var(--warning);font-size:.8rem">${t('remainingImpostors').replace('{n}', remainingImpostors)}</p>`;
        }
        return html;
    } else {
        return `<div class="result-icon">❌</div><h3 style="color:#ff4444">${t('wrong')}</h3>
            <p style="font-size:1.1rem;margin:14px 0"><strong>${playerName}</strong> ${t('wasInnocent')}</p>
            <p style="color:var(--text-dim);font-size:.8rem">${t('hiddenImpostors').replace('{n}', remainingImpostors)}</p>`;
    }
}

function showVoteResult(playerName, wasImpostor, playerIndex) {
    const remainingImpostors = state.actualImpostorCount - state.revealedImpostors.length;
    const allImpostorsFound = remainingImpostors === 0;
    
    let resultHTML = voteResultHTML(playerName, wasImpostor);
    let scoreControlsHTML = buildScoreControls();
    
    let buttonsHTML = '';
    if (allImpostorsFound) {
        buttonsHTML = `<button class="btn btn-primary" onclick="closeOverlay();showRoundSummary();" style="margin-top:14px">${t('seeRoundSummary')}</button>`;
    } else {
        // Only continue voting button, no back to game
        buttonsHTML = `<button class="btn btn-warning" onclick="closeOverlay();showVoteScreen();" style="margin-top:14px">${t('continueVoting')}</button>`;
    }
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                ${resultHTML}
                <div class="section-title">${t('adjustPoints')}</div>
                <div class="score-controls">${scoreControlsHTML}</div>
                ${buttonsHTML}
            </div>
        </div>
    `;
}

function buildScoreControls() {
    return state.players.map(name => {
        const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
        return `<div class="score-player">
            <span class="score-player-name">${name}</span>
            <div class="score-btns">
                <button class="score-btn minus" onclick="adjustScore('${name.replace(/'/g, "\\'")}', -1)">−</button>
                <span class="score-value" id="score-${safeId}">${state.scores[name]}</span>
                <button class="score-btn plus" onclick="adjustScore('${name.replace(/'/g, "\\'")}', 1)">+</button>
            </div>
        </div>`;
    }).join('');
}

function showRoundSummary() {
    const impostorNames = state.impostorIndices.map(i => state.players[i]);
    const impostorLabel = state.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Show similar words if mode was "doesn't know"
    let similarWordsInfo = '';
    if (!state.impostorKnows && Object.keys(state.similarWords).length > 0) {
        const similarList = state.impostorIndices.map(idx => {
            const name = state.players[idx];
            const word = state.similarWords[idx];
            return `${name}: ${word}`;
        }).join(', ');
        similarWordsInfo = `<p style="font-size:.75rem;color:var(--text-dim);margin-top:8px">${t('impostorWords')}: ${similarList}</p>`;
    }
    
    // Build ranking display (read-only, no adjustment controls)
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>${t('roundEnd')} ${state.round}</h3>
                <p style="margin-bottom:6px;color:var(--text-dim);font-size:.75rem">${impostorLabel}</p>
                <p style="font-size:1.2rem;color:var(--accent);margin:10px 0;font-family:'Bebas Neue',sans-serif;letter-spacing:2px">${impostorNames.join(', ')}</p>
                <p style="margin:14px 0;font-size:.85rem">${t('word')} <strong style="color:var(--success)">${state.word}</strong></p>
                ${similarWordsInfo}
                <div class="section-title">🏆 RANKING</div>
                <ul class="ranking-list">${rankingHTML}</ul>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
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
    showToast(t('newRound') + ' ' + state.round);
}

function showRanking() {
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
    document.getElementById('ranking-list').innerHTML = rankingHTML;
    showScreen('screen-ranking');
}

function confirmNewGame() {
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay" onclick="closeOverlay(event)">
            <div class="confirm-box" onclick="event.stopPropagation()">
                <h3>${t('restartConfirm')}</h3>
                <p style="color:var(--text-dim);font-size:.8rem;margin-bottom:18px">${t('restartWarning')}</p>
                <button class="btn btn-danger" onclick="resetGame()" style="opacity:1;padding:12px">${t('yesRestart')}</button>
                <button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:8px">${t('cancel')}</button>
            </div>
        </div>
    `;
}

function resetGame() {
    closeOverlay();
    state = { 
        playerCount: 4, maxImpostors: 1, players: [], scores: {}, currentPlayerIndex: 0, 
        word: null, category: null, impostorIndices: [], actualImpostorCount: 0, round: 1, 
        seenPlayers: [], gameInProgress: false, eliminatedPlayers: [], revealedImpostors: [],
        impostorKnows: true, similarWords: {}
    };
    clearState();
    generatePlayerInputs();
    updateImpostorSelector();
    showScreen('screen-home');
    showToast(t('gameRestarted'));
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
function initHomeScreen() {
    initPlayerSelector();
    updateImpostorSelector();
    generatePlayerInputs();
}

function init() {
    const hasLang = loadLanguage();
    
    if (!hasLang) {
        showScreen('screen-lang');
    } else {
        applyTranslations();
        initHomeScreen();
        
        if (loadState()) {
            if (state.gameInProgress) {
                if (state.seenPlayers.length >= state.players.length) {
                    showGameScreen();
                } else {
                    showPlayerTurn();
                }
                showToast(t('gameRestored'));
            } else {
                showScreen('screen-home');
            }
        } else {
            showScreen('screen-home');
        }
    }
}

init();
