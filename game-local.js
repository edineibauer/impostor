// GAME-LOCAL.JS - Local Game Logic

let localState = {
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
    similarWords: {},
    maxPoints: null,
    allCategories: true,
    selectedCategories: [],
    votingRound: 0
};

// STORAGE
function saveLocalState() {
    try { localStorage.setItem('impostor_local_state', JSON.stringify(localState)); } catch (e) {}
}

function loadLocalState() {
    try {
        const saved = localStorage.getItem('impostor_local_state');
        if (saved) {
            const loaded = JSON.parse(saved);
            if (loaded.gameInProgress) { 
                localState = loaded; 
                if (!localState.eliminatedPlayers) localState.eliminatedPlayers = [];
                if (!localState.revealedImpostors) localState.revealedImpostors = [];
                if (localState.impostorKnows === undefined) localState.impostorKnows = true;
                if (!localState.similarWords) localState.similarWords = {};
                if (!localState.votingRound) localState.votingRound = 0;
                return true; 
            }
        }
    } catch (e) {}
    return false;
}

function clearLocalState() {
    try { localStorage.removeItem('impostor_local_state'); } catch (e) {}
}

// INIT LOCAL GAME
function initLocalGame() {
    // First load any saved state (may contain previous game settings)
    const hadSavedState = loadLocalState();
    
    // Initialize UI components
    initPlayerSelector();
    updateImpostorSelector();
    generatePlayerInputs();
    populateCategoriesList();
    
    // Apply saved settings to UI (if any)
    applySettingsToUI();
    
    // Check for saved game in progress
    if (hadSavedState && localState.gameInProgress) {
        if (localState.seenPlayers.length >= localState.players.length) {
            showGameScreen();
        } else {
            showPlayerTurn();
        }
        showToast(t('gameRestored'));
    }
}

// Apply saved localState settings to UI elements
function applySettingsToUI() {
    // Apply player count
    const playerSelector = document.getElementById('player-selector');
    if (playerSelector) {
        playerSelector.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.num) === localState.playerCount) {
                btn.classList.add('selected');
            }
        });
    }
    
    // Apply max impostors
    const impostorSelector = document.getElementById('impostor-selector');
    if (impostorSelector) {
        impostorSelector.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.num) === localState.maxImpostors) {
                btn.classList.add('selected');
            }
        });
    }
    
    // Apply impostor knows toggle
    const toggle = document.getElementById('toggle-impostor-knows');
    if (toggle) {
        toggle.classList.toggle('active', localState.impostorKnows);
    }
    
    // Apply all categories toggle
    const allCatToggle = document.getElementById('toggle-all-categories');
    if (allCatToggle) {
        allCatToggle.classList.toggle('active', localState.allCategories);
    }
    
    // Apply selected categories
    const categoriesList = document.getElementById('categories-list');
    if (categoriesList) {
        categoriesList.querySelectorAll('.category-item').forEach(item => {
            const idx = parseInt(item.dataset.idx);
            if (localState.allCategories || localState.selectedCategories.includes(idx)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    // Apply max points
    const maxPointsInput = document.getElementById('max-points-input');
    if (maxPointsInput && localState.maxPoints) {
        maxPointsInput.value = localState.maxPoints;
    }
}

// INIT PLAYER SELECTOR (3-20)
function initPlayerSelector() {
    const selector = document.getElementById('player-selector');
    if (!selector) return;
    
    // Preserve current selection if valid, otherwise default to 4
    const currentCount = localState.playerCount >= 3 && localState.playerCount <= 20 ? localState.playerCount : 4;
    
    selector.innerHTML = '';
    for (let i = 3; i <= 20; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === currentCount ? ' selected' : '');
        btn.dataset.num = i;
        btn.textContent = i;
        btn.onclick = function() {
            selector.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            localState.playerCount = parseInt(this.dataset.num);
            generatePlayerInputs();
            updateImpostorSelector();
        };
        selector.appendChild(btn);
    }
    localState.playerCount = currentCount;
}

// UPDATE IMPOSTOR SELECTOR BASED ON PLAYER COUNT
function updateImpostorSelector() {
    const maxPossible = Math.floor((localState.playerCount - 1) / 2);
    const selector = document.getElementById('impostor-selector');
    if (!selector) return;
    
    // Preserve current selection if valid, otherwise default to 1
    const currentMax = localState.maxImpostors;
    const validMax = Math.min(currentMax, maxPossible, 5);
    
    selector.innerHTML = '';
    for (let i = 1; i <= Math.min(maxPossible, 5); i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === validMax ? ' selected' : '');
        btn.dataset.num = i;
        btn.textContent = i;
        btn.onclick = function() {
            selector.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            localState.maxImpostors = parseInt(this.dataset.num);
        };
        selector.appendChild(btn);
    }
    localState.maxImpostors = validMax || 1;
}

// POPULATE CATEGORIES LIST
function populateCategoriesList() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    const categories = getWordCategories();
    
    // If no categories selected yet, select all by default
    const hasSelection = localState.selectedCategories && localState.selectedCategories.length > 0;
    
    container.innerHTML = categories.map((cat, idx) => {
        const isSelected = localState.allCategories || (hasSelection ? localState.selectedCategories.includes(idx) : true);
        return `<div class="category-item ${isSelected ? 'selected' : ''}" data-idx="${idx}" onclick="toggleCategory(${idx})">${cat.category}</div>`;
    }).join('');
    
    // Only set all categories if no previous selection
    if (!hasSelection) {
        localState.selectedCategories = categories.map((_, idx) => idx);
    }
}

function toggleCategory(idx) {
    const item = document.querySelector(`#categories-list .category-item[data-idx="${idx}"]`);
    if (!item) return;
    item.classList.toggle('selected');
    
    if (item.classList.contains('selected')) {
        if (!localState.selectedCategories.includes(idx)) {
            localState.selectedCategories.push(idx);
        }
    } else {
        localState.selectedCategories = localState.selectedCategories.filter(i => i !== idx);
    }
}

function toggleAllCategories() {
    const toggle = document.getElementById('toggle-all-categories');
    if (!toggle) return;
    localState.allCategories = !localState.allCategories;
    toggle.classList.toggle('active', localState.allCategories);
    document.getElementById('categories-list').style.display = localState.allCategories ? 'none' : 'grid';
    
    if (localState.allCategories) {
        const categories = getWordCategories();
        localState.selectedCategories = categories.map((_, idx) => idx);
        document.querySelectorAll('#categories-list .category-item').forEach(item => item.classList.add('selected'));
    }
}

function toggleImpostorKnows() {
    const toggle = document.getElementById('toggle-impostor-knows');
    if (!toggle) return;
    localState.impostorKnows = !localState.impostorKnows;
    toggle.classList.toggle('active', localState.impostorKnows);
}

function generatePlayerInputs() {
    const container = document.getElementById('player-inputs');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= localState.playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'player-config';
        div.innerHTML = '<div class="player-number">' + i + '</div><input type="text" id="player-' + i + '" placeholder="' + t('player') + ' ' + i + '" maxlength="15">';
        container.appendChild(div);
    }
}

// FIND SIMILAR WORD
function findSimilarWord(originalWord, category) {
    const categories = getWordCategories();
    const categoryData = categories.find(c => c.category === category);
    
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

// START LOCAL GAME
function startLocalGame() {
    // Validate categories
    if (!localState.allCategories && localState.selectedCategories.length === 0) {
        showToast(t('selectCategories'));
        return;
    }
    
    localState.players = [];
    localState.scores = {};
    for (let i = 1; i <= localState.playerCount; i++) {
        const input = document.getElementById('player-' + i);
        const name = input ? input.value.trim() : '';
        const finalName = name || t('player') + ' ' + i;
        localState.players.push(finalName);
        localState.scores[finalName] = 0;
    }
    // Keep players in original order (do not shuffle)
    localState.round = 1;
    localState.gameInProgress = true;
    localState.eliminatedPlayers = [];
    localState.revealedImpostors = [];
    
    // Get max points
    const maxPointsInput = document.getElementById('max-points-input');
    const maxPointsValue = maxPointsInput ? maxPointsInput.value : '';
    localState.maxPoints = maxPointsValue ? parseInt(maxPointsValue) : null;
    
    startRound();
}

function startRound() {
    const categories = getWordCategories();
    let availableCategories = localState.allCategories ? 
        categories : 
        localState.selectedCategories.map(idx => categories[idx]).filter(c => c);
    
    if (availableCategories.length === 0) availableCategories = categories;
    
    const categoryData = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    localState.word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    localState.category = categoryData.category;
    localState.actualImpostorCount = Math.floor(Math.random() * localState.maxImpostors) + 1;
    localState.impostorIndices = [];
    localState.similarWords = {};
    localState.votingRound = 0;
    
    const indices = [...Array(localState.players.length).keys()];
    const shuffledIndices = shuffle(indices);
    
    // Generate ONE similar word for ALL impostors (so they can identify each other)
    let impostorWord = null;
    if (!localState.impostorKnows) {
        impostorWord = findSimilarWord(localState.word, localState.category);
    }
    
    for (let i = 0; i < localState.actualImpostorCount; i++) {
        const impostorIdx = shuffledIndices[i];
        localState.impostorIndices.push(impostorIdx);
        
        if (!localState.impostorKnows) {
            // All impostors get the SAME similar word
            localState.similarWords[impostorIdx] = impostorWord;
        }
    }
    
    localState.currentPlayerIndex = 0;
    localState.seenPlayers = [];
    localState.eliminatedPlayers = [];
    localState.revealedImpostors = [];
    // Keep players in original order (do not shuffle)
    saveLocalState();
    showPlayerTurn();
}

function showPlayerTurn() {
    document.getElementById('turn-round-num').textContent = localState.round;
    document.getElementById('current-player-name').textContent = localState.players[localState.currentPlayerIndex];
    const progress = document.getElementById('players-progress');
    progress.innerHTML = localState.players.map((name, idx) => {
        let cls = 'player-chip';
        if (idx === localState.currentPlayerIndex) cls += ' current';
        else if (localState.seenPlayers.includes(idx)) cls += ' seen';
        return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
    showScreen('screen-turn');
}

function showWord() {
    const isImpostor = localState.impostorIndices.includes(localState.currentPlayerIndex);
    const wordText = document.getElementById('word-text');
    const categoryTag = document.getElementById('category-tag');
    const wordDisplay = document.getElementById('word-display');
    
    wordDisplay.classList.remove('word-reveal-animation');
    void wordDisplay.offsetWidth;
    wordDisplay.classList.add('word-reveal-animation');
    
    if (isImpostor) {
        if (localState.impostorKnows) {
            wordText.textContent = t('impostor');
            wordText.className = 'word-text is-impostor';
            categoryTag.textContent = localState.category;
        } else {
            const similarWord = localState.similarWords[localState.currentPlayerIndex] || localState.word;
            wordText.textContent = similarWord;
            wordText.className = 'word-text is-word';
            categoryTag.textContent = localState.category;
        }
    } else {
        wordText.textContent = localState.word;
        wordText.className = 'word-text is-word';
        categoryTag.textContent = localState.category;
    }
    
    showScreen('screen-word');
}

function nextPlayer() {
    localState.seenPlayers.push(localState.currentPlayerIndex);
    localState.currentPlayerIndex++;
    if (localState.currentPlayerIndex >= localState.players.length) {
        showGameScreen();
    } else {
        showPlayerTurn();
    }
    saveLocalState();
}

function showGameScreen() {
    document.getElementById('game-round-num').textContent = localState.round;
    document.getElementById('total-players').textContent = localState.players.length;
    const impostorDisplay = localState.maxImpostors > 1 ? '1-' + localState.maxImpostors : '1';
    document.getElementById('impostor-count-display').textContent = impostorDisplay;
    updateGamePlayersList();
    showScreen('screen-game');
}

function updateGamePlayersList() {
    const gamePlayers = document.getElementById('game-players');
    gamePlayers.innerHTML = localState.players.map((name, idx) => {
        let cls = 'player-chip';
        if (localState.eliminatedPlayers.includes(idx)) cls += ' eliminated';
        return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
}

// VOTING SYSTEM
function showVoteScreen() {
    const activePlayers = localState.players.filter((_, idx) => !localState.eliminatedPlayers.includes(idx));
    
    if (activePlayers.length <= localState.actualImpostorCount - localState.revealedImpostors.length) {
        showToast('Não há jogadores suficientes!');
        return;
    }
    
    let playerButtonsHTML = localState.players.map((name, idx) => {
        const isEliminated = localState.eliminatedPlayers.includes(idx);
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
    const playerName = localState.players[playerIndex];
    const isImpostor = localState.impostorIndices.includes(playerIndex);
    
    localState.eliminatedPlayers.push(playerIndex);
    localState.votingRound++;
    
    if (isImpostor) {
        localState.revealedImpostors.push(playerIndex);
    }
    
    saveLocalState();
    
    const remainingIndices = localState.players.map((_, idx) => idx).filter(idx => !localState.eliminatedPlayers.includes(idx));
    const allRemainingAreImpostors = remainingIndices.length > 0 && remainingIndices.every(idx => localState.impostorIndices.includes(idx));
    
    if (allRemainingAreImpostors && !isImpostor) {
        showVoteResultWithImpostorWin(playerName);
    } else {
        showVoteResult(playerName, isImpostor, playerIndex);
    }
}

function voteResultHTML(playerName, wasImpostor) {
    const remainingImpostors = localState.actualImpostorCount - localState.revealedImpostors.length;
    
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
    const remainingImpostors = localState.actualImpostorCount - localState.revealedImpostors.length;
    const allImpostorsFound = remainingImpostors === 0;
    
    let resultHTML = voteResultHTML(playerName, wasImpostor);
    let scoreControlsHTML = buildScoreControls();
    
    let buttonsHTML = '';
    if (allImpostorsFound) {
        buttonsHTML = `<button class="btn btn-primary" onclick="closeOverlay();showRoundSummary();" style="margin-top:14px">${t('seeRoundSummary')}</button>`;
    } else {
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

function showVoteResultWithImpostorWin(playerName) {
    let resultHTML = `<div class="result-icon">❌</div><h3 style="color:#ff4444">${t('wrong')}</h3>
        <p style="font-size:1.1rem;margin:14px 0"><strong>${playerName}</strong> ${t('wasInnocent')}</p>
        <p style="color:var(--warning);font-size:.85rem;margin-top:10px">🎭 ${t('impostorWins')}</p>`;
    
    let scoreControlsHTML = buildScoreControls();
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                ${resultHTML}
                <div class="section-title">${t('adjustPoints')}</div>
                <div class="score-controls">${scoreControlsHTML}</div>
                <button class="btn btn-primary" onclick="closeOverlay();showImpostorWins();" style="margin-top:14px">${t('seeRoundSummary')}</button>
            </div>
        </div>
    `;
}

function showImpostorWins() {
    const impostorNames = localState.impostorIndices.map(i => localState.players[i]);
    const impostorLabel = localState.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Check for winner
    if (checkForWinner()) return;
    
    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = buildRankingHTML(sorted);
    
    let similarWordsInfo = '';
    if (!localState.impostorKnows && Object.keys(localState.similarWords).length > 0) {
        const similarList = localState.impostorIndices.map(idx => {
            const name = localState.players[idx];
            const word = localState.similarWords[idx];
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
                <p style="margin:14px 0;font-size:.85rem">${t('word')} <strong style="color:var(--success)">${localState.word}</strong></p>
                ${similarWordsInfo}
                <div class="section-title">🏆 RANKING</div>
                <ul class="ranking-list">${rankingHTML}</ul>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
}

function buildScoreControls() {
    return localState.players.map(name => {
        const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
        const escapedName = name.replace(/'/g, "\\'");
        return `<div class="score-player">
            <span class="score-player-name">${name}</span>
            <div class="score-btns">
                <button class="score-btn minus" onclick="adjustScore('${escapedName}', -1)">−</button>
                <span class="score-value" id="score-${safeId}">${localState.scores[name] || 0}</span>
                <button class="score-btn plus" onclick="adjustScore('${escapedName}', 1)">+</button>
            </div>
        </div>`;
    }).join('');
}

function buildRankingHTML(sorted) {
    return sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
}

function showRoundSummary() {
    const impostorNames = localState.impostorIndices.map(i => localState.players[i]);
    const impostorLabel = localState.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Check for winner
    if (checkForWinner()) return;
    
    let similarWordsInfo = '';
    if (!localState.impostorKnows && Object.keys(localState.similarWords).length > 0) {
        const similarList = localState.impostorIndices.map(idx => {
            const name = localState.players[idx];
            const word = localState.similarWords[idx];
            return `${name}: ${word}`;
        }).join(', ');
        similarWordsInfo = `<p style="font-size:.75rem;color:var(--text-dim);margin-top:8px">${t('impostorWords')}: ${similarList}</p>`;
    }
    
    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = buildRankingHTML(sorted);
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>${t('roundEnd')} ${localState.round}</h3>
                <p style="margin-bottom:6px;color:var(--text-dim);font-size:.75rem">${impostorLabel}</p>
                <p style="font-size:1.2rem;color:var(--accent);margin:10px 0;font-family:'Bebas Neue',sans-serif;letter-spacing:2px">${impostorNames.join(', ')}</p>
                <p style="margin:14px 0;font-size:.85rem">${t('word')} <strong style="color:var(--success)">${localState.word}</strong></p>
                ${similarWordsInfo}
                <div class="section-title">🏆 RANKING</div>
                <ul class="ranking-list">${rankingHTML}</ul>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
}

function adjustScore(name, delta) {
    localState.scores[name] = (localState.scores[name] || 0) + delta;
    const el = document.getElementById('score-' + name.replace(/[^a-zA-Z0-9]/g, '_'));
    if (el) el.textContent = localState.scores[name];
    saveLocalState();
}

function checkForWinner() {
    if (!localState.maxPoints) return false;
    
    for (const [name, score] of Object.entries(localState.scores)) {
        if (score >= localState.maxPoints) {
            showLocalGameOver(name);
            return true;
        }
    }
    return false;
}

function showLocalGameOver(winnerName) {
    closeOverlay();
    
    document.getElementById('local-winner-name').textContent = winnerName;
    
    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    document.getElementById('local-final-ranking').innerHTML = buildRankingHTML(sorted);
    
    localState.gameInProgress = false;
    clearLocalState();
    
    showScreen('screen-game-over');
}

function newRound() {
    localState.round++;
    startRound();
    showToast(t('newRound') + ' ' + localState.round);
}

function showRanking() {
    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    document.getElementById('ranking-list').innerHTML = buildRankingHTML(sorted);
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
    
    // Save current settings before reset
    const savedSettings = {
        playerCount: localState.playerCount,
        maxImpostors: localState.maxImpostors,
        impostorKnows: localState.impostorKnows,
        maxPoints: localState.maxPoints,
        allCategories: localState.allCategories,
        selectedCategories: localState.selectedCategories.slice()
    };
    
    // Reset game state but keep settings
    localState = { 
        playerCount: savedSettings.playerCount, 
        maxImpostors: savedSettings.maxImpostors, 
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
        impostorKnows: savedSettings.impostorKnows, 
        similarWords: {}, 
        maxPoints: savedSettings.maxPoints, 
        allCategories: savedSettings.allCategories, 
        selectedCategories: savedSettings.selectedCategories, 
        votingRound: 0
    };
    
    clearLocalState();
    
    // Re-initialize UI with saved settings
    initPlayerSelector();
    updateImpostorSelector();
    generatePlayerInputs();
    populateCategoriesList();
    applySettingsToUI();
    
    showScreen('screen-home');
    showToast(t('gameRestarted'));
}
