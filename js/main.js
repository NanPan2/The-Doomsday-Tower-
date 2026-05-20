// === DOM REFS ===
const $ = id => document.getElementById(id);

const screens = {
    title: $('screen-title'),
    perks: $('screen-perks'),
    game: $('screen-game'),
    gameover: $('screen-gameover'),
};
const phases = {
    shop: $('phase-shop'),
    encounter: $('phase-encounter'),
    combat: $('phase-combat'),
    result: $('phase-result'),
};

// === SCREEN MANAGEMENT ===
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function showPhase(name) {
    Object.values(phases).forEach(p => p.classList.add('hidden'));
    phases[name].classList.remove('hidden');
    state.phase = name;
}


// === HUD UPDATE ===
function updateHUD() {
    $('hud-day').textContent = `Day ${state.day}`;
    $('hud-wins').textContent = `Wins: ${state.wins}/10`;
    $('hud-gold').textContent = `Gold: ${state.gold}`;
    $('hud-level').textContent = `Level: ${state.level}`;
    let hearts = '';
    for (let i = 0; i < state.maxHearts; i++) {
        hearts += i < state.hearts ? '❤️' : '🖤';
    }
    $('hud-hearts').textContent = hearts;
}

// === ITEM CARD RENDERING ===
function renderItemCard(item, clickHandler, showCost = true) {
    const card = document.createElement('div');
    card.className = `item-card rarity-${item.rarity}`;
    const starsStr = item.stars > 0 ? '★'.repeat(item.stars) : '';
    card.innerHTML = `
        <div class="item-rarity-bar"></div>
        ${showCost ? `<span class="item-cost">${item.cost}g</span>` : ''}
        <div class="item-name">${item.name} ${starsStr}</div>
        <div class="item-stats">DMG:${item.damage} CD:${item.cooldown}s MC:${item.multicast}${item.crit ? ' C:'+item.crit+'%' : ''}</div>
        <div class="item-pack">${PACKS[item.pack]?.name || item.pack}</div>
        <div class="item-ability">${item.ability}</div>
    `;
    if (item.frozen) card.classList.add('frozen');
    if (clickHandler) card.addEventListener('click', clickHandler);
    // Tooltip
    card.addEventListener('mouseenter', e => showTooltip(e, item));
    card.addEventListener('mouseleave', hideTooltip);
    return card;
}

function showTooltip(e, item) {
    const tt = $('tooltip');
    const starsStr = item.stars > 0 ? ' ' + '★'.repeat(item.stars) : '';
    tt.innerHTML = `
        <div class="tt-name">${item.name}${starsStr}</div>
        <div class="tt-stats">DMG: ${item.damage} | CD: ${item.cooldown}s | MC: ${item.multicast} | Crit: ${item.crit}%</div>
        <div class="tt-ability">${item.ability}</div>
        <div class="tt-pack">${PACKS[item.pack]?.name || item.pack} | Tags: ${item.tags.join(', ')}</div>
    `;
    tt.classList.remove('hidden');
    const x = Math.min(e.clientX + 10, window.innerWidth - 300);
    const y = Math.min(e.clientY + 10, window.innerHeight - 150);
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
}

function hideTooltip() {
    $('tooltip').classList.add('hidden');
}


// === SHOP RENDERING ===
function renderShop() {
    const grid = $('shop-items');
    grid.innerHTML = '';
    state.shop.forEach((item, idx) => {
        const card = renderItemCard(item, () => {
            if (buyItem(idx)) {
                renderShop();
                renderTower();
                updateHUD();
            }
        });
        grid.appendChild(card);
    });
    $('btn-levelup').textContent = `Level Up (${getLevelUpCost()}g)`;
    $('btn-levelup').disabled = state.gold < getLevelUpCost() || state.level >= 7;
    $('btn-refresh').textContent = state.freeRefresh ? 'Refresh (Free)' : 'Refresh (3g)';
}

// === TOWER RENDERING ===
function renderTower() {
    const grid = $('tower-slots');
    grid.innerHTML = '';
    for (let i = 0; i < state.towerMaxSlots; i++) {
        if (i < state.tower.length) {
            const item = state.tower[i];
            const card = renderItemCard(item, () => {
                if (confirm(`Sell ${item.name} for ${Math.floor(item.cost*0.5)}g?`)) {
                    sellItem(i);
                    renderTower();
                    renderShop();
                    updateHUD();
                }
            }, false);
            grid.appendChild(card);
        } else {
            const slot = document.createElement('div');
            slot.className = 'tower-slot';
            slot.textContent = `Slot ${i + 1}`;
            grid.appendChild(slot);
        }
    }
}


// === ENCOUNTER RENDERING ===
function renderEncounter(encounterData, npcIdx = 0) {
    if (!encounterData || npcIdx >= encounterData.npcs.length) {
        // No more encounters, proceed to combat
        startCombat();
        return;
    }
    showPhase('encounter');
    const npc = encounterData.npcs[npcIdx];
    $('encounter-portrait').textContent = npc.icon;
    $('encounter-name').textContent = npc.name;
    $('encounter-flavor').textContent = npc.flavor;
    const choicesDiv = $('encounter-choices');
    choicesDiv.innerHTML = '';
    npc.choices.forEach(choice => {
        const btn = document.createElement('div');
        btn.className = 'encounter-choice';
        btn.innerHTML = `<h4>${choice.label}</h4><p>${choice.desc}</p>`;
        btn.addEventListener('click', () => {
            applyEncounterEffect(choice.effect);
            updateHUD();
            renderTower();
            // Check for next NPC in same day
            if (npcIdx + 1 < encounterData.npcs.length) {
                renderEncounter(encounterData, npcIdx + 1);
            } else {
                startCombat();
            }
        });
        choicesDiv.appendChild(btn);
    });
}


// === COMBAT PHASE ===
let combatInterval = null;

function startCombat() {
    showPhase('combat');
    const enemyTower = generateOpponent();

    // Deep copy player tower for combat (so permanent gains persist)
    const playerTower = state.tower.map(i => ({ ...i }));

    const { combat, tick, TICK, playerTimers, enemyTimers } = simulateCombat(
        playerTower, enemyTower,
        (c, pt, et) => updateCombatUI(c, pt, et, playerTower, enemyTower),
        (c) => endCombat(c)
    );

    // Render initial state
    renderCombatTowers(playerTower, enemyTower, playerTimers, enemyTimers);
    updateCombatUI(combat, playerTimers, enemyTimers, playerTower, enemyTower);
    $('combat-log').innerHTML = '';

    // Run combat tick loop
    combatInterval = setInterval(() => {
        tick();
        if (combat.done && combatInterval) {
            clearInterval(combatInterval);
            combatInterval = null;
        }
    }, TICK * 1000);

    // Skip button
    $('btn-skip-combat').onclick = () => {
        if (combatInterval) {
            clearInterval(combatInterval);
            combatInterval = null;
        }
        while (!combat.done) tick();
    };
}

function renderCombatTowers(playerTower, enemyTower, playerTimers, enemyTimers) {
    const pDiv = $('player-tower-display');
    const eDiv = $('enemy-tower-display');
    pDiv.innerHTML = '';
    eDiv.innerHTML = '';
    playerTower.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'combat-item';
        el.id = `p-item-${i}`;
        el.innerHTML = `<span>${item.name} (MC:${item.multicast})</span><span>DMG:${item.damage}</span>`;
        const cdBar = document.createElement('div');
        cdBar.className = 'cd-bar';
        cdBar.style.width = '0%';
        el.appendChild(cdBar);
        pDiv.appendChild(el);
    });
    enemyTower.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'combat-item';
        el.id = `e-item-${i}`;
        el.innerHTML = `<span>${item.name} (MC:${item.multicast})</span><span>DMG:${item.damage}</span>`;
        const cdBar = document.createElement('div');
        cdBar.className = 'cd-bar';
        cdBar.style.width = '0%';
        el.appendChild(cdBar);
        eDiv.appendChild(el);
    });
}


function updateCombatUI(combat, playerTimers, enemyTimers, playerTower, enemyTower) {
    // HP Bars
    const pPct = Math.max(0, (combat.playerHP / combat.playerMaxHP) * 100);
    const ePct = Math.max(0, (combat.enemyHP / combat.enemyMaxHP) * 100);
    $('player-hp-bar').style.width = pPct + '%';
    $('enemy-hp-bar').style.width = ePct + '%';
    const pShield = combat.playerShield > 0 ? ` [+${combat.playerShield} Shield]` : '';
    const eShield = combat.enemyShield > 0 ? ` [+${combat.enemyShield} Shield]` : '';
    $('player-hp-text').textContent = `${Math.max(0,Math.floor(combat.playerHP))} / ${combat.playerMaxHP}${pShield}`;
    $('enemy-hp-text').textContent = `${Math.max(0,Math.floor(combat.enemyHP))} / ${combat.enemyMaxHP}${eShield}`;

    // Cooldown bars & firing highlights
    playerTimers.forEach((t, i) => {
        const el = document.getElementById(`p-item-${i}`);
        if (!el) return;
        const bar = el.querySelector('.cd-bar');
        if (bar && t.item.cooldown > 0) bar.style.width = (t.elapsed / t.cd * 100) + '%';
        el.classList.toggle('firing', t.triggered);
    });
    enemyTimers.forEach((t, i) => {
        const el = document.getElementById(`e-item-${i}`);
        if (!el) return;
        const bar = el.querySelector('.cd-bar');
        if (bar && t.item.cooldown > 0) bar.style.width = (t.elapsed / t.cd * 100) + '%';
        el.classList.toggle('firing', t.triggered);
    });

    // Combat Log (last 30 entries)
    const logDiv = $('combat-log');
    const entries = combat.log.slice(-30);
    logDiv.innerHTML = entries.map(entry => {
        let cls = '';
        if (entry.includes('dmg') || entry.includes('damage')) cls = 'log-damage';
        if (entry.includes('heal') || entry.includes('Shield')) cls = 'log-heal';
        if (entry.includes('multicast') || entry.includes('synergy')) cls = 'log-effect';
        return `<div class="log-entry ${cls}">${entry}</div>`;
    }).join('');
    logDiv.scrollTop = logDiv.scrollHeight;
}


function endCombat(combat) {
    // Apply permanent damage/multicast gains back to state tower
    // (items that gained permanent stats during combat keep them)
    showPhase('result');
    const won = combat.winner === 'player';
    if (won) {
        state.wins++;
        $('result-title').textContent = '⚔️ VICTORY!';
        $('result-title').style.color = '#44cc44';
        $('result-detail').textContent = `Your tower overwhelmed the enemy! Wins: ${state.wins}/10`;
    } else {
        const heartsLost = getHeartsLost();
        state.hearts = Math.max(0, state.hearts - heartsLost);
        $('result-title').textContent = '💀 DEFEAT';
        $('result-title').style.color = '#ff4444';
        $('result-detail').textContent = `You lost ${heartsLost} heart(s). Hearts remaining: ${state.hearts}`;
    }
    updateHUD();

    // Check game end conditions
    if (state.wins >= 10) {
        setTimeout(() => showGameOver(true), 500);
    } else if (state.hearts <= 0) {
        setTimeout(() => showGameOver(false), 500);
    }
}

function showGameOver(won) {
    showScreen('gameover');
    if (won) {
        $('gameover-title').textContent = '🏆 DOOMSDAY SURVIVED!';
        $('gameover-title').style.color = '#ffd700';
        $('gameover-detail').textContent = 'You conquered the Doomsday Tower!';
    } else {
        $('gameover-title').textContent = '💀 TOWER FALLEN';
        $('gameover-title').style.color = '#ff4444';
        $('gameover-detail').textContent = 'The Doomsday claimed your tower...';
    }
    $('gameover-stats').innerHTML = `
        <p>Days survived: ${state.day}</p>
        <p>Wins: ${state.wins} / 10</p>
        <p>Level reached: ${state.level}</p>
        <p>Items in tower: ${state.tower.length}</p>
    `;
}


// === NEXT DAY ===
function nextDay() {
    startNewDay();
    updateHUD();

    // Check for encounters on this day
    const encounter = getEncounterForDay(state.day);
    if (encounter) {
        renderShop();
        renderTower();
        showPhase('shop');
        // Show encounter before combat when player hits "ready"
        state._pendingEncounter = encounter;
    } else {
        state._pendingEncounter = null;
        renderShop();
        renderTower();
        showPhase('shop');
    }
}

// === READY FOR COMBAT ===
function onReady() {
    if (state.tower.length === 0) {
        alert('You need at least 1 item in your tower!');
        return;
    }
    if (state._pendingEncounter) {
        const enc = state._pendingEncounter;
        state._pendingEncounter = null;
        renderEncounter(enc, 0);
    } else {
        startCombat();
    }
}

// === PERK SCREEN ===
function renderPerks() {
    const grid = $('perk-list');
    grid.innerHTML = '';
    PERKS.forEach(perk => {
        const card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML = `<h4>${perk.name}</h4><p>${perk.desc}</p>`;
        card.addEventListener('click', () => {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                state.selectedPerks = state.selectedPerks.filter(p => p !== perk.id);
            } else if (state.selectedPerks.length < 3) {
                card.classList.add('selected');
                state.selectedPerks.push(perk.id);
            }
        });
        grid.appendChild(card);
    });
}


// === INITIALIZATION & EVENT LISTENERS ===
function init() {
    // Title screen buttons
    $('btn-casual').addEventListener('click', () => {
        state.mode = 'casual';
        resetState();
        renderPerks();
        showScreen('perks');
    });
    $('btn-ranked').addEventListener('click', () => {
        state.mode = 'ranked';
        resetState();
        renderPerks();
        showScreen('perks');
    });

    // Perk screen
    $('btn-start-run').addEventListener('click', () => {
        // Apply starting perks
        if (state.selectedPerks.includes('doomsday_veteran')) {
            state.gold += 10;
        }
        if (state.selectedPerks.includes('expanded_stock')) {
            // Handled in shop generation
        }
        showScreen('game');
        generateShop();
        renderShop();
        renderTower();
        updateHUD();
        showPhase('shop');
    });

    // Shop buttons
    $('btn-refresh').addEventListener('click', () => {
        if (refreshShop()) {
            renderShop();
            updateHUD();
        }
    });
    $('btn-freeze').addEventListener('click', () => {
        freezeShop();
        renderShop();
    });
    $('btn-levelup').addEventListener('click', () => {
        if (levelUp()) {
            renderShop();
            renderTower();
            updateHUD();
        }
    });
    $('btn-ready').addEventListener('click', onReady);

    // Result next day
    $('btn-next-day').addEventListener('click', nextDay);

    // Restart
    $('btn-restart').addEventListener('click', () => {
        resetState();
        showScreen('title');
    });
}

// Start the game
init();
