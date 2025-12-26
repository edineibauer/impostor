() {
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
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
    
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
        return `<div class="score-player">
            <span class="score-player-name">${name}</span>
            <div class="score-btns">
                <button class="score-btn minus" onclick="adjustScore('${name.replace(/'/g, "\\'")}', -1)">−</button>
                <span class="score-value" id="score-${safeId}">${localState.scores[name]}</span>
                <button class="score-btn plus" onclick="adjustScore('${name.replace(/'/g, "\\'")}', 1)">+</button>
            </div>
        </div>`;
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
    localState.scores[name] += delta;
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
    const rankingHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0) cls += ' gold';
        else if (idx === 1) cls += ' silver';
        else if (idx === 2) cls += ' bronze';
        const scoreClass = score < 0 ? 'ranking-score negative' : 'ranking-score';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="${scoreClass}">${score}</span></li>`;
    }).join('');
    
    document.getElementById('local-final-ranking').innerHTML = rankingHTML;
    
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
    localState = { 
        playerCount: 4, maxImpostors: 1, players: [], scores: {}, currentPlayerIndex: 0, 
        word: null, category: null, impostorIndices: [], actualImpostorCount: 0, round: 1, 
        seenPlayers: [], gameInProgress: false, eliminatedPlayers: [], revealedImpostors: [],
        impostorKnows: true, similarWords: {}, maxPoints: null, allCategories: true, 
        selectedCategories: [], votingRound: 0
    };
    clearLocalState();
    initLocalGame();
    showScreen('screen-home');
    showToast(t('gameRestarted'));
}
