// GAME-QUEMSOUEU.JS - "Quem Sou Eu" (celular na testa)
// Um jogador segura o celular na testa com uma palavra gigante na tela;
// os outros dão dicas; ele acerta o máximo que conseguir dentro do tempo.
// Reusa o banco de palavras e categorias do Impostor.

let qsState = {
    players: [],
    scores: {},
    roundTime: 60,
    currentPlayerIdx: 0,
    round: 1,
    totalRounds: 2,
    usedWords: [],
    turnWords: [], // { word, ok } da vez atual
    currentWord: null,
    timeLeft: 0,
    timerId: null,
    playing: false
};

function showQsSetup() {
    // Player count selector (2-12)
    const selector = document.getElementById('qs-player-selector');
    const current = qsState.players.length >= 2 ? qsState.players.length : 4;
    selector.innerHTML = '';
    for (let i = 2; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === current ? ' selected' : '');
        btn.textContent = i;
        btn.onclick = function () {
            selector.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            qsGeneratePlayerInputs(i);
        };
        selector.appendChild(btn);
    }
    qsGeneratePlayerInputs(current);

    // Time selector
    const timeSel = document.getElementById('qs-time-selector');
    timeSel.innerHTML = '';
    [30, 60, 90].forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (s === qsState.roundTime ? ' selected' : '');
        btn.textContent = s + 's';
        btn.onclick = function () {
            timeSel.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            qsState.roundTime = s;
        };
        timeSel.appendChild(btn);
    });

    // Rounds selector
    const roundsSel = document.getElementById('qs-rounds-selector');
    roundsSel.innerHTML = '';
    [1, 2, 3].forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (r === qsState.totalRounds ? ' selected' : '');
        btn.textContent = r;
        btn.onclick = function () {
            roundsSel.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            qsState.totalRounds = r;
        };
        roundsSel.appendChild(btn);
    });

    showScreen('screen-qs-setup');
}

function qsGeneratePlayerInputs(count) {
    const container = document.getElementById('qs-player-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'player-config';
        div.innerHTML = '<div class="player-number">' + i + '</div><input type="text" id="qs-player-' + i + '" placeholder="' + t('player') + ' ' + i + '" maxlength="15">';
        container.appendChild(div);
    }
}

function startQsGame() {
    const inputs = document.querySelectorAll('#qs-player-inputs input');
    qsState.players = [];
    qsState.scores = {};
    inputs.forEach((input, i) => {
        const name = input.value.trim() || t('player') + ' ' + (i + 1);
        qsState.players.push(name);
        qsState.scores[name] = 0;
    });
    qsState.currentPlayerIdx = 0;
    qsState.round = 1;
    qsState.usedWords = [];
    showQsTurn();
}

function showQsTurn() {
    document.getElementById('qs-turn-player').textContent = qsState.players[qsState.currentPlayerIdx];
    document.getElementById('qs-turn-round').textContent = qsState.round + ' / ' + qsState.totalRounds;
    showScreen('screen-qs-turn');
}

function qsRandomWord() {
    const categories = getWordCategories();
    for (let attempt = 0; attempt < 50; attempt++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const word = cat.words[Math.floor(Math.random() * cat.words.length)];
        if (!qsState.usedWords.includes(word)) {
            qsState.usedWords.push(word);
            return { word: word, category: cat.category };
        }
    }
    // Word pool nearly exhausted: reset history
    qsState.usedWords = [];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const word = cat.words[Math.floor(Math.random() * cat.words.length)];
    qsState.usedWords.push(word);
    return { word: word, category: cat.category };
}

function startQsTurn() {
    qsState.turnWords = [];
    qsState.timeLeft = qsState.roundTime;
    qsState.playing = true;
    qsNextWord();
    showScreen('screen-qs-play');
    qsUpdateTimer();
    qsEnableTilt(); // chamado num gesto do usuário (necessário para permissão no iOS)
    qsState.timerId = setInterval(() => {
        qsState.timeLeft--;
        qsUpdateTimer();
        if (qsState.timeLeft <= 0) endQsTurn();
    }, 1000);
}

// TILT CONTROLS — funciona em qualquer orientação (retrato ou paisagem):
// mede se a TELA aponta para o teto ou para o chão via beta/gamma.
// faceValue = cos(beta)·cos(gamma): +1 tela para cima, -1 tela para baixo,
// ~0 na posição neutra (celular em pé na testa).
let qsOrientationHandler = null;
let qsTiltArmed = true;

function qsEnableTilt() {
    if (typeof DeviceOrientationEvent === 'undefined') return;

    const attach = () => {
        qsTiltArmed = true;
        qsOrientationHandler = (e) => {
            if (!qsState.playing || e.beta === null || e.gamma === null) return;
            const rad = Math.PI / 180;
            const face = Math.cos(e.beta * rad) * Math.cos(e.gamma * rad);
            if (qsTiltArmed) {
                if (face > 0.5) {          // tela virada para o teto = acertou
                    qsTiltArmed = false;
                    qsFlash(true);
                    qsMark(true);
                } else if (face < -0.5) {  // tela virada para o chão = passar
                    qsTiltArmed = false;
                    qsFlash(false);
                    qsMark(false);
                }
            } else if (Math.abs(face) < 0.25) {
                qsTiltArmed = true;        // voltou à posição neutra: rearma
            }
        };
        window.addEventListener('deviceorientation', qsOrientationHandler);
    };

    // iOS 13+ exige permissão a partir de um gesto do usuário
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(p => { if (p === 'granted') attach(); })
            .catch(() => {});
    } else {
        attach();
    }
}

function qsDisableTilt() {
    if (qsOrientationHandler) {
        window.removeEventListener('deviceorientation', qsOrientationHandler);
        qsOrientationHandler = null;
    }
}

// Flash de feedback em tela cheia (verde = acertou, laranja = passou)
function qsFlash(ok) {
    const el = document.getElementById('qs-flash');
    if (!el) return;
    el.textContent = ok ? '✓' : '↷';
    el.style.background = ok ? 'rgba(0,200,100,0.85)' : 'rgba(255,170,0,0.85)';
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 350);
}

function qsUpdateTimer() {
    const el = document.getElementById('qs-timer');
    el.textContent = qsState.timeLeft + 's';
    el.style.color = qsState.timeLeft <= 10 ? '#ff4444' : 'var(--text)';
}

function qsNextWord() {
    const next = qsRandomWord();
    qsState.currentWord = next;
    document.getElementById('qs-word').textContent = next.word;
    document.getElementById('qs-category').textContent = next.category;
}

function qsMark(ok) {
    if (!qsState.playing) return;
    qsState.turnWords.push({ word: qsState.currentWord.word, ok: ok });
    if (ok) {
        const name = qsState.players[qsState.currentPlayerIdx];
        qsState.scores[name]++;
    }
    qsNextWord();
}

function endQsTurn() {
    if (qsState.timerId) { clearInterval(qsState.timerId); qsState.timerId = null; }
    qsState.playing = false;
    qsDisableTilt();

    const name = qsState.players[qsState.currentPlayerIdx];
    const hits = qsState.turnWords.filter(w => w.ok);
    const misses = qsState.turnWords.filter(w => !w.ok);

    document.getElementById('qs-result-player').textContent = name;
    document.getElementById('qs-result-score').textContent = '+' + hits.length;
    document.getElementById('qs-result-words').innerHTML =
        hits.map(w => `<span style="display:inline-block;margin:3px;padding:5px 12px;border-radius:20px;font-size:.75rem;background:rgba(0,200,100,0.12);color:var(--success)">✓ ${w.word}</span>`).join('') +
        misses.map(w => `<span style="display:inline-block;margin:3px;padding:5px 12px;border-radius:20px;font-size:.75rem;background:rgba(255,68,68,0.12);color:#ff4444">✗ ${w.word}</span>`).join('');

    showScreen('screen-qs-result');
}

function qsNextTurn() {
    qsState.currentPlayerIdx++;
    if (qsState.currentPlayerIdx >= qsState.players.length) {
        qsState.currentPlayerIdx = 0;
        qsState.round++;
        if (qsState.round > qsState.totalRounds) {
            showQsEnd();
            return;
        }
    }
    showQsTurn();
}

function showQsEnd() {
    const sorted = Object.entries(qsState.scores).sort((a, b) => b[1] - a[1]);
    document.getElementById('qs-final-ranking').innerHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="ranking-score">${score}</span></li>`;
    }).join('');
    showScreen('screen-qs-end');
}

function qsPlayAgain() {
    qsState.currentPlayerIdx = 0;
    qsState.round = 1;
    Object.keys(qsState.scores).forEach(n => qsState.scores[n] = 0);
    showQsTurn();
}
