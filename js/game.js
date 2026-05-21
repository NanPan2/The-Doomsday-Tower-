
// === GAME STATE ===
const state = {
    mode: 'casual',
    day: 1,
    wins: 0,
    hearts: 10,
    maxHearts: 10,
    gold: 55,
    income: 45,
    level: 1,
    tower: [],
    towerMaxSlots: 6,
    shop: [],
    shopFrozen: false,
    freeRefresh: false,
    selectedPerks: [],
    permanentBonuses: { shieldStart: 0, bonusHP: 0, cooldownReduction: 0 },
    guaranteeRelic: false,
    phase: 'shop',
    inventory: [],
    potionGenerationQueue: [],
    xp: 0,
    endless: false,
    endlessDay: 0,
};

// === XP THRESHOLDS ===
var XP_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140];

// === COMBAT SPEED ===
var combatSpeed = 1;

function resetState() {
    state.day = 1;
    state.wins = 0;
    state.hearts = 10;
    state.maxHearts = 10;
    state.gold = 55;
    state.income = 45;
    state.level = 1;
    state.tower = [];
    state.shop = [];
    state.shopFrozen = false;
    state.freeRefresh = false;
    state.selectedPerks = [];
    state.permanentBonuses = { shieldStart: 0, bonusHP: 0, cooldownReduction: 0 };
    state.guaranteeRelic = false;
    state.phase = 'shop';
    state.inventory = [];
    state.potionGenerationQueue = [];
    state.xp = 0;
    state.endless = false;
    state.endlessDay = 0;
    combatSpeed = 1;
}


// === UTILITY ===
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// === SHOP GENERATION ===
function generateShop() {
    if (state.shopFrozen && state.shop.length > 0) {
        state.shopFrozen = false;
        return;
    }
    const shopSize = state.selectedPerks.includes('expanded_stock') ? 9 : 7;
    const rarityTable = LEVEL_RARITY_ACCESS[Math.min(state.level, 7)];
    const pool = [];
    // Build weighted pool
    for (const [rarity, weight] of Object.entries(rarityTable)) {
        if (weight <= 0) continue;
        const items = ITEMS.filter(i => i.rarity === rarity);
        for (let w = 0; w < weight; w++) pool.push(...items);
    }
    // Guarantee relic if flagged
    state.shop = [];
    if (state.guaranteeRelic) {
        const relics = ITEMS.filter(i => i.rarity === 'relic');
        if (relics.length) state.shop.push(createShopItem(pick(relics)));
        state.guaranteeRelic = false;
    }
    while (state.shop.length < shopSize) {
        const template = pick(pool);
        state.shop.push(createShopItem(template));
    }
    // Add 1-2 potions to the shop
    var potionCount = Math.random() < 0.5 ? 1 : 2;
    for (var p = 0; p < potionCount; p++) {
        var potionTemplate = pick(POTIONS);
        state.shop.push(createShopPotion(potionTemplate));
    }
    // Free refresh for Adventurer's Guild perk
    state.freeRefresh = state.selectedPerks.includes('adventurers_guild');
}

function createShopPotion(template) {
    return { ...template, isPotion: true, frozen: false, uid: crypto.randomUUID() };
}

function createShopItem(template) {
    return { ...template, stars: 0, frozen: false, uid: crypto.randomUUID() };
}

function refreshShop() {
    const cost = state.freeRefresh ? 0 : 3;
    if (state.gold < cost) return false;
    state.gold -= cost;
    state.freeRefresh = false;
    state.shopFrozen = false;
    state.shop = [];
    generateShop();
    return true;
}

function freezeShop() {
    state.shopFrozen = !state.shopFrozen;
    state.shop.forEach(i => i.frozen = state.shopFrozen);
}


// === BUYING & TOWER ===
function buyItem(shopIndex) {
    const item = state.shop[shopIndex];
    if (!item || state.gold < item.cost) return false;
    // Check for fusion: if tower already has item with same id and stars < 3
    var fusionTarget = null;
    for (var i = 0; i < state.tower.length; i++) {
        if (state.tower[i].id === item.id && state.tower[i].stars < 3) {
            fusionTarget = i;
            break;
        }
    }
    if (fusionTarget !== null) {
        state.gold -= item.cost;
        fuseItem(state.tower[fusionTarget]);
        state.shop.splice(shopIndex, 1);
        state._lastFusion = fusionTarget;
        return 'fused';
    }
    if (state.tower.length >= state.towerMaxSlots) return false;
    state.gold -= item.cost;
    state.tower.push({ ...item });
    state.shop.splice(shopIndex, 1);
    state._lastFusion = null;
    return true;
}

function fuseItem(existingItem) {
    existingItem.stars = Math.min(3, existingItem.stars + 1);
    existingItem.damage = Math.floor(existingItem.damage * 1.25);
    existingItem.multicast += 1;
}

function sellItem(towerIndex) {
    const item = state.tower[towerIndex];
    if (!item) return false;
    const refund = Math.floor(item.cost * 0.5);
    state.gold += refund;
    state.tower.splice(towerIndex, 1);
    return refund;
}

// === POTION BUYING & APPLYING ===
function buyPotion(shopIndex) {
    var item = state.shop[shopIndex];
    if (!item || !item.isPotion) return false;
    if (state.gold < item.cost) return false;
    state.gold -= item.cost;
    state.inventory.push({ ...item });
    state.shop.splice(shopIndex, 1);
    return true;
}

function applyPotion(potionIndex, towerIndex) {
    var potion = state.inventory[potionIndex];
    if (!potion) return false;

    // Health Vial targets the tower HP, not an item
    if (potion.effectType === 'maxhp') {
        state.permanentBonuses.bonusHP += potion.effectValue;
        state.inventory.splice(potionIndex, 1);
        return true;
    }

    var item = state.tower[towerIndex];
    if (!item) return false;

    switch (potion.effectType) {
        case 'damage':
            item.damage += potion.effectValue;
            break;
        case 'crit':
            item.crit += potion.effectValue;
            break;
        case 'heal':
            item.healOnTrigger = (item.healOnTrigger || 0) + potion.effectValue;
            break;
        case 'poison':
            item.poisonOnTrigger = (item.poisonOnTrigger || 0) + potion.effectValue;
            break;
        case 'burn':
            item.burnOnTrigger = (item.burnOnTrigger || 0) + potion.effectValue;
            break;
        case 'shield':
            item.shieldOnTrigger = (item.shieldOnTrigger || 0) + potion.effectValue;
            break;
        case 'cooldown':
            item.cooldown = Math.max(0.3, item.cooldown - potion.effectValue);
            break;
        case 'multicast':
            item.multicast += potion.effectValue;
            break;
        case 'healboost':
            item.healOnTrigger = (item.healOnTrigger || 0) + potion.effectValue;
            break;
        case 'morph':
            var sameRarity = ITEMS.filter(function(i) { return i.rarity === item.rarity && i.id !== item.id; });
            if (sameRarity.length > 0) {
                var newItem = pick(sameRarity);
                var morphed = createShopItem(newItem);
                morphed.stars = item.stars;
                state.tower[towerIndex] = morphed;
            }
            break;
        case 'upgrade':
            item.stars = Math.min(3, item.stars + 1);
            item.damage = Math.floor(item.damage * 1.25);
            item.multicast += 1;
            break;
    }

    state.inventory.splice(potionIndex, 1);
    return true;
}

function addPotionToInventory(potionId) {
    var template = POTIONS.find(function(p) { return p.id === potionId; });
    if (template) {
        state.inventory.push({ ...template, isPotion: true, uid: crypto.randomUUID() });
    }
}

function addRandomVialToInventory() {
    var vials = POTIONS.filter(function(p) { return p.id !== 'phantom_brew' && p.id !== 'crownforge_brew'; });
    var template = pick(vials);
    state.inventory.push({ ...template, isPotion: true, uid: crypto.randomUUID() });
}

function addXP(amount) {
    if (state.level >= 7) return;
    state.xp += amount;
    while (state.level < 7 && state.xp >= XP_THRESHOLDS[state.level]) {
        state.xp -= XP_THRESHOLDS[state.level];
        state.level++;
        state.income += 5;
        // Treasure perk: free epic at level 5
        if (state.level === 5 && state.selectedPerks.includes('treasure')) {
            const epics = ITEMS.filter(function(i) { return i.rarity === 'epic'; });
            if (epics.length && state.tower.length < state.towerMaxSlots) {
                state.tower.push(createShopItem(pick(epics)));
            }
        }
    }
}

function levelUp() {
    // Kept for compatibility but now XP-driven
    return false;
}

function getLevelUpCost() {
    return 999;
}

// === DAY PROGRESSION ===
function startNewDay() {
    state.day++;
    state.gold += state.income;
    generateShop();
}

function getHeartsLost() {
    let loss;
    if (state.day <= 2) loss = 1;
    else if (state.day <= 4) loss = 2;
    else loss = 3;
    // Hero's Core perk reduces loss by 1 during days 1-4
    if (state.selectedPerks.includes('heros_core') && state.day <= 4) {
        loss = Math.max(1, loss - 1);
    }
    return loss;
}

// === ENCOUNTER LOGIC ===
function getEncounterForDay(day) {
    if (state.endless) {
        // In endless mode, cycle encounters using modulo 11
        var cycledDay = (day % 11);
        if (cycledDay === 0) cycledDay = 11;
        return ENCOUNTERS.find(function(e) { return e.day === cycledDay; });
    }
    return ENCOUNTERS.find(function(e) { return e.day === day; });
}


function applyEncounterEffect(effect) {
    // Grant XP for encounter choice
    addXP(5);
    switch (effect) {
        case 'giveRandomRare': {
            const rares = ITEMS.filter(i => i.rarity === 'rare');
            if (rares.length && state.tower.length < state.towerMaxSlots) {
                state.tower.push(createShopItem(pick(rares)));
            }
            break;
        }
        case 'bonusIncome5': state.income += 5; break;
        case 'give2CommonWeapons': {
            const weapons = ITEMS.filter(i => i.rarity === 'common' && i.tags.includes('Weapon'));
            for (let i = 0; i < 2 && state.tower.length < state.towerMaxSlots; i++) {
                state.tower.push(createShopItem(pick(weapons)));
            }
            break;
        }
        case 'sharpenWeapons': {
            state.tower.forEach(item => {
                if (item.tags.includes('Weapon')) item.damage += 6;
            });
            break;
        }
        case 'giveCoreBrew': state.gold += 20; break;
        case 'randomMulticast': {
            if (state.tower.length > 0) {
                const idx = rand(0, state.tower.length - 1);
                state.tower[idx].multicast += 1;
            }
            break;
        }
        case 'spellDamage3': {
            state.tower.forEach(item => {
                if (item.tags.includes('Spell')) item.damage += 3;
            });
            break;
        }
        case 'guaranteeRelic': state.guaranteeRelic = true; break;
        case 'upgradeRandom': {
            const upgradeable = state.tower.filter(i => i.stars < 3);
            if (upgradeable.length) {
                const item = pick(upgradeable);
                item.stars = Math.min(item.stars + 1, 3);
                item.damage = Math.floor(item.damage * 1.25);
                item.multicast += 1;
            }
            break;
        }
        case 'giveGold50': state.gold += 50; break;
        case 'permanentShield40': state.permanentBonuses.shieldStart += 40; break;
        case 'heal3Hearts': state.hearts = Math.min(state.hearts + 3, state.maxHearts); break;
        case 'gambleLegendary': {
            if (Math.random() > 0.5) {
                const legs = ITEMS.filter(i => i.rarity === 'legendary');
                if (legs.length && state.tower.length < state.towerMaxSlots) {
                    state.tower.push(createShopItem(pick(legs)));
                }
            } else {
                state.gold = Math.max(0, state.gold - 30);
            }
            break;
        }
        case 'darkPact': {
            state.tower.forEach(item => { item.multicast += 2; });
            state.hearts = Math.max(0, state.hearts - 2);
            break;
        }

        case 'bonusHP500': state.permanentBonuses.bonusHP += 500; break;
        case 'cooldownReduction': {
            state.permanentBonuses.cooldownReduction += 0.3;
            state.tower.forEach(item => {
                if (item.cooldown > 0.5) item.cooldown = Math.max(0.5, item.cooldown - 0.3);
            });
            break;
        }
        case 'giveLegendaryChurch': {
            const churchLegs = ITEMS.filter(i => i.rarity === 'legendary' && i.pack === 'church');
            const fallback = ITEMS.filter(i => i.rarity === 'legendary');
            const pool = churchLegs.length ? churchLegs : fallback;
            if (pool.length && state.tower.length < state.towerMaxSlots) {
                state.tower.push(createShopItem(pick(pool)));
            }
            break;
        }
        case 'spellMulticast': {
            state.tower.forEach(item => {
                if (item.tags.includes('Spell')) item.multicast += 1;
            });
            break;
        }
    }
}



// === AI OPPONENT GENERATION ===
function generateOpponent() {
    const level = Math.min(state.level + rand(-1, 1), 7);
    const effectiveLevel = Math.max(1, level);
    const rarityTable = LEVEL_RARITY_ACCESS[effectiveLevel];
    const pool = [];
    for (const [rarity, weight] of Object.entries(rarityTable)) {
        if (weight <= 0) continue;
        const items = ITEMS.filter(i => i.rarity === rarity);
        for (let w = 0; w < weight; w++) pool.push(...items);
    }
    var numItems = Math.min(state.day + 1, 6);
    // Endless mode: scale items more aggressively
    if (state.endless) {
        numItems = Math.min(6, numItems + Math.floor(state.endlessDay / 3));
    }
    const tower = [];
    for (let i = 0; i < numItems; i++) {
        const template = pick(pool);
        const item = { ...template, stars: 0, uid: crypto.randomUUID() };
        // Scale stars with day
        if (state.day >= 6 && Math.random() > 0.6) item.stars = 1;
        if (state.day >= 9 && Math.random() > 0.7) item.stars = 2;
        // Endless mode: extra star scaling
        if (state.endless) {
            var bonusStars = Math.floor(state.endlessDay / 5);
            item.stars = Math.min(3, item.stars + bonusStars);
        }
        if (item.stars > 0) {
            item.damage = Math.floor(item.damage * (1 + item.stars * 0.25));
            item.multicast += item.stars;
        }
        tower.push(item);
    }
    return tower;
}

// === COMBAT ENGINE ===
function simulateCombat(playerTower, enemyTower, onTick, onEnd) {
    const baseHP = 1000 + state.day * 100 + state.permanentBonuses.bonusHP;
    const combat = {
        playerHP: baseHP,
        playerMaxHP: baseHP,
        playerShield: state.permanentBonuses.shieldStart,
        enemyHP: baseHP,
        enemyMaxHP: baseHP,
        enemyShield: 0,
        playerDebuffs: { poison: 0, bleed: 0, burn: 0, coreCrack: 0 },
        enemyDebuffs: { poison: 0, bleed: 0, burn: 0, coreCrack: 0 },
        time: 0,
        log: [],
        done: false,
        winner: null,
    };
    // Apply Core Crack to max HP
    function applyCoreCrack() {
        combat.enemyMaxHP = baseHP - combat.enemyDebuffs.coreCrack;
        combat.enemyHP = Math.min(combat.enemyHP, combat.enemyMaxHP);
        combat.playerMaxHP = baseHP + state.permanentBonuses.bonusHP - combat.playerDebuffs.coreCrack;
        combat.playerHP = Math.min(combat.playerHP, combat.playerMaxHP);
    }

    // Initialize cooldown timers
    const playerTimers = playerTower.map(item => ({
        item, cd: item.cooldown, elapsed: 0, triggered: false
    }));
    const enemyTimers = enemyTower.map(item => ({
        item, cd: item.cooldown, elapsed: 0, triggered: false
    }));

    // Apply start-of-combat abilities
    applyStartOfCombat(playerTower, combat, 'player');
    applyStartOfCombat(enemyTower, combat, 'enemy');

    const TICK = 0.1; // 100ms ticks
    const MAX_TIME = 45; // 45 second max combat
    let tickCount = 0;

    function tick() {
        if (combat.done) return;
        combat.time += TICK;
        tickCount++;

        // Apply DoTs every 1 second
        if (tickCount % 10 === 0) {
            applyDots(combat);
            applyCoreCrack();
        }

        // Process player items
        processTimers(playerTimers, playerTower, combat, 'player');
        // Process enemy items
        processTimers(enemyTimers, enemyTower, combat, 'enemy');

        // Check win conditions
        if (combat.enemyHP <= 0) {
            combat.done = true;
            combat.winner = 'player';
        } else if (combat.playerHP <= 0) {
            combat.done = true;
            combat.winner = 'enemy';
        } else if (combat.time >= MAX_TIME) {
            combat.done = true;
            combat.winner = combat.playerHP >= combat.enemyHP ? 'player' : 'enemy';
        }

        if (onTick) onTick(combat, playerTimers, enemyTimers);
        if (combat.done && onEnd) onEnd(combat);
    }

    return { combat, tick, TICK, playerTimers, enemyTimers };
}


function applyStartOfCombat(tower, combat, side) {
    tower.forEach((item, idx) => {
        const ab = item.ability.toLowerCase();
        if (!ab.includes('start of combat')) return;
        if (ab.includes('multicast') && ab.includes('per')) {
            // e.g. Cursed Tiara: +1 multicast per Dark item
            const packItems = tower.filter(i => i.pack === item.pack && i.uid !== item.uid);
            item.multicast += packItems.length;
            combat.log.push(`[${side}] ${item.name}: +${packItems.length} multicast from pack synergy`);
        } else if (ab.includes('gain') && ab.includes('damage') && ab.includes('permanently')) {
            const match = item.ability.match(/\+(\d+)\s*damage/i);
            if (match) {
                item.damage += parseInt(match[1]);
                combat.log.push(`[${side}] ${item.name}: +${match[1]} permanent damage`);
            }
        } else if (ab.includes('give') && ab.includes('multicast')) {
            // Give pack items multicast
            const match = item.ability.match(/\+(\d+)\s*(?:bonus\s*)?multicast/i);
            const bonus = match ? parseInt(match[1]) : 1;
            tower.forEach(other => {
                if (other.uid !== item.uid && other.pack === item.pack) {
                    other.multicast += bonus;
                }
            });
            combat.log.push(`[${side}] ${item.name}: Gave pack items +${bonus} multicast`);
        } else if (ab.includes('shield')) {
            const match = item.ability.match(/(\d+)\s*shield/i);
            if (match) {
                if (side === 'player') combat.playerShield += parseInt(match[1]);
                else combat.enemyShield += parseInt(match[1]);
            }
        } else if (ab.includes('heal') || ab.includes('mend')) {
            const match = item.ability.match(/\+?(\d+)\s*heal/i);
            if (match) {
                const amt = parseInt(match[1]);
                if (side === 'player') combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + amt);
                else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + amt);
            }
        }
        // Self-damage for cursed
        if (ab.includes('self-damage') || ab.includes('self')) {
            const match = item.ability.match(/take\s*(\d+)/i) || item.ability.match(/(\d+)\s*self/i);
            if (match) {
                const dmg = parseInt(match[1]);
                if (side === 'player') combat.playerHP -= dmg;
                else combat.enemyHP -= dmg;
            }
        }
    });
}


function processTimers(timers, tower, combat, side) {
    timers.forEach((t, idx) => {
        if (t.item.cooldown <= 0) return; // Passive items
        t.elapsed += 0.1;
        t.triggered = false;
        if (t.elapsed >= t.cd) {
            t.elapsed = 0;
            t.triggered = true;
            const multicast = Math.max(1, t.item.multicast);
            for (let m = 0; m < multicast; m++) {
                fireItem(t.item, idx, tower, combat, side);
            }
        }
    });
}

function fireItem(item, idx, tower, combat, side) {
    const isPlayer = side === 'player';
    let dmg = item.damage;
    let isCrit = Math.random() * 100 < item.crit;
    if (isCrit) dmg = Math.floor(dmg * 1.5);

    // Ability-based bonus damage
    const ab = item.ability.toLowerCase();
    if (ab.includes('per other') && ab.includes('bow')) {
        const bowCount = tower.filter(i => i.tags.includes('Bow') && i.uid !== item.uid).length;
        dmg += bowCount * 3;
    }
    if (ab.includes('per') && ab.includes('bleed') && ab.includes('stack')) {
        const stacks = isPlayer ? combat.enemyDebuffs.bleed : combat.playerDebuffs.bleed;
        dmg += stacks * 2;
    }
    if (ab.includes('per') && ab.includes('spell')) {
        const spellCount = tower.filter(i => i.tags.includes('Spell') && i.uid !== item.uid).length;
        dmg += spellCount * (ab.includes('+1') ? 1 : 2);
    }

    // Deal damage
    if (dmg > 0) {
        if (isPlayer) {
            if (combat.enemyShield > 0) {
                const absorbed = Math.min(combat.enemyShield, dmg);
                combat.enemyShield -= absorbed;
                dmg -= absorbed;
            }
            combat.enemyHP -= dmg;
        } else {
            if (combat.playerShield > 0) {
                const absorbed = Math.min(combat.playerShield, dmg);
                combat.playerShield -= absorbed;
                dmg -= absorbed;
            }
            combat.playerHP -= dmg;
        }
        const critStr = isCrit ? ' CRIT!' : '';
        combat.log.push(`[${side}] ${item.name} deals ${dmg + (isCrit ? Math.floor(item.damage*0.5) : 0)} dmg${critStr}`);
    }

    // Apply debuffs
    const targetDebuffs = isPlayer ? combat.enemyDebuffs : combat.playerDebuffs;
    if (ab.includes('bleed') || ab.includes('apply') && ab.includes('bleed')) {
        const match = item.ability.match(/(\d+)\s*bleed/i);
        if (match) targetDebuffs.bleed += parseInt(match[1]);
    }
    if (ab.includes('burn') || ab.includes('apply') && ab.includes('burn')) {
        const match = item.ability.match(/(\d+)\s*burn/i);
        if (match) targetDebuffs.burn += parseInt(match[1]);
    }
    if (ab.includes('mana poison') || ab.includes('poison')) {
        const match = item.ability.match(/(\d+)\s*(?:mana\s*)?poison/i);
        if (match) targetDebuffs.poison += parseInt(match[1]);
    }
    if (ab.includes('core crack')) {
        const match = item.ability.match(/(\d+)\s*core\s*crack/i);
        if (match) targetDebuffs.coreCrack += parseInt(match[1]);
    }


    // Healing / Shield on trigger
    if (ab.includes('heal') && !ab.includes('start of combat')) {
        const match = item.ability.match(/heal\s*(\d+)/i);
        if (match) {
            const amt = parseInt(match[1]);
            if (isPlayer) combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + amt);
            else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + amt);
        }
    }
    if (ab.includes('shield') && !ab.includes('start of combat')) {
        const match = item.ability.match(/(\d+)\s*shield/i);
        if (match) {
            const amt = parseInt(match[1]);
            if (isPlayer) combat.playerShield += amt;
            else combat.enemyShield += amt;
        }
    }

    // Self damage for cursed items
    if (ab.includes('self') || (ab.includes('take') && ab.includes('damage'))) {
        const match = item.ability.match(/(?:take|deal)\s*(\d+)\s*damage\s*to\s*self/i) || item.ability.match(/take\s*(\d+)/i);
        if (match) {
            const selfDmg = parseInt(match[1]);
            if (isPlayer) combat.playerHP -= selfDmg;
            else combat.enemyHP -= selfDmg;
        }
    }

    // Trigger other bows (Launcher)
    if (ab.includes('trigger') && ab.includes('bow')) {
        const bows = tower.filter(i => i.tags.includes('Bow') && i.uid !== item.uid);
        if (bows.length > 0) {
            const bow = pick(bows);
            fireItem(bow, tower.indexOf(bow), tower, combat, side);
        }
    }

    // Give item below multicast
    if (ab.includes('item below') && ab.includes('multicast')) {
        if (idx + 1 < tower.length) {
            const match = item.ability.match(/\+(\d+)\s*multicast/i);
            const bonus = match ? parseInt(match[1]) : 1;
            tower[idx + 1].multicast += bonus;
        }
    }

    // Permanently gain damage
    if (ab.includes('permanently gain') && ab.includes('damage') && !ab.includes('start of combat')) {
        const match = item.ability.match(/\+(\d+)\s*(?:bonus\s*)?damage/i);
        if (match) item.damage += parseInt(match[1]);
    }

    // Permanently gain crit
    if (ab.includes('permanently gain') && ab.includes('crit')) {
        const match = item.ability.match(/\+(\d+)%?\s*crit/i);
        if (match) item.crit += parseInt(match[1]);
    }

    // === POTION-APPLIED ON-TRIGGER EFFECTS ===
    // Heal on trigger (from potions)
    if (item.healOnTrigger && item.healOnTrigger > 0) {
        if (isPlayer) combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + item.healOnTrigger);
        else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + item.healOnTrigger);
        combat.log.push(`[${side}] ${item.name} heals ${item.healOnTrigger} (potion buff)`);
    }
    // Poison on trigger (from potions)
    if (item.poisonOnTrigger && item.poisonOnTrigger > 0) {
        targetDebuffs.poison += item.poisonOnTrigger;
        combat.log.push(`[${side}] ${item.name} applies ${item.poisonOnTrigger} poison (potion buff)`);
    }
    // Burn on trigger (from potions)
    if (item.burnOnTrigger && item.burnOnTrigger > 0) {
        targetDebuffs.burn += item.burnOnTrigger;
        combat.log.push(`[${side}] ${item.name} applies ${item.burnOnTrigger} burn (potion buff)`);
    }
    // Shield on trigger (from potions)
    if (item.shieldOnTrigger && item.shieldOnTrigger > 0) {
        if (isPlayer) combat.playerShield += item.shieldOnTrigger;
        else combat.enemyShield += item.shieldOnTrigger;
        combat.log.push(`[${side}] ${item.name} grants ${item.shieldOnTrigger} shield (potion buff)`);
    }

    // === SPECIAL ITEM LOGIC ===
    if (item.special && isPlayer) {
        item._triggerCount = (item._triggerCount || 0) + 1;

        switch (item.special) {
            case 'generate_random_vial':
                addRandomVialToInventory();
                state.potionGenerationQueue.push('Random Vial');
                combat.log.push(`[${side}] ${item.name} generated a random vial!`);
                break;
            case 'generate_phantom_brew':
                if (item._triggerCount % 3 === 0) {
                    addPotionToInventory('phantom_brew');
                    state.potionGenerationQueue.push('Phantom Brew');
                    combat.log.push(`[${side}] ${item.name} generated a Phantom Brew!`);
                }
                break;
            case 'generate_health_vial':
                addPotionToInventory('health_vial');
                state.potionGenerationQueue.push('Health Vial');
                combat.log.push(`[${side}] ${item.name} generated a Health Vial!`);
                break;
            case 'heal_trigger':
                if (isPlayer) combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + 15);
                else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + 15);
                combat.log.push(`[${side}] ${item.name} heals 15 HP`);
                break;
            case 'mending_aura':
                var mheal = 25 + (item._triggerCount - 1) * 2;
                if (isPlayer) combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + mheal);
                else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + mheal);
                item.healOnTrigger = (item.healOnTrigger || 0) + 2;
                combat.log.push(`[${side}] ${item.name} heals ${mheal} HP (+2 permanent heal)`);
                break;
            case 'heal_and_shield':
                if (isPlayer) {
                    combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + 50);
                    combat.playerShield += 5;
                } else {
                    combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + 50);
                    combat.enemyShield += 5;
                }
                combat.log.push(`[${side}] ${item.name} heals 50 HP and grants 5 Shield`);
                break;
            case 'stack_damage':
                item.damage += 1;
                combat.log.push(`[${side}] ${item.name} gained +1 permanent damage (now ${item.damage})`);
                break;
            case 'stack_5_trigger':
                if (item._triggerCount % 5 === 0) {
                    item.damage += 8;
                    item.crit += 5;
                    combat.log.push(`[${side}] ${item.name} gained +8 dmg and +5% crit!`);
                }
                break;
            case 'stack_multicast_4':
                if (item._triggerCount % 4 === 0) {
                    item.multicast += 1;
                    combat.log.push(`[${side}] ${item.name} gained +1 multicast!`);
                }
                break;
            case 'stack_debuff_damage':
                var debuffCount = 0;
                if (isPlayer) {
                    debuffCount = (combat.enemyDebuffs.poison > 0 ? 1 : 0) + (combat.enemyDebuffs.bleed > 0 ? 1 : 0) + (combat.enemyDebuffs.burn > 0 ? 1 : 0) + (combat.enemyDebuffs.coreCrack > 0 ? 1 : 0);
                } else {
                    debuffCount = (combat.playerDebuffs.poison > 0 ? 1 : 0) + (combat.playerDebuffs.bleed > 0 ? 1 : 0) + (combat.playerDebuffs.burn > 0 ? 1 : 0) + (combat.playerDebuffs.coreCrack > 0 ? 1 : 0);
                }
                item.damage += debuffCount;
                if (debuffCount > 0) combat.log.push(`[${side}] ${item.name} gained +${debuffCount} permanent dmg from debuffs`);
                break;
            case 'stack_multicast_3':
                if (item._triggerCount % 3 === 0) {
                    item.multicast += 1;
                    combat.log.push(`[${side}] ${item.name} gained +1 multicast (every 3rd trigger)!`);
                }
                break;
        }
    }
}


function applyDots(combat) {
    // Player takes DOT damage from debuffs on them
    if (combat.playerDebuffs.poison > 0) {
        combat.playerHP -= combat.playerDebuffs.poison;
    }
    if (combat.playerDebuffs.bleed > 0) {
        combat.playerHP -= combat.playerDebuffs.bleed;
    }
    if (combat.playerDebuffs.burn > 0) {
        combat.playerHP -= combat.playerDebuffs.burn;
    }
    // Enemy takes DOT damage from debuffs on them
    if (combat.enemyDebuffs.poison > 0) {
        combat.enemyHP -= combat.enemyDebuffs.poison;
    }
    if (combat.enemyDebuffs.bleed > 0) {
        combat.enemyHP -= combat.enemyDebuffs.bleed;
    }
    if (combat.enemyDebuffs.burn > 0) {
        combat.enemyHP -= combat.enemyDebuffs.burn;
    }
}




// === ENDLESS MODE ===
function enterEndlessMode() {
    state.endless = true;
    state.endlessDay = 0;
    state.hearts = 5;
    state.maxHearts = 5;
}



// === SAVE / LOAD SYSTEM ===
var SAVE_STORAGE_KEY = 'doomsday_tower_saves';
var SAVE_SLOT_KEYS = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6'];
var AUTOSAVE_KEY = 'autosave';

// Read all saves from localStorage. Returns an object keyed by slot key.
function getAllSaves() {
    try {
        var raw = localStorage.getItem(SAVE_STORAGE_KEY);
        if (!raw) return {};
        var parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        return {};
    }
}

// Internal: write the saves object back to localStorage. Returns true on success.
function _writeAllSaves(saves) {
    try {
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saves));
        return true;
    } catch (e) {
        return false;
    }
}

// Serialize a deep copy of the current state.
function _snapshotState() {
    // Strip transient runtime-only properties before serializing.
    // _pendingEncounter is part of state and is preserved.
    var clone = {};
    for (var k in state) {
        if (!Object.prototype.hasOwnProperty.call(state, k)) continue;
        // Skip private keys we know are transient
        if (k === '_lastFusion') continue;
        clone[k] = state[k];
    }
    return JSON.parse(JSON.stringify(clone));
}

// Save the current state into the given slot with the given name.
function saveGame(slotKey, saveName) {
    if (!slotKey) return false;
    var saves = getAllSaves();
    var existing = saves[slotKey];
    var name = (saveName && String(saveName).trim()) || (existing && existing.name) || _defaultSlotName(slotKey);
    saves[slotKey] = {
        name: name,
        timestamp: Date.now(),
        state: _snapshotState()
    };
    return _writeAllSaves(saves);
}

// Auto-save into the dedicated autosave slot.
function autoSaveGame() {
    var saves = getAllSaves();
    saves[AUTOSAVE_KEY] = {
        name: 'Autosave (Day ' + state.day + ')',
        timestamp: Date.now(),
        state: _snapshotState(),
        isAutosave: true
    };
    return _writeAllSaves(saves);
}

// Load the saved state from the given slot. Mutates `state` in place.
function loadGame(slotKey) {
    var saves = getAllSaves();
    var save = saves[slotKey];
    if (!save || !save.state) return false;
    var loaded = JSON.parse(JSON.stringify(save.state));
    // Remove keys from current state that aren't in the loaded state
    for (var k in state) {
        if (Object.prototype.hasOwnProperty.call(state, k) &&
            !Object.prototype.hasOwnProperty.call(loaded, k)) {
            delete state[k];
        }
    }
    // Copy loaded values over
    Object.assign(state, loaded);
    // Reset transient runtime keys
    delete state._lastFusion;
    return true;
}

// Delete a save slot.
function deleteSave(slotKey) {
    var saves = getAllSaves();
    if (Object.prototype.hasOwnProperty.call(saves, slotKey)) {
        delete saves[slotKey];
        return _writeAllSaves(saves);
    }
    return false;
}

// Build a brief metadata string for UI display.
function getSaveMetadata(saveData) {
    if (!saveData || !saveData.state) return 'Empty Slot';
    var s = saveData.state;
    var modeName = s.mode ? (s.mode.charAt(0).toUpperCase() + s.mode.slice(1)) : 'Casual';
    var winsPart = s.endless
        ? ('Score ' + (s.endlessDay || 0))
        : ('Wins ' + (s.wins || 0) + '/10');
    var heartsPart = (s.hearts != null ? s.hearts : '?') + '/' + (s.maxHearts != null ? s.maxHearts : '?') + ' HP';
    var endlessTag = s.endless ? ' • Endless' : '';
    return 'Day ' + (s.day || 1) + ' • Lv.' + (s.level || 1) + ' • ' + winsPart + ' • ' + modeName + endlessTag + ' • ' + heartsPart;
}

// Format a JS timestamp as a readable date string.
function formatSaveTimestamp(ts) {
    if (!ts) return '';
    try {
        var d = new Date(ts);
        // e.g. "Nov 21, 2026, 3:45 PM"
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

function _defaultSlotName(slotKey) {
    if (slotKey === AUTOSAVE_KEY) return 'Autosave';
    var m = /^slot(\d+)$/.exec(slotKey);
    if (m) return 'Save ' + m[1];
    return slotKey;
}
