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
    votingRound: 0,
    starterPlayerIndex: 0, // Who starts talking each round
    currentScreen: null, // Track current screen for restoration
    previousImpostors: [], // Track who was impostor in previous round (for weighted selection)
    questionsMode: false, // Questions mode: app shows a preset question each talking round
    roundQuestions: [], // Shuffled questions for the current round
    questionIndex: 0, // Current question being shown
    impostorHints: {}, // Hints for impostors in bad speaking positions (impostorKnows mode)
    impostorSurprise: false, // false = exactly N impostors; true = random from 1 to N
    roundPoints: {}, // Points earned by each player in the current round (auto scoring)
    mrWhiteMode: false, // Optional extra role: gets NO word at all (needs 5+ players)
    mrWhiteIndex: null, // Player index holding the Mr. White role this round
    punishMode: false // Optional: eliminated innocents draw a light challenge
};

// STORAGE
function saveLocalState(screen) {
    try { 
        if (screen) localState.currentScreen = screen;
        localStorage.setItem('impostor_local_state', JSON.stringify(localState)); 
    } catch (e) {}
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
                if (localState.starterPlayerIndex === undefined) localState.starterPlayerIndex = 0;
                if (!localState.currentScreen) localState.currentScreen = 'screen-game';
                if (!localState.previousImpostors) localState.previousImpostors = [];
                if (localState.questionsMode === undefined) localState.questionsMode = false;
                if (!localState.roundQuestions) localState.roundQuestions = [];
                if (!localState.questionIndex) localState.questionIndex = 0;
                if (!localState.impostorHints) localState.impostorHints = {};
                if (localState.impostorSurprise === undefined) localState.impostorSurprise = false;
                if (!localState.roundPoints) localState.roundPoints = {};
                if (localState.mrWhiteMode === undefined) localState.mrWhiteMode = false;
                if (localState.mrWhiteIndex === undefined) localState.mrWhiteIndex = null;
                if (localState.punishMode === undefined) localState.punishMode = false;
                return true;
            } else {
                // Load settings even if game not in progress
                localState.playerCount = loaded.playerCount || 4;
                localState.maxImpostors = loaded.maxImpostors || 1;
                localState.impostorKnows = loaded.impostorKnows !== undefined ? loaded.impostorKnows : true;
                localState.maxPoints = loaded.maxPoints || null;
                localState.allCategories = loaded.allCategories !== undefined ? loaded.allCategories : true;
                localState.selectedCategories = loaded.selectedCategories || [];
                localState.questionsMode = loaded.questionsMode === true;
                localState.impostorSurprise = loaded.impostorSurprise === true;
                localState.mrWhiteMode = loaded.mrWhiteMode === true;
                localState.punishMode = loaded.punishMode === true;
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
        restoreGameState();
        showToast(t('gameRestored'));
    }
}

// Restore game to the exact state before reload
function restoreGameState() {
    const screen = localState.currentScreen;
    
    switch(screen) {
        case 'screen-turn':
            showPlayerTurn();
            break;
        case 'screen-word':
            // Show word screen for current player
            showWordDirectly();
            break;
        case 'screen-game':
            showGameScreen();
            break;
        case 'screen-ranking':
            showRanking();
            break;
        case 'screen-round-result':
            // If was on result screen, go to game screen
            showGameScreen();
            break;
        case 'screen-game-over':
            showGameOver();
            break;
        default:
            // Default: if all players have seen their words, show game screen
            if (localState.seenPlayers.length >= localState.players.length) {
                showGameScreen();
            } else {
                showPlayerTurn();
            }
    }
}

// Show word directly without animation (for restore)
function showWordDirectly() {
    const wordDisplay = document.getElementById('word-display');
    const wordText = document.getElementById('word-text');
    const categoryTag = document.getElementById('category-tag');
    const currentPlayer = document.getElementById('word-player-name');
    
    if (currentPlayer) {
        currentPlayer.textContent = localState.players[localState.currentPlayerIndex];
    }
    
    const isImpostor = localState.impostorIndices.includes(localState.currentPlayerIndex);

    const hintShown = updateWordHint(isImpostor);

    if (isImpostor) {
        if (localState.currentPlayerIndex === localState.mrWhiteIndex) {
            // Mr. White: no word, no category — pure improvisation
            wordText.textContent = t('mrWhiteCard');
            wordText.className = 'word-text is-impostor';
            categoryTag.style.display = 'none';
        } else if (localState.impostorKnows) {
            wordText.textContent = t('impostor');
            wordText.className = 'word-text is-impostor';
            categoryTag.textContent = localState.category;
            categoryTag.style.display = hintShown ? 'none' : 'block';
        } else {
            const similarWord = localState.similarWords[localState.currentPlayerIndex] || localState.word;
            wordText.textContent = similarWord;
            wordText.className = 'word-text is-word';
            categoryTag.style.display = 'none';
        }
    } else {
        wordText.textContent = localState.word;
        wordText.className = 'word-text is-word';
        if (localState.impostorKnows) {
            categoryTag.textContent = localState.category;
            categoryTag.style.display = 'block';
        } else {
            categoryTag.style.display = 'none';
        }
    }

    showScreen('screen-word');
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

    // Apply questions mode toggle
    const questionsToggle = document.getElementById('toggle-questions-mode');
    if (questionsToggle) {
        questionsToggle.classList.toggle('active', localState.questionsMode);
    }

    // Apply impostor surprise toggle
    const surpriseToggle = document.getElementById('toggle-impostor-surprise');
    if (surpriseToggle) {
        surpriseToggle.classList.toggle('active', localState.impostorSurprise);
    }

    // Apply Mr. White and punishment toggles
    const mrWhiteToggle = document.getElementById('toggle-mr-white');
    if (mrWhiteToggle) {
        mrWhiteToggle.classList.toggle('active', localState.mrWhiteMode);
    }
    const punishToggle = document.getElementById('toggle-punish');
    if (punishToggle) {
        punishToggle.classList.toggle('active', localState.punishMode);
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

function toggleQuestionsMode() {
    const toggle = document.getElementById('toggle-questions-mode');
    if (!toggle) return;
    localState.questionsMode = !localState.questionsMode;
    toggle.classList.toggle('active', localState.questionsMode);
}

function toggleImpostorSurprise() {
    const toggle = document.getElementById('toggle-impostor-surprise');
    if (!toggle) return;
    localState.impostorSurprise = !localState.impostorSurprise;
    toggle.classList.toggle('active', localState.impostorSurprise);
}

function toggleMrWhite() {
    const toggle = document.getElementById('toggle-mr-white');
    if (!toggle) return;
    localState.mrWhiteMode = !localState.mrWhiteMode;
    toggle.classList.toggle('active', localState.mrWhiteMode);
}

function togglePunish() {
    const toggle = document.getElementById('toggle-punish');
    if (!toggle) return;
    localState.punishMode = !localState.punishMode;
    toggle.classList.toggle('active', localState.punishMode);
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
// tier: 0 = closest (hardest for the group, easiest for the impostor to blend in),
//       1 = medium, 2 = farthest (impostor realizes sooner). Omit for random.
function findSimilarWord(originalWord, category, tier) {
    const categories = getWordCategories();
    const categoryData = categories.find(c => c.category === category);

    if (categoryData && categoryData.similar && categoryData.similar[originalWord]) {
        const similarOptions = categoryData.similar[originalWord];
        if (tier === undefined || tier === null) {
            return similarOptions[Math.floor(Math.random() * similarOptions.length)];
        }
        const idx = Math.max(0, Math.min(similarOptions.length - 1, tier));
        return similarOptions[idx];
    }

    if (categoryData) {
        const otherWords = categoryData.words.filter(w => w !== originalWord);
        if (otherWords.length > 0) {
            return otherWords[Math.floor(Math.random() * otherWords.length)];
        }
    }

    return originalWord;
}

// GENERIC QUESTIONS (fallback when the category has none — EN/ES word lists)
const genericQuestionsByLang = {
    en: [
        'Where do you usually see this?',
        'How often does this show up in your life?',
        'Would you give this as a gift? To whom?',
        'Is it more for kids or adults?',
        'What feeling does it give you?',
        'Is it cheap or expensive?',
        'What would you use together with it?',
        'What time of year does it show up most?'
    ],
    es: [
        '¿Dónde sueles ver esto?',
        '¿Con qué frecuencia aparece en tu vida?',
        '¿Lo regalarías? ¿A quién?',
        '¿Es más de niños o de adultos?',
        '¿Qué sentimiento te provoca?',
        '¿Es caro o barato?',
        '¿Qué usarías junto con esto?',
        '¿En qué época del año aparece más?'
    ]
};

function getGenericQuestions() {
    if (currentLang === 'pt' && typeof genericQuestionsPT !== 'undefined') return genericQuestionsPT;
    return genericQuestionsByLang[currentLang] || genericQuestionsByLang.en;
}

// Speaking position of a player in the current round (0 = first to talk)
function speakingPosition(playerIdx) {
    const n = localState.players.length;
    return (playerIdx - localState.starterPlayerIndex + n) % n;
}

// Difficulty tier based on the impostor's speaking position.
// Talking early is hard for the impostor → closer word (tier 0).
// Talking late means he heard everyone → farther word (tier 2).
function impostorTierByPosition(minPosition) {
    const n = localState.players.length;
    if (n <= 1) return 1;
    const frac = minPosition / (n - 1);
    if (frac <= 0.34) return 0;
    if (frac <= 0.67) return 1;
    return 2;
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
    localState.starterPlayerIndex = 0; // First player starts in round 1
    
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
    
    // Use getRandomWordPT if available (avoids repetition), otherwise fallback
    if (typeof getRandomWordPT === 'function' && currentLang === 'pt') {
        localState.word = getRandomWordPT(categoryData);
    } else {
        localState.word = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];
    }
    
    localState.category = categoryData.category;
    // Exact count by default; "surprise" mode draws from 1 to the selected number
    localState.actualImpostorCount = localState.impostorSurprise
        ? Math.floor(Math.random() * localState.maxImpostors) + 1
        : localState.maxImpostors;

    // Mr. White needs 5+ players and takes one special slot, so cap the
    // impostor count to keep the innocents in clear majority
    const mrWhiteActive = localState.mrWhiteMode && localState.players.length >= 5;
    if (mrWhiteActive) {
        const maxSpecials = Math.floor((localState.players.length - 1) / 2);
        localState.actualImpostorCount = Math.max(1, Math.min(localState.actualImpostorCount, maxSpecials - 1));
    }
    localState.impostorIndices = [];
    localState.similarWords = {};
    localState.impostorHints = {};
    localState.votingRound = 0;
    localState.roundPoints = {};

    // Questions mode: prepare shuffled questions for this round
    localState.roundQuestions = [];
    localState.questionIndex = 0;
    if (localState.questionsMode) {
        let qs = categoryData.questions;
        if (!qs || !qs.length) qs = getGenericQuestions();
        if (qs && qs.length) localState.roundQuestions = shuffle(qs);
    }
    
    // Weighted impostor selection - previous impostors have half the chance
    const indices = [...Array(localState.players.length).keys()];
    const previousImps = localState.previousImpostors || [];
    
    // Create weighted pool: normal players appear twice, previous impostors appear once
    let weightedPool = [];
    indices.forEach(idx => {
        if (previousImps.includes(idx)) {
            weightedPool.push(idx); // Previous impostor: 1x (half chance)
        } else {
            weightedPool.push(idx); // Normal player: 2x (full chance)
            weightedPool.push(idx);
        }
    });
    
    // Shuffle and select impostors
    const shuffledPool = shuffle(weightedPool);
    const selectedImpostors = [];
    
    for (let i = 0; i < shuffledPool.length && selectedImpostors.length < localState.actualImpostorCount; i++) {
        const idx = shuffledPool[i];
        if (!selectedImpostors.includes(idx)) {
            selectedImpostors.push(idx);
        }
    }
    
    localState.impostorIndices = selectedImpostors.slice();

    // Mr. White: an extra special player who gets NO word at all.
    // He counts as an impostor for voting/win purposes and never starts talking.
    localState.mrWhiteIndex = null;
    if (mrWhiteActive) {
        const candidates = indices.filter(idx => !selectedImpostors.includes(idx));
        const mrWhiteIdx = candidates[Math.floor(Math.random() * candidates.length)];
        localState.mrWhiteIndex = mrWhiteIdx;
        localState.impostorIndices.push(mrWhiteIdx);
        localState.actualImpostorCount++;
        if (localState.starterPlayerIndex === mrWhiteIdx) {
            localState.starterPlayerIndex = (localState.starterPlayerIndex + 1) % localState.players.length;
        }
    }

    // Position-based difficulty: the earliest-speaking impostor defines the tier,
    // so a badly positioned impostor (talks first) gets help.
    const minImpostorPos = Math.min(...selectedImpostors.map(idx => speakingPosition(idx)));

    if (!localState.impostorKnows) {
        // Generate ONE similar word for ALL impostors (so they can identify each other).
        // Early speaker → closest word (blends in naturally); late speaker → farther word.
        const tier = impostorTierByPosition(minImpostorPos);
        const impostorWord = findSimilarWord(localState.word, localState.category, tier);
        selectedImpostors.forEach(impostorIdx => {
            localState.similarWords[impostorIdx] = impostorWord;
        });
    } else {
        // Impostor knows he is the impostor: if he talks 1st or 2nd, he gets a hint
        // (a word close to the secret one) to compensate for the bad position.
        selectedImpostors.forEach(impostorIdx => {
            const pos = speakingPosition(impostorIdx);
            if (pos <= 1) {
                const hint = findSimilarWord(localState.word, localState.category, pos === 0 ? 0 : 1);
                if (hint && hint !== localState.word) {
                    localState.impostorHints[impostorIdx] = hint;
                }
            }
        });
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
    saveLocalState('screen-turn');
    showScreen('screen-turn');
}

// Shows the position hint for a badly positioned impostor (talks 1st/2nd).
// Returns true when the hint is visible — in that case the category is hidden,
// since the similar word already implies the category (avoids hint stacking).
function updateWordHint(isImpostor) {
    const hintEl = document.getElementById('word-hint');
    if (!hintEl) return false;
    if (isImpostor && localState.currentPlayerIndex === localState.mrWhiteIndex) {
        hintEl.textContent = t('mrWhiteInfo');
        hintEl.style.display = 'block';
        return true;
    }
    const hint = localState.impostorHints ? localState.impostorHints[localState.currentPlayerIndex] : null;
    if (isImpostor && localState.impostorKnows && hint) {
        hintEl.textContent = t('hintSimilarTo') + ': ' + hint;
        hintEl.style.display = 'block';
        return true;
    }
    hintEl.style.display = 'none';
    return false;
}

function showWord() {
    const isImpostor = localState.impostorIndices.includes(localState.currentPlayerIndex);
    const wordText = document.getElementById('word-text');
    const categoryTag = document.getElementById('category-tag');
    const wordDisplay = document.getElementById('word-display');

    wordDisplay.classList.remove('word-reveal-animation');
    void wordDisplay.offsetWidth;
    wordDisplay.classList.add('word-reveal-animation');

    const hintShown = updateWordHint(isImpostor);

    if (isImpostor) {
        if (localState.currentPlayerIndex === localState.mrWhiteIndex) {
            // Mr. White: no word, no category — pure improvisation
            wordText.textContent = t('mrWhiteCard');
            wordText.className = 'word-text is-impostor';
            categoryTag.style.display = 'none';
        } else if (localState.impostorKnows) {
            wordText.textContent = t('impostor');
            wordText.className = 'word-text is-impostor';
            categoryTag.textContent = localState.category;
            categoryTag.style.display = hintShown ? 'none' : 'block';
        } else {
            const similarWord = localState.similarWords[localState.currentPlayerIndex] || localState.word;
            wordText.textContent = similarWord;
            wordText.className = 'word-text is-word';
            categoryTag.style.display = 'none'; // Hide category when impostor doesn't know
        }
    } else {
        wordText.textContent = localState.word;
        wordText.className = 'word-text is-word';
        // Hide category for all when impostor doesn't know
        if (localState.impostorKnows) {
            categoryTag.textContent = localState.category;
            categoryTag.style.display = 'block';
        } else {
            categoryTag.style.display = 'none';
        }
    }
    
    saveLocalState('screen-word'); // Save screen state
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
    // Note: saveLocalState is called inside showGameScreen and showPlayerTurn
}

function showGameScreen() {
    document.getElementById('game-round-num').textContent = localState.round;
    document.getElementById('total-players').textContent = localState.players.length;
    const impostorDisplay = localState.impostorSurprise && localState.maxImpostors > 1
        ? '1-' + localState.maxImpostors
        : String(localState.maxImpostors);
    document.getElementById('impostor-count-display').textContent = impostorDisplay;
    
    // Show who starts talking this round
    const starterName = localState.players[localState.starterPlayerIndex];
    const starterInfo = document.getElementById('starter-player-info');
    if (starterInfo) {
        starterInfo.innerHTML = '<span style="color:var(--primary)">🎤 ' + starterName + '</span> ' + t('startsTalking');
        starterInfo.style.display = 'block';
    }

    renderQuestionBox();
    updateGamePlayersList();
    saveLocalState('screen-game');
    showScreen('screen-game');
}

// QUESTIONS MODE - render current question on the game screen
function renderQuestionBox() {
    const box = document.getElementById('question-box');
    if (!box) return;
    if (!localState.questionsMode || !localState.roundQuestions || localState.roundQuestions.length === 0) {
        box.style.display = 'none';
        return;
    }
    const total = localState.roundQuestions.length;
    const idx = localState.questionIndex % total;
    const question = localState.roundQuestions[idx];
    box.style.display = 'block';
    box.innerHTML = `
        <div style="font-size:.65rem;letter-spacing:2px;color:var(--text-dim);margin-bottom:6px">❓ ${t('questionLabel')} ${localState.questionIndex + 1}</div>
        <div style="font-size:1rem;font-weight:700;line-height:1.4;margin-bottom:12px">${question}</div>
        <button class="btn btn-secondary" onclick="nextQuestion()" style="margin:0;padding:10px;font-size:.75rem">${t('nextQuestion')}</button>
    `;
}

function nextQuestion() {
    localState.questionIndex++;
    // Reshuffle when all questions were used, avoiding immediate repetition
    if (localState.questionIndex % localState.roundQuestions.length === 0) {
        const lastQuestion = localState.roundQuestions[localState.roundQuestions.length - 1];
        let reshuffled = shuffle(localState.roundQuestions);
        if (reshuffled[0] === lastQuestion && reshuffled.length > 1) {
            reshuffled.push(reshuffled.shift());
        }
        localState.roundQuestions = reshuffled;
    }
    saveLocalState('screen-game');
    renderQuestionBox();
}

function updateGamePlayersList() {
    const gamePlayers = document.getElementById('game-players');
    gamePlayers.innerHTML = localState.players.map((name, idx) => {
        let cls = 'player-chip';
        if (localState.eliminatedPlayers.includes(idx)) cls += ' eliminated';
        return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
}

// VOTING SYSTEM — each active player casts a named vote, the most voted is
// eliminated, ties are settled by luck (the app draws one of the tied players).
let voteSession = null; // { order, pos, votes: {voterIdx: targetIdx}, result }

function activePlayerIndices() {
    return localState.players.map((_, idx) => idx).filter(idx => !localState.eliminatedPlayers.includes(idx));
}

// AUTO SCORING — points are tracked per round for the end-of-round summary
function addPoints(name, delta) {
    localState.scores[name] = (localState.scores[name] || 0) + delta;
    localState.roundPoints[name] = (localState.roundPoints[name] || 0) + delta;
}

function buildRoundPointsHTML() {
    const entries = Object.entries(localState.roundPoints || {}).filter(([, d]) => d !== 0);
    if (!entries.length) return '';
    entries.sort((a, b) => b[1] - a[1]);
    const chips = entries.map(([name, d]) =>
        `<span style="display:inline-block;margin:3px;padding:5px 12px;border-radius:20px;font-size:.75rem;background:${d > 0 ? 'rgba(0,200,100,0.12)' : 'rgba(255,68,68,0.12)'};color:${d > 0 ? 'var(--success)' : '#ff4444'}">${name} ${d > 0 ? '+' : ''}${d}</span>`
    ).join('');
    return `<div class="section-title">✨ ${t('roundPointsTitle')}</div><div style="margin:6px 0 4px">${chips}</div>`;
}

function showVoteScreen() {
    const active = activePlayerIndices();

    if (active.length <= localState.actualImpostorCount - localState.revealedImpostors.length) {
        showToast('Não há jogadores suficientes!');
        return;
    }

    voteSession = { order: active.slice(), pos: 0, votes: {}, result: null };
    renderVoterTurn();
}

function renderVoterTurn() {
    const voterIdx = voteSession.order[voteSession.pos];
    const voterName = localState.players[voterIdx];
    const targets = activePlayerIndices().filter(idx => idx !== voterIdx);

    const buttonsHTML = targets.map(idx =>
        `<button class="player-vote-btn" onclick="registerVote(${voterIdx}, ${idx})">${localState.players[idx]}</button>`
    ).join('');

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>🗳️ ${t('votingTitle')}</h3>
                <p style="color:var(--text-dim);font-size:.7rem;margin:4px 0 10px">${voteSession.pos + 1} / ${voteSession.order.length}</p>
                <p style="font-size:1rem;margin-bottom:14px">${t('whoVotes').replace('{name}', `<strong style="color:var(--primary)">${voterName}</strong>`)}</p>
                <div class="player-vote-list">${buttonsHTML}</div>
                <button class="btn btn-secondary" onclick="cancelVoting()" style="margin-top:18px">${t('cancel')}</button>
            </div>
        </div>
    `;
}

function registerVote(voterIdx, targetIdx) {
    voteSession.votes[voterIdx] = targetIdx;
    voteSession.pos++;
    if (voteSession.pos >= voteSession.order.length) {
        showVoteTally();
    } else {
        renderVoterTurn();
    }
}

function cancelVoting() {
    voteSession = null;
    closeOverlay();
}

function showVoteTally() {
    const counts = {};
    Object.values(voteSession.votes).forEach(target => {
        counts[target] = (counts[target] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(counts));
    const topTargets = Object.keys(counts).map(Number).filter(idx => counts[idx] === maxVotes);
    const isTie = topTargets.length > 1;
    const eliminatedIdx = topTargets[Math.floor(Math.random() * topTargets.length)];
    voteSession.result = { eliminatedIdx };

    const votesListHTML = voteSession.order.map(voterIdx => {
        const targetIdx = voteSession.votes[voterIdx];
        return `<p style="font-size:.8rem;margin:3px 0"><span style="color:var(--text-dim)">${localState.players[voterIdx]}</span> → <strong>${localState.players[targetIdx]}</strong></p>`;
    }).join('');

    const countsHTML = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a]).map(idx =>
        `<span style="display:inline-block;margin:3px;padding:5px 12px;border-radius:20px;font-size:.75rem;background:rgba(255,255,255,0.06)">${localState.players[idx]}: <strong>${counts[idx]}</strong></span>`
    ).join('');

    let tieHTML = '';
    if (isTie) {
        const tiedNames = topTargets.map(idx => localState.players[idx]).join(', ');
        tieHTML = `<p style="color:var(--warning);font-size:.85rem;margin:12px 0">⚖️ ${t('tieTitle')} (${tiedNames})<br>🪙 ${t('tieBreakLuck')} <strong>${localState.players[eliminatedIdx]}</strong></p>`;
    }

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>📊 ${t('voteSummaryTitle')}</h3>
                <div style="margin:12px 0">${votesListHTML}</div>
                <div style="margin:10px 0">${countsHTML}</div>
                ${tieHTML}
                <button class="btn btn-danger" onclick="confirmElimination()" style="opacity:1;margin-top:12px">${t('eliminateBtn')} ${localState.players[eliminatedIdx]}</button>
                <button class="btn btn-secondary" onclick="cancelVoting()" style="margin-top:8px">${t('cancel')}</button>
            </div>
        </div>
    `;
}

function confirmElimination() {
    const eliminatedIdx = voteSession.result.eliminatedIdx;
    const votersForTarget = voteSession.order.filter(v => voteSession.votes[v] === eliminatedIdx);
    voteSession = null;
    executeElimination(eliminatedIdx, votersForTarget);
}

function executeElimination(playerIndex, votersForTarget) {
    const playerName = localState.players[playerIndex];
    const isImpostor = localState.impostorIndices.includes(playerIndex);

    localState.eliminatedPlayers.push(playerIndex);
    localState.votingRound++;

    if (isImpostor) {
        localState.revealedImpostors.push(playerIndex);
        // +1 for each innocent who voted for the impostor
        votersForTarget.forEach(voterIdx => {
            if (!localState.impostorIndices.includes(voterIdx)) {
                addPoints(localState.players[voterIdx], 1);
            }
        });
    } else {
        // Innocent eliminated: each hidden impostor fooled the group, +1
        localState.impostorIndices
            .filter(idx => !localState.eliminatedPlayers.includes(idx))
            .forEach(idx => addPoints(localState.players[idx], 1));
    }

    const active = activePlayerIndices();
    const hiddenImpostors = localState.impostorIndices.filter(idx => !localState.eliminatedPlayers.includes(idx)).length;
    const activeInnocents = active.filter(idx => !localState.impostorIndices.includes(idx)).length;
    const allImpostorsFound = localState.actualImpostorCount - localState.revealedImpostors.length === 0;

    saveLocalState('screen-game'); // Save with game screen as fallback

    // Final guess: the LAST impostor caught (or Mr. White, whenever caught)
    // gets one shot at the secret word. The innocents' win bonus is decided there.
    if (isImpostor && (allImpostorsFound || playerIndex === localState.mrWhiteIndex)) {
        showImpostorGuess(playerIndex);
        return;
    }

    // Impostors win when they reach parity with the innocents
    if (!isImpostor && hiddenImpostors > 0 && hiddenImpostors >= activeInnocents) {
        localState.impostorIndices.forEach(idx => addPoints(localState.players[idx], 4));
        saveLocalState('screen-game');
        showVoteResultWithImpostorWin(playerName);
    } else {
        showVoteResult(playerName, isImpostor, playerIndex);
    }
}

// FINAL GUESS — one chance to steal the round by naming the secret word
function showImpostorGuess(playerIndex) {
    const playerName = localState.players[playerIndex];
    const categories = getWordCategories();
    const categoryData = categories.find(c => c.category === localState.category);
    const decoyPool = (categoryData ? categoryData.words : []).filter(w => w !== localState.word);
    const options = shuffle([localState.word, ...shuffle(decoyPool).slice(0, 5)]);

    const buttonsHTML = options.map(w =>
        `<button class="player-vote-btn" onclick="resolveImpostorGuess(${playerIndex}, '${w.replace(/'/g, "\\'")}')">${w}</button>`
    ).join('');

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <div class="result-icon">🎯</div>
                <h3 style="color:var(--warning)">${t('finalGuessTitle')}</h3>
                <p style="font-size:.9rem;margin:12px 0">${t('finalGuessPrompt').replace('{name}', `<strong>${playerName}</strong>`)}</p>
                <div class="player-vote-list">${buttonsHTML}</div>
            </div>
        </div>
    `;
}

function resolveImpostorGuess(playerIndex, guess) {
    const playerName = localState.players[playerIndex];
    const correct = guess === localState.word;
    const allImpostorsFound = localState.actualImpostorCount - localState.revealedImpostors.length === 0;

    if (correct) {
        addPoints(playerName, 3);
    } else if (allImpostorsFound) {
        // Innocents only collect the win bonus if the last impostor misses
        activePlayerIndices()
            .filter(idx => !localState.impostorIndices.includes(idx))
            .forEach(idx => addPoints(localState.players[idx], 2));
    }
    saveLocalState('screen-game');

    const resultHTML = correct
        ? `<div class="result-icon">🎯</div><h3 style="color:var(--warning)">${t('guessRight').replace('{name}', playerName)}</h3>`
        : `<div class="result-icon">🙈</div><h3 style="color:var(--success)">${t('guessWrong')}</h3>
           <p style="font-size:1.1rem;margin:12px 0">${t('word')} <strong style="color:var(--success)">${localState.word}</strong></p>`;

    const nextBtn = allImpostorsFound
        ? `<button class="btn btn-primary" onclick="closeOverlay();showRoundSummary();" style="margin-top:14px">${t('seeRoundSummary')}</button>`
        : `<button class="btn btn-warning" onclick="closeOverlay();showVoteScreen();" style="margin-top:14px">${t('continueVoting')}</button>`;

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                ${resultHTML}
                ${buildRoundPointsHTML()}
                ${nextBtn}
            </div>
        </div>
    `;
}

// PUNISHMENT MODE — a light challenge for the wrongly eliminated innocent
const punishmentsByLang = {
    pt: [
        'Fale como um robô até a próxima votação',
        'Elogie exageradamente o jogador à sua direita',
        'Conte uma história constrangedora sua (rapidinho)',
        'Fique 2 rodadas sem poder cruzar os braços',
        'Imite um animal escolhido pelo grupo por 10 segundos',
        'Fale cantando até a próxima rodada',
        'Faça 5 agachamentos agora',
        'Deixe o grupo escolher um apelido seu até o fim do jogo',
        'Mande um áudio de 10 segundos cantando no grupo da família (ou pague uma prenda escolhida pelo grupo)',
        'Fale com sotaque escolhido pelo grupo até a próxima votação',
        'Declare seu amor dramaticamente para alguém da roda',
        'Fique de pé até a próxima eliminação',
        'Conte sua última vergonha alheia',
        'Imite alguém da roda até acertarem quem é',
        'Dance 10 segundos sem música',
        'Só pode responder com perguntas até a próxima rodada',
        'Faça sua melhor cara de choro por 10 segundos',
        'Diga 3 qualidades do jogador que te eliminou',
        'Fale sussurrando até a próxima votação',
        'Mostre a última foto da sua galeria (se puder!)',
        'Faça uma pose de estátua até alguém rir',
        'Invente uma rima com o nome de cada jogador da roda',
        'Peça desculpas de joelhos por ter sido eliminado',
        'Segure a risada: o grupo tem 15 segundos pra te fazer rir',
        'Fale tudo em terceira pessoa até a próxima rodada',
        'Imite um apresentador de telejornal narrando sua eliminação',
        'Faça 10 segundos de mímica de um filme até alguém acertar',
        'Troque de lugar com quem o grupo mandar'
    ],
    en: [
        'Talk like a robot until the next vote',
        'Give an over-the-top compliment to the player on your right',
        'Tell an embarrassing story about yourself',
        'Do 5 squats right now',
        'Imitate an animal chosen by the group for 10 seconds',
        'Sing everything you say until the next round',
        'Let the group pick a nickname for you until the game ends',
        'Dance for 10 seconds without music',
        'Only answer with questions until the next round',
        'Hold a statue pose until someone laughs'
    ],
    es: [
        'Habla como un robot hasta la próxima votación',
        'Haz un cumplido exagerado al jugador de tu derecha',
        'Cuenta una historia vergonzosa tuya',
        'Haz 5 sentadillas ahora',
        'Imita un animal elegido por el grupo por 10 segundos',
        'Canta todo lo que digas hasta la próxima ronda',
        'Deja que el grupo te elija un apodo hasta el final',
        'Baila 10 segundos sin música',
        'Solo puedes responder con preguntas hasta la próxima ronda',
        'Haz pose de estatua hasta que alguien se ría'
    ]
};

function buildPunishmentHTML(playerName) {
    if (!localState.punishMode) return '';
    const bank = punishmentsByLang[currentLang] || punishmentsByLang.pt;
    const punishment = bank[Math.floor(Math.random() * bank.length)];
    return `<div style="margin:12px 0;padding:12px;border:2px dashed var(--accent);border-radius:10px">
        <p style="font-size:.7rem;letter-spacing:2px;color:var(--accent);margin-bottom:6px">🎪 ${t('punishFor')} ${playerName}</p>
        <p style="font-size:.85rem;line-height:1.4">${punishment}</p>
    </div>`;
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
    if (!wasImpostor) resultHTML += buildPunishmentHTML(playerName);
    const pointsSection = buildRoundPointsHTML();

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
                ${pointsSection}
                ${buttonsHTML}
            </div>
        </div>
    `;
}

function showVoteResultWithImpostorWin(playerName) {
    let resultHTML = `<div class="result-icon">❌</div><h3 style="color:#ff4444">${t('wrong')}</h3>
        <p style="font-size:1.1rem;margin:14px 0"><strong>${playerName}</strong> ${t('wasInnocent')}</p>
        <p style="color:var(--warning);font-size:.85rem;margin-top:10px">🎭 ${t('impostorWins')}</p>`;
    resultHTML += buildPunishmentHTML(playerName);

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                ${resultHTML}
                ${buildRoundPointsHTML()}
                <button class="btn btn-primary" onclick="closeOverlay();showImpostorWins();" style="margin-top:14px">${t('seeRoundSummary')}</button>
            </div>
        </div>
    `;
}

function showImpostorWins() {
    const impostorNames = localState.impostorIndices.map(i => localState.players[i] + (i === localState.mrWhiteIndex ? ' 🤍' : ''));
    const impostorLabel = localState.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Check for winner (only if maxPoints is set)
    if (localState.maxPoints && checkForWinner()) return;

    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    const rankingSection = `
        <div class="section-title">🏆 RANKING</div>
        <ul class="ranking-list">${buildRankingHTML(sorted)}</ul>
    `;

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
                ${buildRoundPointsHTML()}
                ${rankingSection}
                <p style="font-size:.65rem;color:var(--text-dim);margin-top:8px">${t('scoringLegend')}</p>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
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
    const impostorNames = localState.impostorIndices.map(i => localState.players[i] + (i === localState.mrWhiteIndex ? ' 🤍' : ''));
    const impostorLabel = localState.actualImpostorCount > 1 ? t('impostorsWere') : t('impostorWas');
    
    // Check for winner (only if maxPoints is set)
    if (localState.maxPoints && checkForWinner()) return;
    
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
    const rankingSection = `
        <div class="section-title">🏆 RANKING</div>
        <ul class="ranking-list">${buildRankingHTML(sorted)}</ul>
    `;

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>${t('roundEnd')} ${localState.round}</h3>
                <p style="margin-bottom:6px;color:var(--text-dim);font-size:.75rem">${impostorLabel}</p>
                <p style="font-size:1.2rem;color:var(--accent);margin:10px 0;font-family:'Bebas Neue',sans-serif;letter-spacing:2px">${impostorNames.join(', ')}</p>
                <p style="margin:14px 0;font-size:.85rem">${t('word')} <strong style="color:var(--success)">${localState.word}</strong></p>
                ${similarWordsInfo}
                ${buildRoundPointsHTML()}
                ${rankingSection}
                <p style="font-size:.65rem;color:var(--text-dim);margin-top:8px">${t('scoringLegend')}</p>
                <button class="btn btn-primary" onclick="closeOverlay();newRound();" style="margin-top:14px">${t('nextRound')}</button>
            </div>
        </div>
    `;
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
    // Save current impostors as previous (for weighted selection in next round)
    localState.previousImpostors = [...localState.impostorIndices];
    
    localState.round++;
    // Advance starter player (circular)
    localState.starterPlayerIndex = (localState.starterPlayerIndex + 1) % localState.players.length;
    startRound();
    showToast(t('newRound') + ' ' + localState.round);
}

function showRanking() {
    const sorted = Object.entries(localState.scores).sort((a, b) => b[1] - a[1]);
    document.getElementById('ranking-list').innerHTML = buildRankingHTML(sorted);
    saveLocalState('screen-ranking');
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
        selectedCategories: localState.selectedCategories.slice(),
        questionsMode: localState.questionsMode,
        impostorSurprise: localState.impostorSurprise,
        mrWhiteMode: localState.mrWhiteMode,
        punishMode: localState.punishMode
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
        votingRound: 0,
        starterPlayerIndex: 0,
        previousImpostors: [],
        questionsMode: savedSettings.questionsMode,
        roundQuestions: [],
        questionIndex: 0,
        impostorHints: {},
        impostorSurprise: savedSettings.impostorSurprise,
        roundPoints: {},
        mrWhiteMode: savedSettings.mrWhiteMode,
        mrWhiteIndex: null,
        punishMode: savedSettings.punishMode
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
