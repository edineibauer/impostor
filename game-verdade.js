// GAME-VERDADE.JS - "Verdade ou Mentira"
// O app sorteia em segredo se o contador deve contar uma história VERDADEIRA
// ou INVENTADA, junto com um tema. O grupo ouve e vota. Quem acerta pontua;
// o contador pontua por cada pessoa que enganou.

const vlThemesByLang = {
    pt: [
        'algo que aconteceu numa viagem',
        'um mico que você pagou em público',
        'algo que aconteceu na escola ou faculdade',
        'uma história com um animal',
        'algo que aconteceu no trabalho',
        'um encontro (date) que deu errado',
        'uma vez em que você se machucou de forma boba',
        'uma história com comida',
        'algo que aconteceu numa festa',
        'uma vez em que você se perdeu',
        'uma história com um famoso ou quase-famoso',
        'algo que você quebrou e ninguém descobriu',
        'uma mentira que você contou quando criança',
        'uma história com carro, moto ou ônibus',
        'um susto que você levou',
        'algo que aconteceu de madrugada',
        'uma coincidência absurda que aconteceu com você',
        'uma vez em que você foi confundido com outra pessoa',
        'uma história com um vizinho',
        'algo estranho que você já comeu',
        'uma vez em que você ganhou ou quase ganhou um prêmio',
        'uma história de quando você era criança',
        'algo que aconteceu num banheiro',
        'uma vez em que você fingiu saber algo que não sabia',
        'uma história com a polícia ou segurança',
        'algo que você achou na rua',
        'uma vez em que você dormiu onde não devia',
        'uma história com tecnologia dando errado',
        'um presente muito ruim que você recebeu',
        'uma vez em que você chorou num filme ou série',
        'uma história com um professor ou chefe',
        'algo que aconteceu na praia ou piscina',
        'uma vez em que você passou vergonha por mensagem',
        'uma história com um bêbado (você ou outra pessoa)',
        'algo que sumiu misteriosamente da sua casa',
        'uma vez em que você foi muito sortudo',
        'uma história com chuva ou tempestade',
        'algo que você colecionava',
        'uma vez em que você quase foi demitido ou expulso',
        'uma história de reveillon ou natal'
    ],
    en: [
        'something that happened on a trip',
        'an embarrassing moment in public',
        'something that happened at school',
        'a story involving an animal',
        'something that happened at work',
        'a date that went wrong',
        'a silly way you got hurt',
        'a story involving food',
        'something that happened at a party',
        'a time you got lost'
    ],
    es: [
        'algo que pasó en un viaje',
        'un momento vergonzoso en público',
        'algo que pasó en la escuela',
        'una historia con un animal',
        'algo que pasó en el trabajo',
        'una cita que salió mal',
        'una forma tonta en que te lastimaste',
        'una historia con comida',
        'algo que pasó en una fiesta',
        'una vez que te perdiste'
    ]
};

let vlState = {
    players: [],
    scores: {},
    storytellerIdx: 0,
    round: 1,
    secret: null, // 'truth' | 'lie'
    theme: null,
    usedThemes: [],
    voteOrder: [],
    votePos: 0,
    votes: {} // voterIdx -> 'truth' | 'lie'
};

function showVlSetup() {
    const selector = document.getElementById('vl-player-selector');
    const current = vlState.players.length >= 3 ? vlState.players.length : 4;
    selector.innerHTML = '';
    for (let i = 3; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn' + (i === current ? ' selected' : '');
        btn.textContent = i;
        btn.onclick = function () {
            selector.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            vlGeneratePlayerInputs(i);
        };
        selector.appendChild(btn);
    }
    vlGeneratePlayerInputs(current);
    showScreen('screen-vl-setup');
}

function vlGeneratePlayerInputs(count) {
    const container = document.getElementById('vl-player-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'player-config';
        div.innerHTML = '<div class="player-number">' + i + '</div><input type="text" id="vl-player-' + i + '" placeholder="' + t('player') + ' ' + i + '" maxlength="15">';
        container.appendChild(div);
    }
}

function startVlGame() {
    const inputs = document.querySelectorAll('#vl-player-inputs input');
    vlState.players = [];
    vlState.scores = {};
    inputs.forEach((input, i) => {
        const name = input.value.trim() || t('player') + ' ' + (i + 1);
        vlState.players.push(name);
        vlState.scores[name] = 0;
    });
    vlState.storytellerIdx = 0;
    vlState.round = 1;
    vlState.usedThemes = [];
    showVlTurn();
}

function vlRandomTheme() {
    const bank = vlThemesByLang[currentLang] || vlThemesByLang.pt;
    const available = bank.filter(tm => !vlState.usedThemes.includes(tm));
    const pool = available.length > 0 ? available : bank;
    if (available.length === 0) vlState.usedThemes = [];
    const theme = pool[Math.floor(Math.random() * pool.length)];
    vlState.usedThemes.push(theme);
    return theme;
}

function showVlTurn() {
    vlState.secret = Math.random() < 0.5 ? 'truth' : 'lie';
    vlState.theme = vlRandomTheme();
    document.getElementById('vl-turn-player').textContent = vlState.players[vlState.storytellerIdx];
    document.getElementById('vl-turn-round').textContent = vlState.round;
    showScreen('screen-vl-turn');
}

function showVlSecret() {
    const isTruth = vlState.secret === 'truth';
    const missionEl = document.getElementById('vl-mission');
    missionEl.textContent = isTruth ? t('vlMissionTruth') : t('vlMissionLie');
    missionEl.style.color = isTruth ? 'var(--success)' : '#ff4444';
    document.getElementById('vl-theme').textContent = t('vlThemePrefix') + ' ' + vlState.theme;
    showScreen('screen-vl-secret');
}

function showVlTelling() {
    document.getElementById('vl-telling-player').textContent = vlState.players[vlState.storytellerIdx];
    showScreen('screen-vl-telling');
}

function startVlVoting() {
    vlState.voteOrder = vlState.players.map((_, i) => i).filter(i => i !== vlState.storytellerIdx);
    vlState.votePos = 0;
    vlState.votes = {};
    renderVlVoterTurn();
}

function renderVlVoterTurn() {
    const voterIdx = vlState.voteOrder[vlState.votePos];
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <h3>🗳️ ${t('votingTitle')}</h3>
                <p style="color:var(--text-dim);font-size:.7rem;margin:4px 0 10px">${vlState.votePos + 1} / ${vlState.voteOrder.length}</p>
                <p style="font-size:1rem;margin-bottom:14px">${t('vlVotePrompt').replace('{name}', `<strong style="color:var(--primary)">${vlState.players[voterIdx]}</strong>`)}</p>
                <button class="btn btn-success" onclick="registerVlVote('truth')" style="margin-bottom:8px">✅ ${t('vlTruth')}</button>
                <button class="btn btn-danger" onclick="registerVlVote('lie')" style="opacity:1">❌ ${t('vlLie')}</button>
                <button class="btn btn-secondary" onclick="closeOverlay()" style="margin-top:12px">${t('cancel')}</button>
            </div>
        </div>
    `;
}

function registerVlVote(vote) {
    const voterIdx = vlState.voteOrder[vlState.votePos];
    vlState.votes[voterIdx] = vote;
    vlState.votePos++;
    if (vlState.votePos >= vlState.voteOrder.length) {
        showVlReveal();
    } else {
        renderVlVoterTurn();
    }
}

function showVlReveal() {
    const isTruth = vlState.secret === 'truth';
    const storyteller = vlState.players[vlState.storytellerIdx];
    let fooled = 0;
    const votesHTML = vlState.voteOrder.map(voterIdx => {
        const correct = vlState.votes[voterIdx] === vlState.secret;
        const name = vlState.players[voterIdx];
        if (correct) {
            vlState.scores[name]++;
        } else {
            fooled++;
        }
        const voteLabel = vlState.votes[voterIdx] === 'truth' ? t('vlTruth') : t('vlLie');
        return `<p style="font-size:.8rem;margin:3px 0">${correct ? '✅' : '❌'} <span style="color:var(--text-dim)">${name}:</span> ${voteLabel} ${correct ? '<strong style="color:var(--success)">+1</strong>' : ''}</p>`;
    }).join('');
    vlState.scores[storyteller] += fooled;

    const sorted = Object.entries(vlState.scores).sort((a, b) => b[1] - a[1]);
    const rankingHTML = sorted.map(([name, score], idx) =>
        `<li class="ranking-item${idx === 0 && score > 0 ? ' gold' : ''}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="ranking-score">${score}</span></li>`
    ).join('');

    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay">
            <div class="confirm-box">
                <div class="result-icon">${isTruth ? '✅' : '🤥'}</div>
                <h3 style="color:${isTruth ? 'var(--success)' : '#ff4444'}">${isTruth ? t('vlWasTruth') : t('vlWasLie')}</h3>
                <div style="margin:12px 0">${votesHTML}</div>
                <p style="font-size:.8rem;margin:8px 0">${t('vlFooled').replace('{name}', `<strong>${storyteller}</strong>`).replace('{n}', fooled)} ${fooled > 0 ? `<strong style="color:var(--success)">+${fooled}</strong>` : ''}</p>
                <div class="section-title">🏆 RANKING</div>
                <ul class="ranking-list">${rankingHTML}</ul>
                <button class="btn btn-primary" onclick="closeOverlay();vlNextTurn();" style="margin-top:14px">${t('vlNextStory')}</button>
                <button class="btn btn-secondary" onclick="closeOverlay();showVlEnd();" style="margin-top:8px">${t('vlEndGame')}</button>
            </div>
        </div>
    `;
}

function vlNextTurn() {
    vlState.storytellerIdx = (vlState.storytellerIdx + 1) % vlState.players.length;
    if (vlState.storytellerIdx === 0) vlState.round++;
    showVlTurn();
}

function showVlEnd() {
    const sorted = Object.entries(vlState.scores).sort((a, b) => b[1] - a[1]);
    document.getElementById('vl-final-ranking').innerHTML = sorted.map(([name, score], idx) => {
        let cls = 'ranking-item';
        if (idx === 0 && score > 0) cls += ' gold';
        else if (idx === 1 && score > 0) cls += ' silver';
        else if (idx === 2 && score > 0) cls += ' bronze';
        return `<li class="${cls}"><div class="ranking-position">${idx + 1}</div><span class="ranking-name">${name}</span><span class="ranking-score">${score}</span></li>`;
    }).join('');
    showScreen('screen-vl-end');
}

function vlPlayAgain() {
    vlState.storytellerIdx = 0;
    vlState.round = 1;
    Object.keys(vlState.scores).forEach(n => vlState.scores[n] = 0);
    showVlTurn();
}
