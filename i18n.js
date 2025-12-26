// INTERNATIONALIZATION
const translations = {
    pt: {
        title: "O IMPOSTOR",
        subtitle: "Jogo de dedução social por palavras",
        players: "👥 Jogadores",
        maxImpostors: "🎭 Máx. Impostores",
        impostorInfo: "Pode ter de 1 até o máximo selecionado",
        impostorMode: "🔮 Modo Impostor",
        impostorKnows: "Impostor sabe que é impostor",
        impostorModeInfo: "Se desativado, impostor recebe palavra similar",
        names: "📝 Nomes",
        startGame: "🎮 INICIAR JOGO",
        howToPlay: "📖 Como Jogar",
        instructions: "<strong style='color:var(--text)'>1.</strong> Cada jogador vê sua palavra em segredo<br><strong style='color:var(--text)'>2.</strong> Todos recebem a mesma palavra, exceto os <span style='color:var(--accent)'>IMPOSTORES</span><br><strong style='color:var(--text)'>3.</strong> Cada um fala uma palavra relacionada<br><strong style='color:var(--text)'>4.</strong> A qualquer momento, votem em quem acham que é impostor<br><strong style='color:var(--text)'>5.</strong> Continue até descobrir todos os impostores<br><strong style='color:var(--text)'>6.</strong> Pontue os jogadores ao final!",
        round: "RODADA",
        pickUpPhone: "Pegue o celular e veja sua palavra",
        progress: "📋 Progresso",
        seeWord: "👁️ VER MINHA PALAVRA",
        yourMission: "SUA MISSÃO",
        memorizePass: "Memorize e passe o celular",
        gotItNext: "✓ ENTENDI, PRÓXIMO",
        playersLabel: "Jogadores",
        impostorsLabel: "Impostores",
        timeToPlay: "🎭 Hora de Jogar!",
        playInstructions: "Cada um fala uma palavra relacionada. Quando suspeitarem de alguém, votem!",
        chooseImpostor: "🗳️ ESCOLHER IMPOSTOR",
        seeRanking: "🏆 VER RANKING",
        restartGame: "REINICIAR JOGO",
        back: "← VOLTAR",
        installPrompt: "Instale o app para jogar offline!",
        install: "INSTALAR",
        player: "Jogador",
        impostor: "🎭 IMPOSTOR",
        whoIsImpostor: "🗳️ QUEM É O IMPOSTOR?",
        chooseWhoYouThink: "Escolha quem vocês acham que é o impostor:",
        cancel: "CANCELAR",
        correct: "ACERTARAM!",
        wrong: "ERRARAM!",
        wasImpostor: "era um impostor!",
        wasInnocent: "era inocente!",
        remainingImpostors: "Ainda há {n} impostor(es) restante(s)!",
        hiddenImpostors: "Ainda há {n} impostor(es) escondido(s)!",
        adjustPoints: "AJUSTAR PONTOS",
        roundEnd: "🏁 FIM DA RODADA",
        impostorsWere: "Os impostores eram:",
        impostorWas: "O impostor era:",
        word: "Palavra:",
        finalScore: "PONTUAÇÃO FINAL",
        nextRound: "PRÓXIMA RODADA",
        close: "FECHAR",
        continueVoting: "CONTINUAR VOTANDO",
        backToGame: "VOLTAR AO JOGO",
        seeRoundSummary: "VER RESUMO DA RODADA",
        restartConfirm: "⚠️ REINICIAR?",
        restartWarning: "Isso vai apagar todas as pontuações e reiniciar o jogo do zero.",
        yesRestart: "SIM, REINICIAR TUDO",
        gameRestarted: "Jogo reiniciado",
        gameRestored: "Jogo restaurado",
        newRound: "Rodada",
        settings: "⚙️ CONFIGURAÇÕES",
        language: "Idioma",
        saveSettings: "SALVAR",
        similarWord: "Palavra similar - você pode ser o impostor!",
        impostorWords: "Palavras dos impostores"
    },
    en: {
        title: "THE IMPOSTOR",
        subtitle: "Social deduction word game",
        players: "👥 Players",
        maxImpostors: "🎭 Max. Impostors",
        impostorInfo: "Can have from 1 up to the selected maximum",
        impostorMode: "🔮 Impostor Mode",
        impostorKnows: "Impostor knows they are the impostor",
        impostorModeInfo: "If disabled, impostor receives a similar word",
        names: "📝 Names",
        startGame: "🎮 START GAME",
        howToPlay: "📖 How to Play",
        instructions: "<strong style='color:var(--text)'>1.</strong> Each player sees their word secretly<br><strong style='color:var(--text)'>2.</strong> Everyone gets the same word, except the <span style='color:var(--accent)'>IMPOSTORS</span><br><strong style='color:var(--text)'>3.</strong> Each person says a related word<br><strong style='color:var(--text)'>4.</strong> At any time, vote on who you think is the impostor<br><strong style='color:var(--text)'>5.</strong> Continue until you find all impostors<br><strong style='color:var(--text)'>6.</strong> Score the players at the end!",
        round: "ROUND",
        pickUpPhone: "Pick up the phone and see your word",
        progress: "📋 Progress",
        seeWord: "👁️ SEE MY WORD",
        yourMission: "YOUR MISSION",
        memorizePass: "Memorize and pass the phone",
        gotItNext: "✓ GOT IT, NEXT",
        playersLabel: "Players",
        impostorsLabel: "Impostors",
        timeToPlay: "🎭 Time to Play!",
        playInstructions: "Each person says a related word. When you suspect someone, vote!",
        chooseImpostor: "🗳️ CHOOSE IMPOSTOR",
        seeRanking: "🏆 SEE RANKING",
        restartGame: "RESTART GAME",
        back: "← BACK",
        installPrompt: "Install the app to play offline!",
        install: "INSTALL",
        player: "Player",
        impostor: "🎭 IMPOSTOR",
        whoIsImpostor: "🗳️ WHO IS THE IMPOSTOR?",
        chooseWhoYouThink: "Choose who you think is the impostor:",
        cancel: "CANCEL",
        correct: "CORRECT!",
        wrong: "WRONG!",
        wasImpostor: "was an impostor!",
        wasInnocent: "was innocent!",
        remainingImpostors: "There are still {n} impostor(s) remaining!",
        hiddenImpostors: "There are still {n} impostor(s) hidden!",
        adjustPoints: "ADJUST POINTS",
        roundEnd: "🏁 END OF ROUND",
        impostorsWere: "The impostors were:",
        impostorWas: "The impostor was:",
        word: "Word:",
        finalScore: "FINAL SCORE",
        nextRound: "NEXT ROUND",
        close: "CLOSE",
        continueVoting: "CONTINUE VOTING",
        backToGame: "BACK TO GAME",
        seeRoundSummary: "SEE ROUND SUMMARY",
        restartConfirm: "⚠️ RESTART?",
        restartWarning: "This will erase all scores and restart the game from scratch.",
        yesRestart: "YES, RESTART ALL",
        gameRestarted: "Game restarted",
        gameRestored: "Game restored",
        newRound: "Round",
        settings: "⚙️ SETTINGS",
        language: "Language",
        saveSettings: "SAVE",
        similarWord: "Similar word - you might be the impostor!",
        impostorWords: "Impostor words"
    },
    es: {
        title: "EL IMPOSTOR",
        subtitle: "Juego de deducción social por palabras",
        players: "👥 Jugadores",
        maxImpostors: "🎭 Máx. Impostores",
        impostorInfo: "Puede haber de 1 hasta el máximo seleccionado",
        impostorMode: "🔮 Modo Impostor",
        impostorKnows: "Impostor sabe que es impostor",
        impostorModeInfo: "Si está desactivado, el impostor recibe una palabra similar",
        names: "📝 Nombres",
        startGame: "🎮 INICIAR JUEGO",
        howToPlay: "📖 Cómo Jugar",
        instructions: "<strong style='color:var(--text)'>1.</strong> Cada jugador ve su palabra en secreto<br><strong style='color:var(--text)'>2.</strong> Todos reciben la misma palabra, excepto los <span style='color:var(--accent)'>IMPOSTORES</span><br><strong style='color:var(--text)'>3.</strong> Cada uno dice una palabra relacionada<br><strong style='color:var(--text)'>4.</strong> En cualquier momento, voten por quién creen que es el impostor<br><strong style='color:var(--text)'>5.</strong> Continúen hasta descubrir todos los impostores<br><strong style='color:var(--text)'>6.</strong> ¡Puntúen a los jugadores al final!",
        round: "RONDA",
        pickUpPhone: "Toma el celular y ve tu palabra",
        progress: "📋 Progreso",
        seeWord: "👁️ VER MI PALABRA",
        yourMission: "TU MISIÓN",
        memorizePass: "Memoriza y pasa el celular",
        gotItNext: "✓ ENTENDIDO, SIGUIENTE",
        playersLabel: "Jugadores",
        impostorsLabel: "Impostores",
        timeToPlay: "🎭 ¡Hora de Jugar!",
        playInstructions: "Cada uno dice una palabra relacionada. ¡Cuando sospechen de alguien, voten!",
        chooseImpostor: "🗳️ ELEGIR IMPOSTOR",
        seeRanking: "🏆 VER RANKING",
        restartGame: "REINICIAR JUEGO",
        back: "← VOLVER",
        installPrompt: "¡Instala la app para jugar sin conexión!",
        install: "INSTALAR",
        player: "Jugador",
        impostor: "🎭 IMPOSTOR",
        whoIsImpostor: "🗳️ ¿QUIÉN ES EL IMPOSTOR?",
        chooseWhoYouThink: "Elijan quién creen que es el impostor:",
        cancel: "CANCELAR",
        correct: "¡ACERTARON!",
        wrong: "¡FALLARON!",
        wasImpostor: "¡era un impostor!",
        wasInnocent: "¡era inocente!",
        remainingImpostors: "¡Todavía hay {n} impostor(es) restante(s)!",
        hiddenImpostors: "¡Todavía hay {n} impostor(es) escondido(s)!",
        adjustPoints: "AJUSTAR PUNTOS",
        roundEnd: "🏁 FIN DE LA RONDA",
        impostorsWere: "Los impostores eran:",
        impostorWas: "El impostor era:",
        word: "Palabra:",
        finalScore: "PUNTUACIÓN FINAL",
        nextRound: "SIGUIENTE RONDA",
        close: "CERRAR",
        continueVoting: "CONTINUAR VOTANDO",
        backToGame: "VOLVER AL JUEGO",
        seeRoundSummary: "VER RESUMEN DE RONDA",
        restartConfirm: "⚠️ ¿REINICIAR?",
        restartWarning: "Esto borrará todas las puntuaciones y reiniciará el juego desde cero.",
        yesRestart: "SÍ, REINICIAR TODO",
        gameRestarted: "Juego reiniciado",
        gameRestored: "Juego restaurado",
        newRound: "Ronda",
        settings: "⚙️ CONFIGURACIÓN",
        language: "Idioma",
        saveSettings: "GUARDAR",
        similarWord: "Palabra similar - ¡podrías ser el impostor!",
        impostorWords: "Palabras de los impostores"
    }
};

let currentLang = 'pt';

function t(key) {
    return translations[currentLang][key] || translations['pt'][key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (key === 'instructions') {
            el.innerHTML = text;
        } else {
            el.textContent = text;
        }
    });
    document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es' : 'en';
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('impostor_lang', lang);
    applyTranslations();
    if (typeof initHomeScreen === 'function') {
        initHomeScreen();
    }
    showScreen('screen-home');
}

function loadLanguage() {
    const saved = localStorage.getItem('impostor_lang');
    if (saved) {
        currentLang = saved;
        return true;
    }
    return false;
}

function showSettings() {
    const flags = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };
    const names = { pt: 'Português', en: 'English', es: 'Español' };
    
    document.getElementById('overlay-container').innerHTML = `
        <div class="confirm-overlay" onclick="closeOverlay(event)">
            <div class="confirm-box" onclick="event.stopPropagation()">
                <h3>${t('settings')}</h3>
                <div class="section-title">${t('language')}</div>
                <div class="lang-selector" style="margin:16px 0">
                    <button class="lang-btn ${currentLang === 'pt' ? 'selected' : ''}" onclick="setLanguage('pt');closeOverlay()"><span class="flag">🇧🇷</span>Português</button>
                    <button class="lang-btn ${currentLang === 'en' ? 'selected' : ''}" onclick="setLanguage('en');closeOverlay()"><span class="flag">🇺🇸</span>English</button>
                    <button class="lang-btn ${currentLang === 'es' ? 'selected' : ''}" onclick="setLanguage('es');closeOverlay()"><span class="flag">🇪🇸</span>Español</button>
                </div>
                <button class="btn btn-secondary" onclick="closeOverlay()">${t('close')}</button>
            </div>
        </div>
    `;
}
