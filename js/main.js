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
    // XP bar (cumulative semantics, level cap = MAX_LEVEL = 100)
    var xpB = getXPLevelBounds();
    var xpPct = xpB.perLevel > 0 ? Math.min(100, (xpB.inLevel / xpB.perLevel) * 100) : 100;
    $('hud-xp-bar').style.width = xpPct + '%';
    if (state.level >= MAX_LEVEL) {
        $('hud-xp-text').textContent = 'MAX LEVEL';
    } else {
        $('hud-xp-text').textContent = 'XP: ' + xpB.inLevel + '/' + xpB.perLevel;
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

// === INVENTORY RENDERING (Drag & Drop + Click-to-Apply) ===
function renderInventory() {
    var grid = $('inventory-slots');
    if (!grid) return;
    grid.innerHTML = '';

    // Validate selection still points at a real potion
    if (state._selectedPotionIdx != null) {
        var sel = state.inventory[state._selectedPotionIdx];
        if (!sel || (state._selectedPotionId && sel.id !== state._selectedPotionId)) {
            // Try to recover by id, otherwise clear selection
            var fallbackIdx = -1;
            if (state._selectedPotionId) {
                for (var fi = 0; fi < state.inventory.length; fi++) {
                    if (state.inventory[fi].id === state._selectedPotionId) {
                        fallbackIdx = fi;
                        break;
                    }
                }
            }
            if (fallbackIdx >= 0) state._selectedPotionIdx = fallbackIdx;
            else clearPotionSelection();
        }
    }

    if (state.inventory.length === 0) {
        grid.innerHTML = '<div class="inventory-empty">No potions. Buy them from the shop!</div>';
        clearPotionSelection();
        renderPotionSelectionStatus();
        return;
    }

    state.inventory.forEach(function(potion, idx) {
        var card = document.createElement('div');
        card.className = 'potion-card potion-inventory-card';
        card.draggable = true;
        card.setAttribute('data-potion-index', idx);
        card.style.borderColor = potion.color || '#aa44ff';

        // Highlight every potion of the currently-selected type
        if (state._selectedPotionId && potion.id === state._selectedPotionId) {
            card.classList.add('potion-selected');
        }

        card.innerHTML =
            '<div class="potion-card-icon" style="background:' + (potion.color || '#aa44ff') + '22">' +
                '<span class="potion-emoji">🧪</span>' +
            '</div>' +
            '<div class="potion-card-body">' +
                '<div class="potion-card-name" style="color:' + (potion.color || '#aa44ff') + '">' + potion.name + '</div>' +
                '<div class="potion-card-desc">' + potion.desc + '</div>' +
            '</div>';

        // Click to toggle selection (does NOT prevent drag)
        card.addEventListener('click', function(e) {
            // If user is mid-drag this won't fire; click only fires after a click without drag
            if (state._selectedPotionIdx === idx) {
                clearPotionSelection();
            } else {
                selectPotion(idx);
            }
            renderInventory();
            renderTower();
            renderPotionSelectionStatus();
            updateClickableHighlights();
        });

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

    renderPotionSelectionStatus();
    updateClickableHighlights();
}

// === POTION SELECTION (click-to-apply mode) ===
function selectPotion(idx) {
    var potion = state.inventory[idx];
    if (!potion) {
        clearPotionSelection();
        return;
    }
    state._selectedPotionIdx = idx;
    state._selectedPotionId = potion.id;
}

function clearPotionSelection() {
    state._selectedPotionIdx = null;
    state._selectedPotionId = null;
}

function renderPotionSelectionStatus() {
    var bar = $('potion-selection-status');
    if (!bar) return;
    if (state._selectedPotionIdx == null) {
        bar.classList.add('hidden');
        bar.textContent = '';
        return;
    }
    var potion = state.inventory[state._selectedPotionIdx];
    if (!potion) {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');
    var target = (potion.effectType === 'maxhp')
        ? 'the HP zone'
        : 'a tower item';
    bar.textContent = 'Click ' + target + ' to apply ' + potion.name +
        '. Press ESC or right-click to cancel.';
}

// Mark tower items / HP drop zone as clickable when a potion is selected.
function updateClickableHighlights() {
    var towerCards = document.querySelectorAll('#tower-slots .item-card');
    towerCards.forEach(function(el) { el.classList.remove('tower-item-clickable'); });
    var hpZone = $('hp-drop-target');
    if (hpZone) {
        hpZone.classList.remove('tower-item-clickable');
        // Always reset inline display so the .hp-drop-zone CSS rule (display:none)
        // hides it again when no Health Vial is selected.
        hpZone.style.removeProperty('display');
    }

    if (state._selectedPotionIdx == null) return;
    var potion = state.inventory[state._selectedPotionIdx];
    if (!potion) return;

    if (potion.effectType === 'maxhp') {
        if (hpZone) {
            hpZone.classList.add('tower-item-clickable');
            // Force the HP zone visible so the user can click it.
            hpZone.style.display = 'block';
        }
    } else {
        towerCards.forEach(function(el) { el.classList.add('tower-item-clickable'); });
    }
}

// Apply the currently-selected potion to a target. After applying, attempt to
// re-select another potion of the same id so the user can rapidly click items.
function applySelectedPotion(towerIndex) {
    if (state._selectedPotionIdx == null) return false;
    var potion = state.inventory[state._selectedPotionIdx];
    if (!potion) {
        clearPotionSelection();
        return false;
    }
    var sameId = potion.id;
    var ok = applyPotion(state._selectedPotionIdx, towerIndex);
    if (!ok) return false;

    // Find another potion of the same type and select it; otherwise clear.
    var nextIdx = -1;
    for (var i = 0; i < state.inventory.length; i++) {
        if (state.inventory[i].id === sameId) {
            nextIdx = i;
            break;
        }
    }
    if (nextIdx >= 0) {
        state._selectedPotionIdx = nextIdx;
        state._selectedPotionId = sameId;
    } else {
        clearPotionSelection();
        // Hide HP zone if we were showing it for a Health Vial selection
        var hpZone = $('hp-drop-target');
        if (hpZone) hpZone.style.removeProperty('display');
    }
    return true;
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
        // Click-to-apply: only fires when a Health Vial is selected.
        hpTarget.addEventListener('click', function(e) {
            if (state._selectedPotionIdx == null) return;
            var sel = state.inventory[state._selectedPotionIdx];
            if (!sel || sel.effectType !== 'maxhp') return;
            if (applySelectedPotion(-1)) {
                showPotionAppliedEffect(hpTarget);
                renderInventory();
                renderTower();
                updateHUD();
                renderPotionSelectionStatus();
                updateClickableHighlights();
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
                // The item-card click handler dispatches based on whether a
                // potion is currently selected: apply potion, otherwise sell.
                var card = renderItemCard(itm, function() {
                    if (state._selectedPotionIdx != null) {
                        var sel = state.inventory[state._selectedPotionIdx];
                        // Health Vials don't apply to tower items; ignore the click.
                        if (sel && sel.effectType === 'maxhp') return;
                        if (applySelectedPotion(idx)) {
                            showPotionAppliedEffect(card);
                            renderTower();
                            renderInventory();
                            renderShop();
                            updateHUD();
                            renderPotionSelectionStatus();
                            updateClickableHighlights();
                        }
                        return;
                    }
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
    // Re-mark the new tower cards as clickable if a potion is selected
    updateClickableHighlights();
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
    // Clear any active potion selection before entering combat (transient state)
    clearPotionSelection();
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

    // === Damage-dealt percentage (used for XP bonus and gold reward) ===
    var maxHp = combat.enemyMaxHP > 0 ? combat.enemyMaxHP : 1;
    var hpRemaining = Math.max(0, combat.enemyHP);
    var damageDealtPercent = Math.max(0, Math.min(1, (maxHp - hpRemaining) / maxHp));
    var damageDealtPctDisplay = Math.round(damageDealtPercent * 100);

    // === XP gain ===
    // Win: 12 base + up to 8 bonus from damage. Loss: 5 base + up to 8 bonus.
    var bonusXP = Math.floor(damageDealtPercent * 8);
    var xpGained = 0;
    var goldReward = 0;

    if (won) {
        state.wins++;
        if (state.endless) state.endlessDay++;
        xpGained = 12 + bonusXP;
        goldReward = 15 + Math.floor(damageDealtPercent * 35); // 15-50
        addXP(xpGained);
        state.gold += goldReward;
        $('result-title').textContent = '⚔️ VICTORY!';
        $('result-title').style.color = '#44ee77';
        var summary;
        if (state.endless) {
            summary = 'Your tower overwhelmed the enemy! Days survived: ' + state.endlessDay;
        } else {
            summary = 'Your tower overwhelmed the enemy! Wins: ' + state.wins + '/10';
        }
        summary += '\nDamage dealt: ' + damageDealtPctDisplay + '%';
        summary += '\nReward: +' + goldReward + ' gold, +' + xpGained + ' XP';
        $('result-detail').textContent = summary;
    } else {
        xpGained = 5 + bonusXP;
        goldReward = Math.floor(damageDealtPercent * 20); // 0-20
        addXP(xpGained);
        state.gold += goldReward;
        if (state.endless) state.endlessDay++;
        var heartsLost = getHeartsLost();
        state.hearts = Math.max(0, state.hearts - heartsLost);
        $('result-title').textContent = '💀 DEFEAT';
        $('result-title').style.color = '#ff4444';
        var lossSummary = 'You lost ' + heartsLost + ' heart(s). Hearts remaining: ' + state.hearts;
        lossSummary += '\nDamage dealt: ' + damageDealtPctDisplay + '%';
        lossSummary += '\nReward: +' + goldReward + ' gold, +' + xpGained + ' XP';
        $('result-detail').textContent = lossSummary;
    }

    // === Floating displays: +XP and +Gold side by side ===
    var xpDisplay = $('xp-gain-display');
    xpDisplay.textContent = '+' + xpGained + ' XP!';
    xpDisplay.classList.remove('hidden');

    var goldDisplay = $('gold-gain-display');
    if (goldDisplay) {
        if (goldReward > 0) {
            goldDisplay.textContent = '+' + goldReward + ' Gold!';
            goldDisplay.classList.remove('hidden');
        } else {
            goldDisplay.classList.add('hidden');
        }
    }
    setTimeout(function() {
        xpDisplay.classList.add('hidden');
        if (goldDisplay) goldDisplay.classList.add('hidden');
    }, 3000);

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
    clearPotionSelection();
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
    // Auto-save at the start of each day
    try { autoSaveGame(); } catch (e) { /* ignore quota errors */ }
}


// === IN-GAME MENU ===
var _menuPausedCombat = false;

function openMenu() {
    // Pause active combat while the menu is up
    if (combatInterval) {
        clearInterval(combatInterval);
        combatInterval = null;
        _menuPausedCombat = true;
    }
    $('game-menu').classList.remove('hidden');
}

function closeMenu() {
    $('game-menu').classList.add('hidden');
    if (_menuPausedCombat && currentCombatObj && !currentCombatObj.done) {
        combatInterval = setInterval(function() {
            currentCombatTick();
            if (currentCombatObj.done && combatInterval) {
                clearInterval(combatInterval);
                combatInterval = null;
            }
        }, (currentTICK * 1000) / combatSpeed);
    }
    _menuPausedCombat = false;
}


// === SAVE / LOAD UI ===
var _slotsMode = 'save'; // 'save' | 'load'
var _slotsLoadFromTitle = false;

function openSlotsModal(mode, fromTitle) {
    _slotsMode = (mode === 'load') ? 'load' : 'save';
    _slotsLoadFromTitle = !!fromTitle;
    $('slots-title').textContent = (_slotsMode === 'save') ? 'Save Game' : 'Load Game';
    var sub = $('slots-subtitle');
    if (_slotsMode === 'save') {
        sub.textContent = 'Choose a slot to save your current run.';
    } else {
        sub.textContent = 'Pick a save to continue your journey.';
    }
    renderSlots();
    $('slots-modal').classList.remove('hidden');
    // Hide the menu while the slots picker is open
    $('game-menu').classList.add('hidden');
}

function closeSlotsModal() {
    $('slots-modal').classList.add('hidden');
    if (_slotsLoadFromTitle) {
        _slotsLoadFromTitle = false;
        // Returning to title without loading: leave the title screen as it was.
        return;
    }
    // Otherwise, return to the in-game menu (only if we're on the game screen and a run is active)
    if (screens.game.classList.contains('active')) {
        $('game-menu').classList.remove('hidden');
    }
}

function renderSlots() {
    var list = $('slots-list');
    list.innerHTML = '';
    var saves = getAllSaves();

    // Build the list of slots to display
    var slotKeys = SAVE_SLOT_KEYS.slice();
    // In load mode, show the autosave at the top if it exists
    var showAutosaveAtTop = (_slotsMode === 'load') && !!saves[AUTOSAVE_KEY];
    if (showAutosaveAtTop) {
        slotKeys.unshift(AUTOSAVE_KEY);
    }

    slotKeys.forEach(function(slotKey) {
        var save = saves[slotKey];
        list.appendChild(renderSlotCard(slotKey, save));
    });
}

function renderSlotCard(slotKey, save) {
    var card = document.createElement('div');
    card.className = 'slot-card';
    var hasData = !!(save && save.state);
    var isAutosave = slotKey === AUTOSAVE_KEY;
    if (!hasData) card.classList.add('empty');
    if (isAutosave) card.classList.add('autosave');

    // --- Name area ---
    var nameWrap = document.createElement('div');
    nameWrap.style.gridColumn = '1';
    nameWrap.style.gridRow = '1';

    var defaultName = (save && save.name) || _defaultSlotName(slotKey);

    if (_slotsMode === 'save' && !isAutosave) {
        // Editable name input
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'slot-name-input';
        input.value = defaultName;
        input.maxLength = 40;
        input.setAttribute('data-slot-key', slotKey);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSaveSlot(slotKey, input.value);
            }
        });
        nameWrap.appendChild(input);
    } else {
        // Read-only label (load mode, or autosave)
        var label = document.createElement('div');
        label.className = 'slot-name-label';
        label.textContent = defaultName;
        nameWrap.appendChild(label);
    }
    card.appendChild(nameWrap);

    // --- Meta ---
    var meta = document.createElement('div');
    meta.className = 'slot-meta';
    if (hasData) {
        var metaText = getSaveMetadata(save);
        var ts = formatSaveTimestamp(save.timestamp);
        meta.innerHTML = '<div>' + metaText + '</div>' +
            (ts ? '<div class="slot-meta-time">Saved ' + ts + '</div>' : '');
    } else {
        meta.classList.add('empty-meta');
        meta.textContent = 'Empty Slot';
    }
    card.appendChild(meta);

    // --- Actions ---
    var actions = document.createElement('div');
    actions.className = 'slot-actions';

    if (_slotsMode === 'save') {
        if (!isAutosave) {
            var saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-small btn-slot-save';
            saveBtn.textContent = hasData ? 'Overwrite' : 'Save';
            saveBtn.addEventListener('click', function() {
                var inp = card.querySelector('.slot-name-input');
                var name = inp ? inp.value : defaultName;
                onSaveSlot(slotKey, name);
            });
            actions.appendChild(saveBtn);
        }
    } else {
        // Load mode
        var loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-small btn-slot-load';
        loadBtn.textContent = 'Load';
        if (!hasData) {
            loadBtn.disabled = true;
            loadBtn.style.visibility = 'hidden';
        } else {
            loadBtn.addEventListener('click', function() {
                onLoadSlot(slotKey);
            });
        }
        actions.appendChild(loadBtn);
    }

    if (hasData) {
        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-small btn-slot-delete';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', function() {
            onDeleteSlot(slotKey);
        });
        actions.appendChild(delBtn);
    }

    card.appendChild(actions);
    return card;
}

function onSaveSlot(slotKey, name) {
    var ok = saveGame(slotKey, name);
    if (!ok) {
        alert('Could not save game. Storage might be full.');
        return;
    }
    // Re-render to refresh metadata + timestamps
    renderSlots();
    flashSlotCard(slotKey, 'saved');
}

function onLoadSlot(slotKey) {
    var saves = getAllSaves();
    if (!saves[slotKey]) return;
    if (!confirm('Load "' + (saves[slotKey].name || slotKey) + '"? Any unsaved progress will be lost.')) return;

    // Clean up any active combat loop before swapping state
    if (combatInterval) {
        clearInterval(combatInterval);
        combatInterval = null;
    }
    _menuPausedCombat = false;
    currentCombatObj = null;
    currentCombatTick = null;

    var ok = loadGame(slotKey);
    if (!ok) {
        alert('Could not load this save.');
        return;
    }

    // Make sure SVG icons are present (in case of fresh page load -> title -> load)
    if (!svgIconsLoaded) {
        loadSVGIcons();
    }

    // Close any open modals
    $('slots-modal').classList.add('hidden');
    $('game-menu').classList.add('hidden');

    // Switch to the game screen and hydrate the UI
    showScreen('game');
    setupTowerDropTargets();
    renderShop();
    renderTower();
    renderInventory();
    updateHUD();

    // Restore phase. Combat / result phases are transient -> reset to shop.
    var savedPhase = state.phase;
    if (savedPhase === 'combat' || savedPhase === 'result' || !savedPhase) {
        savedPhase = 'shop';
    }
    if (savedPhase === 'encounter') {
        if (state._pendingEncounter) {
            renderEncounter(state._pendingEncounter, 0);
        } else {
            showPhase('shop');
        }
    } else {
        showPhase(savedPhase);
    }

    _slotsLoadFromTitle = false;
}

function onDeleteSlot(slotKey) {
    var saves = getAllSaves();
    var save = saves[slotKey];
    var displayName = (save && save.name) || _defaultSlotName(slotKey);
    if (!confirm('Delete "' + displayName + '"? This cannot be undone.')) return;
    deleteSave(slotKey);
    renderSlots();
}

function flashSlotCard(slotKey, kind) {
    var list = $('slots-list');
    if (!list) return;
    var cards = list.querySelectorAll('.slot-card');
    cards.forEach(function(c) {
        var inp = c.querySelector('.slot-name-input');
        var key = inp && inp.getAttribute('data-slot-key');
        var label = c.querySelector('.slot-name-label');
        var labelText = label && label.textContent;
        // Match either by input data-slot-key or default name fallback
        if (key === slotKey || labelText === _defaultSlotName(slotKey)) {
            c.classList.add('potion-applied');
            setTimeout(function() { c.classList.remove('potion-applied'); }, 600);
        }
    });
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
    $('btn-endless').addEventListener('click', function() {
        state.mode = 'endless';
        resetState();
        state.endless = true;
        state.hearts = 5;
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

    // === SAVE / LOAD: Title screen ===
    $('btn-title-load').addEventListener('click', function() {
        openSlotsModal('load', true);
    });

    // === SAVE / LOAD: HUD menu button ===
    $('btn-menu').addEventListener('click', openMenu);

    // === Game Menu actions ===
    $('btn-resume').addEventListener('click', closeMenu);
    $('btn-save-game').addEventListener('click', function() {
        openSlotsModal('save', false);
    });
    $('btn-load-game').addEventListener('click', function() {
        openSlotsModal('load', false);
    });
    $('btn-restart-run').addEventListener('click', function() {
        if (!confirm('Restart this run? Your current progress will be lost.')) return;
        var keepMode = state.mode || 'casual';
        // Stop any combat in progress
        if (combatInterval) { clearInterval(combatInterval); combatInterval = null; }
        _menuPausedCombat = false;
        resetState();
        state.mode = keepMode;
        if (keepMode === 'endless') {
            state.endless = true;
            state.hearts = 5;
            state.maxHearts = 5;
        }
        $('game-menu').classList.add('hidden');
        renderPerks();
        showScreen('perks');
    });
    $('btn-main-menu').addEventListener('click', function() {
        if (!confirm('Return to the main menu? Any unsaved progress will be lost.')) return;
        if (combatInterval) { clearInterval(combatInterval); combatInterval = null; }
        _menuPausedCombat = false;
        resetState();
        $('game-menu').classList.add('hidden');
        showScreen('title');
    });

    // === Slots modal back button ===
    $('btn-slots-back').addEventListener('click', closeSlotsModal);

    // Close modals when clicking the dim backdrop (but not when clicking the inner card)
    $('game-menu').addEventListener('click', function(e) {
        if (e.target === $('game-menu')) closeMenu();
    });
    $('slots-modal').addEventListener('click', function(e) {
        if (e.target === $('slots-modal')) closeSlotsModal();
    });

    // ESC key closes the topmost modal
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (!$('slots-modal').classList.contains('hidden')) {
            closeSlotsModal();
        } else if (!$('game-menu').classList.contains('hidden')) {
            closeMenu();
        } else if (state._selectedPotionIdx != null) {
            // Clear potion selection before opening the menu
            clearPotionSelection();
            renderInventory();
            renderTower();
            renderPotionSelectionStatus();
            updateClickableHighlights();
        } else if (screens.game.classList.contains('active')) {
            // Quick-open the menu while in game
            openMenu();
        }
    });

    // Right-click anywhere clears the active potion selection
    document.addEventListener('contextmenu', function(e) {
        if (state._selectedPotionIdx == null) return;
        e.preventDefault();
        clearPotionSelection();
        renderInventory();
        renderTower();
        renderPotionSelectionStatus();
        updateClickableHighlights();
    });
}

// Start the game
init();
