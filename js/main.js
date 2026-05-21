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

// === SVG ICON SYSTEM ===
let svgIconsLoaded = false;

function loadSVGIcons() {
    fetch('img/icons.svg')
        .then(r => r.text())
        .then(svgText => {
            $('svg-icons').innerHTML = svgText;
            svgIconsLoaded = true;
        })
        .catch(() => { svgIconsLoaded = false; });
}


// Map tags to icon IDs
const TAG_ICON_MAP = {
    'Weapon': 'icon-weapon',
    'Bow': 'icon-bow',
    'Dagger': 'icon-dagger',
    'Spell': 'icon-spell',
    'Relic': 'icon-relic',
    'Skill': 'icon-skill',
    'Skyspine': 'icon-skyspine'
};

const PACK_ICON_MAP = {
    'mana': 'icon-pack-mana',
    'doomsday': 'icon-pack-doomsday',
    'lostmagic': 'icon-pack-lostmagic',
    'dark': 'icon-pack-dark',
    'gorthon': 'icon-pack-gorthon',
    'church': 'icon-pack-church',
    'neutral': 'icon-pack-neutral'
};

// Rarity color map for icon tinting
const RARITY_COLORS = {
    common: '#aaaacc',
    rare: '#4488ff',
    epic: '#bb55ff',
    legendary: '#ffaa00',
    relic: '#00ffcc',
    cursed: '#ff44aa',
    forged: '#ff6600'
};

function getTagIcon(item) {
    const tag = item.tags[0] || 'Weapon';
    const iconId = TAG_ICON_MAP[tag] || 'icon-weapon';
    return iconId;
}

function getPackIcon(pack) {
    return PACK_ICON_MAP[pack] || 'icon-pack-neutral';
}

function createSVGUse(iconId, width, height, color) {
    const w = width || 32;
    const h = height || 32;
    const c = color || 'currentColor';
    return `<svg width="${w}" height="${h}" style="color:${c}"><use href="#${iconId}"/></svg>`;
}


// === BACKGROUND PARTICLES ===
function initParticles() {
    const container = $('background-fx');
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.animationDuration = (6 + Math.random() * 6) + 's';
        const colors = ['#ffd700', '#6644ff', '#00ccaa', '#ff6600', '#4488ff'];
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (1 + Math.random() * 2) + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
}

// === FLOATING DAMAGE NUMBERS ===
function showDamageFloat(targetEl, text, type) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const dmgEl = document.createElement('div');
    dmgEl.className = 'damage-float ' + (type || 'dmg-enemy');
    dmgEl.textContent = text;
    dmgEl.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 30) + 'px';
    dmgEl.style.top = (rect.top + Math.random() * 10) + 'px';
    $('damage-numbers').appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 1300);
}

// === SCREEN SHAKE ===
function screenShake() {
    const app = $('app');
    app.classList.add('screen-shake');
    setTimeout(() => app.classList.remove('screen-shake'), 300);
}


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
    $('hud-day').textContent = 'Day ' + state.day;
    if (state.endless) {
        $('hud-wins').textContent = 'Score: ' + state.endlessDay;
        $('hud-endless-badge').classList.remove('hidden');
    } else {
        $('hud-wins').textContent = 'Wins: ' + state.wins + '/10';
        $('hud-endless-badge').classList.add('hidden');
    }
    $('hud-gold').textContent = 'Gold: ' + state.gold;
    $('hud-level').textContent = 'Lv.' + state.level;
    var hearts = '';
    for (var i = 0; i < state.maxHearts; i++) {
        hearts += i < state.hearts ? '❤️' : '🖤';
    }
    $('hud-hearts').textContent = hearts;
    // XP bar
    var xpNeeded = state.level < 7 ? XP_THRESHOLDS[state.level] : 0;
    var xpPct = xpNeeded > 0 ? Math.min(100, (state.xp / xpNeeded) * 100) : 100;
    $('hud-xp-bar').style.width = xpPct + '%';
    if (state.level >= 7) {
        $('hud-xp-text').textContent = 'MAX LEVEL';
    } else {
        $('hud-xp-text').textContent = 'XP: ' + state.xp + '/' + xpNeeded;
    }
}


// === ITEM CARD RENDERING ===
function renderItemCard(item, clickHandler, showCost) {
    if (showCost === undefined) showCost = true;
    var card = document.createElement('div');
    card.className = 'item-card rarity-' + item.rarity + ' pack-' + item.pack;

    var tagIcon = getTagIcon(item);
    var packIcon = getPackIcon(item.pack);
    var iconColor = RARITY_COLORS[item.rarity] || '#aaaacc';
    var starsStr = item.stars > 0 ? (' ' + '★'.repeat(item.stars)) : '';
    var packColor = PACKS[item.pack] ? PACKS[item.pack].color : '#888';
    var packName = PACKS[item.pack] ? PACKS[item.pack].name : item.pack;

    card.innerHTML =
        (showCost ? '<span class="item-cost">' + item.cost + 'g</span>' : '') +
        '<div class="card-icon-area">' +
            '<div class="card-pack-bg">' + createSVGUse(packIcon, 52, 52, packColor) + '</div>' +
            createSVGUse(tagIcon, 32, 32, iconColor) +
        '</div>' +
        '<div class="card-body">' +
            '<div class="item-name">' + item.name + '<span class="item-stars">' + starsStr + '</span></div>' +
            '<div class="item-stats">' +
                '<span class="stat-dmg">⚔' + item.damage + '</span>' +
                '<span class="stat-cd">⏱' + item.cooldown + 's</span>' +
                '<span class="stat-mc">✦' + item.multicast + '</span>' +
            '</div>' +
            '<div class="item-pack-badge" style="color:' + packColor + ';border-color:' + packColor + '40">' + packName + '</div>' +
            '<div class="item-ability">' + item.ability + '</div>' +
        '</div>';

    if (item.frozen) card.classList.add('frozen');
    if (clickHandler) card.addEventListener('click', clickHandler);
    card.addEventListener('mouseenter', function(e) { showTooltip(e, item); });
    card.addEventListener('mouseleave', hideTooltip);
    return card;
}


function showTooltip(e, item) {
    var tt = $('tooltip');
    var starsStr = item.stars > 0 ? ' ' + '★'.repeat(item.stars) : '';
    var packName = PACKS[item.pack] ? PACKS[item.pack].name : item.pack;
    tt.innerHTML =
        '<div class="tt-name" style="color:' + (RARITY_COLORS[item.rarity] || '#fff') + '">' + item.name + starsStr + '</div>' +
        '<div class="tt-stats">DMG: ' + item.damage + ' | CD: ' + item.cooldown + 's | MC: ' + item.multicast + ' | Crit: ' + item.crit + '%</div>' +
        '<div class="tt-ability">' + item.ability + '</div>' +
        '<div class="tt-pack">' + packName + ' | Tags: ' + item.tags.join(', ') + '</div>';
    tt.classList.remove('hidden');
    var x = Math.min(e.clientX + 12, window.innerWidth - 320);
    var y = Math.min(e.clientY + 12, window.innerHeight - 160);
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
}

function hideTooltip() {
    $('tooltip').classList.add('hidden');
}

// === SHOP RENDERING ===
function renderShop() {
    var grid = $('shop-items');
    grid.innerHTML = '';
    state.shop.forEach(function(item, idx) {
        if (item.isPotion) {
            var card = renderPotionCard(item, function() {
                if (buyPotion(idx)) {
                    renderShop();
                    renderTower();
                    renderInventory();
                    updateHUD();
                }
            }, true);
            grid.appendChild(card);
        } else {
            var card = renderItemCard(item, function() {
                var result = buyItem(idx);
                if (result === 'fused') {
                    showFusionNotification(state._lastFusion);
                    renderShop();
                    renderTower();
                    updateHUD();
                } else if (result) {
                    renderShop();
                    renderTower();
                    updateHUD();
                }
            });
            grid.appendChild(card);
        }
    });
    $('btn-refresh').textContent = state.freeRefresh ? 'Refresh (Free)' : 'Refresh (3g)';
}

function showFusionNotification(towerIndex) {
    var container = $('damage-numbers');
    var towerGrid = $('tower-slots');
    var cards = towerGrid ? towerGrid.querySelectorAll('.item-card') : [];
    var targetEl = cards[towerIndex] || towerGrid;
    var rect = targetEl.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'fusion-notification';
    el.textContent = 'FUSED! ★';
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = (rect.top) + 'px';
    container.appendChild(el);
    setTimeout(function() { el.remove(); }, 2000);
}

// === POTION CARD RENDERING ===
function renderPotionCard(potion, clickHandler, showCost) {
    var card = document.createElement('div');
    card.className = 'item-card potion-card';
    card.style.borderColor = potion.color || '#aa44ff';
    var costHtml = showCost ? '<span class="item-cost">' + potion.cost + 'g</span>' : '';
    card.innerHTML =
        costHtml +
        '<div class="card-icon-area potion-icon-area" style="background:linear-gradient(180deg, ' + (potion.color || '#aa44ff') + '22, transparent)">' +
            '<span class="potion-emoji">🧪</span>' +
        '</div>' +
        '<div class="card-body">' +
            '<div class="item-name" style="color:' + (potion.color || '#aa44ff') + '">' + potion.name + '</div>' +
            '<div class="item-pack-badge" style="color:' + (potion.color || '#aa44ff') + ';border-color:' + (potion.color || '#aa44ff') + '40">Potion</div>' +
            '<div class="item-ability">' + potion.desc + '</div>' +
        '</div>';
    if (clickHandler) card.addEventListener('click', clickHandler);
    return card;
}

// === INVENTORY RENDERING (Drag & Drop) ===
function renderInventory() {
    var grid = $('inventory-slots');
    if (!grid) return;
    grid.innerHTML = '';
    if (state.inventory.length === 0) {
        grid.innerHTML = '<div class="inventory-empty">No potions. Buy them from the shop!</div>';
        return;
    }
    state.inventory.forEach(function(potion, idx) {
        var card = document.createElement('div');
        card.className = 'potion-card potion-inventory-card';
        card.draggable = true;
        card.setAttribute('data-potion-index', idx);
        card.style.borderColor = potion.color || '#aa44ff';
        card.innerHTML =
            '<div class="potion-card-icon" style="background:' + (potion.color || '#aa44ff') + '22">' +
                '<span class="potion-emoji">🧪</span>' +
            '</div>' +
            '<div class="potion-card-body">' +
                '<div class="potion-card-name" style="color:' + (potion.color || '#aa44ff') + '">' + potion.name + '</div>' +
                '<div class="potion-card-desc">' + potion.desc + '</div>' +
            '</div>';

        // Drag start
        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', idx.toString());
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
            document.body.classList.add('potion-dragging');
            // Highlight tower items as drop targets
            highlightDropTargets(potion);
        });
        card.addEventListener('dragend', function(e) {
            card.classList.remove('dragging');
            document.body.classList.remove('potion-dragging');
            clearDropTargets();
        });
        grid.appendChild(card);
    });
}

function highlightDropTargets(potion) {
    // Mark tower items as drop targets
    var towerCards = document.querySelectorAll('#tower-slots .item-card');
    towerCards.forEach(function(cardEl) {
        cardEl.classList.add('tower-item-drop-target');
    });
    // If it's a health vial, highlight the HP area too
    if (potion.effectType === 'maxhp') {
        var hpTarget = $('hp-drop-target');
        if (hpTarget) hpTarget.classList.add('tower-item-drop-target');
    }
}

function clearDropTargets() {
    var targets = document.querySelectorAll('.tower-item-drop-target');
    targets.forEach(function(el) { el.classList.remove('tower-item-drop-target'); });
}

function setupTowerDropTargets() {
    var grid = $('tower-slots');
    if (!grid) return;
    // Tower item drop
    grid.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    grid.addEventListener('drop', function(e) {
        e.preventDefault();
        var potionIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (isNaN(potionIndex)) return;
        // Find which tower item was dropped on
        var target = e.target.closest('.item-card');
        if (!target) return;
        var towerCards = Array.from(grid.querySelectorAll('.item-card'));
        var towerIndex = towerCards.indexOf(target);
        if (towerIndex < 0) return;
        if (applyPotion(potionIndex, towerIndex)) {
            showPotionAppliedEffect(target);
            renderTower();
            renderInventory();
            renderShop();
            updateHUD();
        }
    });

    // HP drop target for Health Vials
    var hpTarget = $('hp-drop-target');
    if (hpTarget) {
        hpTarget.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        hpTarget.addEventListener('drop', function(e) {
            e.preventDefault();
            var potionIndex = parseInt(e.dataTransfer.getData('text/plain'));
            if (isNaN(potionIndex)) return;
            var potion = state.inventory[potionIndex];
            if (potion && potion.effectType === 'maxhp') {
                if (applyPotion(potionIndex, -1)) {
                    showPotionAppliedEffect(hpTarget);
                    renderInventory();
                    updateHUD();
                }
            }
        });
    }
}

function showPotionAppliedEffect(el) {
    el.classList.add('potion-applied');
    setTimeout(function() { el.classList.remove('potion-applied'); }, 600);
}


// === TOWER RENDERING ===
function renderTower() {
    var grid = $('tower-slots');
    grid.innerHTML = '';
    for (var i = 0; i < state.towerMaxSlots; i++) {
        if (i < state.tower.length) {
            var item = state.tower[i];
            (function(idx, itm) {
                var card = renderItemCard(itm, function() {
                    if (confirm('Sell ' + itm.name + ' for ' + Math.floor(itm.cost * 0.5) + 'g?')) {
                        sellItem(idx);
                        renderTower();
                        renderShop();
                        renderInventory();
                        updateHUD();
                    }
                }, false);
                // Enable drop target on each tower card
                card.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    card.classList.add('tower-item-drop-target');
                });
                card.addEventListener('dragleave', function(e) {
                    card.classList.remove('tower-item-drop-target');
                });
                card.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    card.classList.remove('tower-item-drop-target');
                    var potionIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    if (isNaN(potionIndex)) return;
                    if (applyPotion(potionIndex, idx)) {
                        showPotionAppliedEffect(card);
                        renderTower();
                        renderInventory();
                        renderShop();
                        updateHUD();
                    }
                });
                grid.appendChild(card);
            })(i, item);
        } else {
            var slot = document.createElement('div');
            slot.className = 'tower-slot';
            slot.textContent = 'Slot ' + (i + 1);
            grid.appendChild(slot);
        }
    }
}

// === ENCOUNTER RENDERING ===
function renderEncounter(encounterData, npcIdx) {
    if (npcIdx === undefined) npcIdx = 0;
    if (!encounterData || npcIdx >= encounterData.npcs.length) {
        startCombat();
        return;
    }
    showPhase('encounter');
    var npc = encounterData.npcs[npcIdx];
    $('encounter-portrait').textContent = npc.icon;
    $('encounter-name').textContent = npc.name;
    $('encounter-flavor').textContent = npc.flavor;
    var choicesDiv = $('encounter-choices');
    choicesDiv.innerHTML = '';
    npc.choices.forEach(function(choice) {
        var btn = document.createElement('div');
        btn.className = 'encounter-choice';
        btn.innerHTML = '<h4>' + choice.label + '</h4><p>' + choice.desc + '</p>';
        btn.addEventListener('click', function() {
            applyEncounterEffect(choice.effect);
            updateHUD();
            renderTower();
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
var combatInterval = null;
var lastPlayerHP = 0;
var lastEnemyHP = 0;
var currentCombatTick = null;
var currentCombatObj = null;
var currentTICK = 0;

function startCombat() {
    showPhase('combat');
    var enemyTower = generateOpponent();
    var playerTower = state.tower.map(function(i) { return Object.assign({}, i); });

    var result = simulateCombat(
        playerTower, enemyTower,
        function(c, pt, et) { updateCombatUI(c, pt, et, playerTower, enemyTower); },
        function(c) { endCombat(c); }
    );

    var combat = result.combat;
    var tick = result.tick;
    var TICK = result.TICK;
    var playerTimers = result.playerTimers;
    var enemyTimers = result.enemyTimers;

    currentCombatTick = tick;
    currentCombatObj = combat;
    currentTICK = TICK;

    lastPlayerHP = combat.playerHP;
    lastEnemyHP = combat.enemyHP;

    renderCombatTowers(playerTower, enemyTower, playerTimers, enemyTimers);
    updateCombatUI(combat, playerTimers, enemyTimers, playerTower, enemyTower);
    $('combat-log').innerHTML = '';

    // Set active speed button
    updateSpeedButtons();

    combatInterval = setInterval(function() {
        tick();
        if (combat.done && combatInterval) {
            clearInterval(combatInterval);
            combatInterval = null;
        }
    }, (TICK * 1000) / combatSpeed);

    $('btn-skip-combat').onclick = function() {
        if (combatInterval) {
            clearInterval(combatInterval);
            combatInterval = null;
        }
        while (!combat.done) tick();
    };
}

function setCombatSpeed(speed) {
    combatSpeed = speed;
    updateSpeedButtons();
    // Restart interval with new speed if combat is running
    if (combatInterval && currentCombatTick && currentCombatObj && !currentCombatObj.done) {
        clearInterval(combatInterval);
        combatInterval = setInterval(function() {
            currentCombatTick();
            if (currentCombatObj.done && combatInterval) {
                clearInterval(combatInterval);
                combatInterval = null;
            }
        }, (currentTICK * 1000) / combatSpeed);
    }
}

function updateSpeedButtons() {
    var btns = document.querySelectorAll('.speed-btn');
    btns.forEach(function(btn) { btn.classList.remove('speed-active'); });
    var activeBtn = $('btn-speed-' + combatSpeed);
    if (activeBtn) activeBtn.classList.add('speed-active');
}


function renderCombatTowers(playerTower, enemyTower, playerTimers, enemyTimers) {
    var pDiv = $('player-tower-display');
    var eDiv = $('enemy-tower-display');
    pDiv.innerHTML = '';
    eDiv.innerHTML = '';

    playerTower.forEach(function(item, i) {
        var el = document.createElement('div');
        el.className = 'combat-item';
        el.id = 'p-item-' + i;
        var tagIcon = getTagIcon(item);
        var iconColor = RARITY_COLORS[item.rarity] || '#aaa';
        el.innerHTML =
            '<div class="combat-item-header">' +
                '<span class="combat-item-icon">' + createSVGUse(tagIcon, 16, 16, iconColor) + '</span>' +
                '<span class="combat-item-name">' + item.name + '</span>' +
                '<span class="combat-item-dmg">' + item.damage + '</span>' +
            '</div>' +
            '<div class="cd-bar-bg"><div class="cd-bar" style="width:0%"></div></div>';
        pDiv.appendChild(el);
    });

    enemyTower.forEach(function(item, i) {
        var el = document.createElement('div');
        el.className = 'combat-item';
        el.id = 'e-item-' + i;
        var tagIcon = getTagIcon(item);
        var iconColor = RARITY_COLORS[item.rarity] || '#aaa';
        el.innerHTML =
            '<div class="combat-item-header">' +
                '<span class="combat-item-icon">' + createSVGUse(tagIcon, 16, 16, iconColor) + '</span>' +
                '<span class="combat-item-name">' + item.name + '</span>' +
                '<span class="combat-item-dmg">' + item.damage + '</span>' +
            '</div>' +
            '<div class="cd-bar-bg"><div class="cd-bar" style="width:0%"></div></div>';
        eDiv.appendChild(el);
    });
}


function updateCombatUI(combat, playerTimers, enemyTimers, playerTower, enemyTower) {
    // HP Bars
    var pPct = Math.max(0, (combat.playerHP / combat.playerMaxHP) * 100);
    var ePct = Math.max(0, (combat.enemyHP / combat.enemyMaxHP) * 100);
    $('player-hp-bar').style.width = pPct + '%';
    $('enemy-hp-bar').style.width = ePct + '%';
    var pShield = combat.playerShield > 0 ? ' [+' + combat.playerShield + ' Shield]' : '';
    var eShield = combat.enemyShield > 0 ? ' [+' + combat.enemyShield + ' Shield]' : '';
    $('player-hp-text').textContent = Math.max(0, Math.floor(combat.playerHP)) + ' / ' + combat.playerMaxHP + pShield;
    $('enemy-hp-text').textContent = Math.max(0, Math.floor(combat.enemyHP)) + ' / ' + combat.enemyMaxHP + eShield;

    // Floating damage numbers on HP change
    var playerDmgTaken = lastPlayerHP - combat.playerHP;
    var enemyDmgTaken = lastEnemyHP - combat.enemyHP;

    if (enemyDmgTaken > 5) {
        var enemyBar = $('enemy-hp-bar').parentElement;
        showDamageFloat(enemyBar, '-' + Math.floor(enemyDmgTaken), 'dmg-enemy');
        if (enemyDmgTaken > 50) screenShake();
    }
    if (playerDmgTaken > 5) {
        var playerBar = $('player-hp-bar').parentElement;
        showDamageFloat(playerBar, '-' + Math.floor(playerDmgTaken), 'dmg-player');
        if (playerDmgTaken > 50) screenShake();
    }
    if (playerDmgTaken < -5) {
        var playerBar2 = $('player-hp-bar').parentElement;
        showDamageFloat(playerBar2, '+' + Math.floor(-playerDmgTaken), 'heal-player');
    }

    lastPlayerHP = combat.playerHP;
    lastEnemyHP = combat.enemyHP;

    // Cooldown bars & firing highlights
    playerTimers.forEach(function(t, i) {
        var el = document.getElementById('p-item-' + i);
        if (!el) return;
        var bar = el.querySelector('.cd-bar');
        if (bar && t.item.cooldown > 0) {
            var pct = (t.elapsed / t.cd * 100);
            bar.style.width = pct + '%';
            if (pct >= 95) bar.classList.add('cd-ready');
            else bar.classList.remove('cd-ready');
        }
        if (t.triggered) {
            el.classList.add('firing');
            setTimeout(function() { el.classList.remove('firing'); }, 250);
        }
    });
    enemyTimers.forEach(function(t, i) {
        var el = document.getElementById('e-item-' + i);
        if (!el) return;
        var bar = el.querySelector('.cd-bar');
        if (bar && t.item.cooldown > 0) {
            var pct = (t.elapsed / t.cd * 100);
            bar.style.width = pct + '%';
            if (pct >= 95) bar.classList.add('cd-ready');
            else bar.classList.remove('cd-ready');
        }
        if (t.triggered) {
            el.classList.add('firing');
            setTimeout(function() { el.classList.remove('firing'); }, 250);
        }
    });

    // Combat Log
    var logDiv = $('combat-log');
    var entries = combat.log.slice(-30);
    logDiv.innerHTML = entries.map(function(entry) {
        var cls = '';
        if (entry.includes('dmg') || entry.includes('damage')) cls = 'log-damage';
        if (entry.includes('heal') || entry.includes('Shield')) cls = 'log-heal';
        if (entry.includes('multicast') || entry.includes('synergy')) cls = 'log-effect';
        return '<div class="log-entry ' + cls + '">' + entry + '</div>';
    }).join('');
    logDiv.scrollTop = logDiv.scrollHeight;
}


function endCombat(combat) {
    showPhase('result');
    var won = combat.winner === 'player';
    var xpGained = 0;
    if (won) {
        state.wins++;
        if (state.endless) state.endlessDay++;
        xpGained = 8;
        addXP(8);
        $('result-title').textContent = '⚔️ VICTORY!';
        $('result-title').style.color = '#44ee77';
        if (state.endless) {
            $('result-detail').textContent = 'Your tower overwhelmed the enemy! Days survived: ' + state.endlessDay;
        } else {
            $('result-detail').textContent = 'Your tower overwhelmed the enemy! Wins: ' + state.wins + '/10';
        }
    } else {
        xpGained = 3;
        addXP(3);
        if (state.endless) state.endlessDay++;
        var heartsLost = getHeartsLost();
        state.hearts = Math.max(0, state.hearts - heartsLost);
        $('result-title').textContent = '💀 DEFEAT';
        $('result-title').style.color = '#ff4444';
        $('result-detail').textContent = 'You lost ' + heartsLost + ' heart(s). Hearts remaining: ' + state.hearts;
    }
    // Show XP gain
    var xpDisplay = $('xp-gain-display');
    xpDisplay.textContent = '+' + xpGained + ' XP!';
    xpDisplay.classList.remove('hidden');
    setTimeout(function() { xpDisplay.classList.add('hidden'); }, 3000);

    // Show potion generation notifications
    if (state.potionGenerationQueue.length > 0) {
        var potionMsg = 'Potions generated: ' + state.potionGenerationQueue.join(', ');
        $('result-detail').textContent += '\n' + potionMsg;
        showPotionGeneratedNotification(state.potionGenerationQueue);
        state.potionGenerationQueue = [];
    }
    updateHUD();

    // Check for endless mode choice (10 wins, not in endless yet)
    var endlessChoice = $('endless-choice');
    var nextDayBtn = $('btn-next-day');
    if (!state.endless && state.wins >= 10) {
        endlessChoice.classList.remove('hidden');
        nextDayBtn.style.display = 'none';
    } else {
        endlessChoice.classList.add('hidden');
        nextDayBtn.style.display = '';
    }

    if (state.endless && state.hearts <= 0) {
        setTimeout(function() { showGameOver(false); }, 500);
    } else if (!state.endless && state.hearts <= 0) {
        setTimeout(function() { showGameOver(false); }, 500);
    }
}

function showPotionGeneratedNotification(potions) {
    var container = $('damage-numbers');
    potions.forEach(function(name, i) {
        setTimeout(function() {
            var el = document.createElement('div');
            el.className = 'potion-generated';
            el.textContent = '+' + name + '!';
            el.style.left = (40 + Math.random() * 20) + '%';
            el.style.top = (30 + i * 8) + '%';
            container.appendChild(el);
            setTimeout(function() { el.remove(); }, 2000);
        }, i * 300);
    });
}

function showGameOver(won) {
    showScreen('gameover');
    if (won) {
        $('gameover-title').textContent = '🏆 DOOMSDAY SURVIVED!';
        $('gameover-title').style.color = '#ffd700';
        $('gameover-detail').textContent = 'You conquered the Doomsday Tower!';
    } else {
        if (state.endless) {
            $('gameover-title').textContent = '💀 ENDLESS RUN OVER';
            $('gameover-title').style.color = '#ff4444';
            $('gameover-detail').textContent = 'The Doomsday finally claimed your tower...';
        } else {
            $('gameover-title').textContent = '💀 TOWER FALLEN';
            $('gameover-title').style.color = '#ff4444';
            $('gameover-detail').textContent = 'The Doomsday claimed your tower...';
        }
    }
    var statsHtml = '<p>Days survived: ' + state.day + '</p>';
    if (state.endless) {
        statsHtml += '<p>Endless days survived: ' + state.endlessDay + '</p>';
    }
    statsHtml += '<p>Wins: ' + state.wins + '</p>' +
        '<p>Level reached: ' + state.level + '</p>' +
        '<p>Items in tower: ' + state.tower.length + '</p>';
    $('gameover-stats').innerHTML = statsHtml;
}


// === NEXT DAY ===
function nextDay() {
    startNewDay();
    updateHUD();
    var encounter = getEncounterForDay(state.day);
    if (encounter) {
        renderShop();
        renderTower();
        renderInventory();
        showPhase('shop');
        state._pendingEncounter = encounter;
    } else {
        state._pendingEncounter = null;
        renderShop();
        renderTower();
        renderInventory();
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
        var enc = state._pendingEncounter;
        state._pendingEncounter = null;
        renderEncounter(enc, 0);
    } else {
        startCombat();
    }
}

// === PERK SCREEN ===
function renderPerks() {
    var grid = $('perk-list');
    grid.innerHTML = '';
    PERKS.forEach(function(perk) {
        var card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML = '<h4>' + perk.name + '</h4><p>' + perk.desc + '</p>';
        card.addEventListener('click', function() {
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                state.selectedPerks = state.selectedPerks.filter(function(p) { return p !== perk.id; });
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
    // Load SVG icons
    loadSVGIcons();

    // Init background particles
    initParticles();

    // Title screen buttons
    $('btn-casual').addEventListener('click', function() {
        state.mode = 'casual';
        resetState();
        renderPerks();
        showScreen('perks');
    });
    $('btn-ranked').addEventListener('click', function() {
        state.mode = 'ranked';
        resetState();
        renderPerks();
        showScreen('perks');
    });

    // Perk screen
    $('btn-start-run').addEventListener('click', function() {
        if (state.selectedPerks.includes('doomsday_veteran')) {
            state.gold += 10;
        }
        showScreen('game');
        generateShop();
        renderShop();
        renderTower();
        renderInventory();
        setupTowerDropTargets();
        updateHUD();
        showPhase('shop');
    });

    // Shop buttons
    $('btn-refresh').addEventListener('click', function() {
        if (refreshShop()) {
            renderShop();
            updateHUD();
        }
    });
    $('btn-freeze').addEventListener('click', function() {
        freezeShop();
        renderShop();
    });
    $('btn-levelup').addEventListener('click', function() {
        if (levelUp()) {
            renderShop();
            renderTower();
            updateHUD();
        }
    });
    $('btn-ready').addEventListener('click', onReady);

    // Result next day
    $('btn-next-day').addEventListener('click', nextDay);

    // Endless mode choice buttons
    $('btn-end-run').addEventListener('click', function() {
        showGameOver(true);
    });
    $('btn-endless-mode').addEventListener('click', function() {
        enterEndlessMode();
        $('endless-choice').classList.add('hidden');
        $('btn-next-day').style.display = '';
        updateHUD();
        nextDay();
    });

    // Combat speed controls
    $('btn-speed-1').addEventListener('click', function() { setCombatSpeed(1); });
    $('btn-speed-2').addEventListener('click', function() { setCombatSpeed(2); });
    $('btn-speed-3').addEventListener('click', function() { setCombatSpeed(3); });

    // Restart
    $('btn-restart').addEventListener('click', function() {
        resetState();
        showScreen('title');
    });
}

// Start the game
init();
