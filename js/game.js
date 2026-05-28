
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
    orbs: [],
    nextShopLucky: false,
    deepFrozenItems: [],
};

// === XP THRESHOLDS ===
// XP_THRESHOLDS[N] is the cumulative XP needed to be AT level N.
// state.xp is total XP since start of run. Index 0 is unused; level 1 needs 0 XP.
var XP_THRESHOLDS = [0];
for (var __xpLvl = 1; __xpLvl <= 100; __xpLvl++) {
    XP_THRESHOLDS[__xpLvl] = Math.round(8 * __xpLvl + 2 * __xpLvl * __xpLvl);
}
// Yields: Lv2=24, Lv5=90, Lv10=280, Lv20=960, Lv50=5400, Lv100=20800.
var MAX_LEVEL = 100;

// Returns progress info for the XP bar relative to the current level.
function getXPLevelBounds() {
    if (state.level >= MAX_LEVEL) {
        return { prev: 0, next: 0, inLevel: 0, perLevel: 0 };
    }
    // Level 1's lower bound is 0 XP (you start there); from level 2 onward use the table.
    var prev = state.level <= 1 ? 0 : (XP_THRESHOLDS[state.level] || 0);
    var next = XP_THRESHOLDS[state.level + 1] || 0;
    var inLevel = Math.max(0, state.xp - prev);
    var perLevel = Math.max(1, next - prev);
    return { prev: prev, next: next, inLevel: inLevel, perLevel: perLevel };
}

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
    state.orbs = [];
    state.nextShopLucky = false;
    state.deepFrozenItems = [];
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

    // Save deep-frozen items before clearing shop
    var previousDeepFrozen = [];
    state.shop.forEach(function(item) {
        if (item.deepFrozen) previousDeepFrozen.push(JSON.parse(JSON.stringify(item)));
    });

    // Lucky Shop logic
    if (state.nextShopLucky) {
        state.nextShopLucky = false;
        generateLuckyShop();
        // Re-insert deep-frozen items
        reinsertDeepFrozen(previousDeepFrozen);
        state.freeRefresh = state.selectedPerks.includes('adventurers_guild');
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
    // Add crystal at ~30% chance
    if (Math.random() < 0.3) {
        var crystalTemplate = pick(CRYSTALS);
        state.shop.push(createShopCrystal(crystalTemplate));
    }
    // Add orb at ~10% chance (level 3+)
    if (state.level >= 3 && Math.random() < 0.1) {
        var orbTemplate = pick(ORBS);
        state.shop.push(createShopOrb(orbTemplate));
    }
    // Add essence at ~15% chance (level 4+)
    if (state.level >= 4 && Math.random() < 0.15) {
        var essenceTemplate = pick(ESSENCES);
        state.shop.push(createShopEssence(essenceTemplate));
    }
    // Re-insert deep-frozen items (60% chance each)
    reinsertDeepFrozen(previousDeepFrozen);
    // Free refresh for Adventurer's Guild perk
    state.freeRefresh = state.selectedPerks.includes('adventurers_guild');
}

function generateLuckyShop() {
    state.shop = [];
    var types = ['legendary_only', 'orbs_only', 'potions_only', 'same_rarity', 'free_item', 'essences'];
    var luckyType = pick(types);
    state._luckyShopType = luckyType;

    switch (luckyType) {
        case 'legendary_only': {
            var legs = ITEMS.filter(function(i) { return i.rarity === 'legendary'; });
            for (var i = 0; i < 5; i++) {
                state.shop.push(createShopItem(pick(legs)));
            }
            break;
        }
        case 'orbs_only': {
            for (var i = 0; i < 5; i++) {
                state.shop.push(createShopOrb(pick(ORBS)));
            }
            break;
        }
        case 'potions_only': {
            for (var i = 0; i < 7; i++) {
                state.shop.push(createShopPotion(pick(POTIONS)));
            }
            break;
        }
        case 'same_rarity': {
            var highestRarity = 'common';
            var rarityOrder = ['common', 'rare', 'epic', 'legendary', 'relic'];
            state.tower.forEach(function(item) {
                var idx = rarityOrder.indexOf(item.rarity);
                if (idx > rarityOrder.indexOf(highestRarity)) highestRarity = item.rarity;
            });
            var samePool = ITEMS.filter(function(i) { return i.rarity === highestRarity; });
            if (samePool.length === 0) samePool = ITEMS.filter(function(i) { return i.rarity === 'rare'; });
            for (var i = 0; i < 6; i++) {
                state.shop.push(createShopItem(pick(samePool)));
            }
            break;
        }
        case 'free_item': {
            var shopSize = state.selectedPerks.includes('expanded_stock') ? 9 : 7;
            var rarityTable = LEVEL_RARITY_ACCESS[Math.min(state.level, 7)];
            var pool = [];
            for (var r in rarityTable) {
                if (rarityTable[r] <= 0) continue;
                var items = ITEMS.filter(function(it) { return it.rarity === r; });
                for (var w = 0; w < rarityTable[r]; w++) pool = pool.concat(items);
            }
            while (state.shop.length < shopSize) {
                state.shop.push(createShopItem(pick(pool)));
            }
            // Make one item free
            var freeIdx = rand(0, state.shop.length - 1);
            state.shop[freeIdx].cost = 0;
            state.shop[freeIdx]._isFreeItem = true;
            break;
        }
        case 'essences': {
            for (var i = 0; i < 3; i++) {
                state.shop.push(createShopEssence(pick(ESSENCES)));
            }
            var rarityTable2 = LEVEL_RARITY_ACCESS[Math.min(state.level, 7)];
            var pool2 = [];
            for (var r2 in rarityTable2) {
                if (rarityTable2[r2] <= 0) continue;
                var items2 = ITEMS.filter(function(it) { return it.rarity === r2; });
                for (var w2 = 0; w2 < rarityTable2[r2]; w2++) pool2 = pool2.concat(items2);
            }
            for (var i = 0; i < 4; i++) {
                state.shop.push(createShopItem(pick(pool2)));
            }
            break;
        }
    }
}

function reinsertDeepFrozen(previousDeepFrozen) {
    previousDeepFrozen.forEach(function(frozenItem) {
        if (Math.random() < 0.6) {
            // Replace a random slot or add to end
            frozenItem.deepFrozen = true;
            if (state.shop.length > 0) {
                var replaceIdx = rand(0, state.shop.length - 1);
                state.shop[replaceIdx] = frozenItem;
            } else {
                state.shop.push(frozenItem);
            }
        }
    });
}

function createShopCrystal(template) {
    return { ...template, isCrystal: true, frozen: false, deepFrozen: false, uid: crypto.randomUUID() };
}

function createShopOrb(template) {
    return { ...template, isOrb: true, frozen: false, deepFrozen: false, uid: crypto.randomUUID() };
}

function createShopEssence(template) {
    return { ...template, isEssence: true, frozen: false, deepFrozen: false, uid: crypto.randomUUID() };
}

function createShopPotion(template) {
    return { ...template, isPotion: true, frozen: false, deepFrozen: false, uid: crypto.randomUUID() };
}

function createShopItem(template) {
    return { ...template, stars: 0, frozen: false, deepFrozen: false, uid: crypto.randomUUID() };
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

// === DEEP FREEZE ===
function deepFreezeItem(shopIndex) {
    var item = state.shop[shopIndex];
    if (!item) return false;
    item.deepFrozen = !item.deepFrozen;
    return true;
}

// === CRYSTAL BUYING & SOCKETING ===
function buyCrystal(shopIndex) {
    var item = state.shop[shopIndex];
    if (!item || !item.isCrystal) return false;
    if (state.gold < item.cost) return false;
    state.gold -= item.cost;
    state.inventory.push({ ...item, uid: crypto.randomUUID() });
    state.shop.splice(shopIndex, 1);
    return true;
}

function socketCrystal(crystalIndex, towerIndex) {
    var crystal = state.inventory[crystalIndex];
    if (!crystal || !crystal.isCrystal) return false;
    var item = state.tower[towerIndex];
    if (!item) return false;
    if (!item.crystals) item.crystals = [];
    if (item.crystals.length >= 2) return { success: false, reason: 'Item already has max 2 crystals socketed.' };
    item.crystals.push({ id: crystal.id, effectType: crystal.effectType, baseValue: crystal.baseValue, name: crystal.name });
    state.inventory.splice(crystalIndex, 1);
    return { success: true };
}

// === ORB BUYING ===
function buyOrb(shopIndex) {
    var item = state.shop[shopIndex];
    if (!item || !item.isOrb) return false;
    if (state.gold < item.cost) return false;
    if (state.orbs.length >= 3) return false;
    state.gold -= item.cost;
    state.orbs.push({ ...item, uid: crypto.randomUUID() });
    state.shop.splice(shopIndex, 1);
    return true;
}

// === ESSENCE BUYING & APPLYING ===
function buyEssence(shopIndex) {
    var item = state.shop[shopIndex];
    if (!item || !item.isEssence) return false;
    if (state.gold < item.cost) return false;
    state.gold -= item.cost;
    state.inventory.push({ ...item, uid: crypto.randomUUID() });
    state.shop.splice(shopIndex, 1);
    return true;
}

function applyEssence(essenceIndex, towerIndex) {
    var essence = state.inventory[essenceIndex];
    if (!essence || !essence.isEssence) return false;
    var item = state.tower[towerIndex];
    if (!item) return false;
    if (item.essence) return { success: false, reason: 'Item already has an essence applied.' };
    item.essence = { id: essence.id, effectType: essence.effectType, effectValue: essence.effectValue, name: essence.name };
    state.inventory.splice(essenceIndex, 1);
    return { success: true };
}

// === LUCKY POTION USAGE ===
function useLuckyPotion(potionIndex) {
    var potion = state.inventory[potionIndex];
    if (!potion || potion.effectType !== 'lucky_shop') return false;
    state.nextShopLucky = true;
    state.inventory.splice(potionIndex, 1);
    return true;
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
    // Preserve potion tracking fields through fusion (they stay as-is)
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
        return { success: true };
    }

    var item = state.tower[towerIndex];
    if (!item) return false;

    // === Rejection checks ===
    if (potion.effectType === 'cooldown' && item.cooldown <= 0.3) {
        return { success: false, reason: 'Cooldown already at minimum (0.3s)' };
    }
    if (potion.effectType === 'crit' && item.crit >= 100) {
        return { success: false, reason: 'Crit chance already at maximum (100%)' };
    }
    if (potion.effectType === 'damage' && item.damage === 0 && item.cooldown === 0) {
        return { success: false, reason: 'Cannot add damage to passive items' };
    }
    if (potion.effectType === 'multicast' && item.cooldown === 0) {
        return { success: false, reason: 'Cannot add multicast to passive items' };
    }

    switch (potion.effectType) {
        case 'damage':
            item.damage += potion.effectValue;
            item._potionDmg = (item._potionDmg || 0) + potion.effectValue;
            break;
        case 'crit':
            item.crit += potion.effectValue;
            item._potionCrit = (item._potionCrit || 0) + potion.effectValue;
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
            item._cdReduced = (item._cdReduced || 0) + potion.effectValue;
            break;
        case 'multicast':
            item.multicast += potion.effectValue;
            item._potionMC = (item._potionMC || 0) + potion.effectValue;
            break;
        case 'healboost':
            item.healOnTrigger = (item.healOnTrigger || 0) + potion.effectValue;
            break;
        case 'morph':
            var sameRarity = ITEMS.filter(function(i) { return i.rarity === item.rarity && i.id !== item.id; });
            if (sameRarity.length > 0) {
                var newItem = pick(sameRarity);
                var morphed = createShopItem(newItem);
                // Keep all accumulated stats/buffs from the original item
                morphed.stars = item.stars;
                morphed.damage = item.damage;
                morphed.cooldown = item.cooldown;
                morphed.crit = item.crit;
                morphed.multicast = item.multicast;
                morphed.healOnTrigger = item.healOnTrigger || 0;
                morphed.poisonOnTrigger = item.poisonOnTrigger || 0;
                morphed.burnOnTrigger = item.burnOnTrigger || 0;
                morphed.shieldOnTrigger = item.shieldOnTrigger || 0;
                morphed._potionDmg = item._potionDmg || 0;
                morphed._potionCrit = item._potionCrit || 0;
                morphed._potionMC = item._potionMC || 0;
                morphed._cdReduced = item._cdReduced || 0;
                morphed.crystals = item.crystals || [];
                morphed.essence = item.essence || null;
                state.tower[towerIndex] = morphed;
            }
            break;
        case 'upgrade':
            item.stars = Math.min(3, item.stars + 1);
            item.damage = Math.floor(item.damage * 1.25);
            item.multicast += 1;
            break;
        case 'lucky_shop':
            // Lucky Potion is used directly, not applied to an item
            return { success: false, reason: 'Use Lucky Potion from inventory (click to use).' };
    }

    state.inventory.splice(potionIndex, 1);
    return { success: true };
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
    if (state.level >= MAX_LEVEL) return;
    state.xp += amount;
    // Cumulative semantics: keep accumulating until we hit max level.
    while (state.level < MAX_LEVEL && state.xp >= XP_THRESHOLDS[state.level + 1]) {
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
    addXP(8);
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
        case 'midasSellWeakest': {
            if (state.tower.length > 0) {
                var weakestIdx = 0;
                var weakestCost = state.tower[0].cost;
                for (var mi = 1; mi < state.tower.length; mi++) {
                    if (state.tower[mi].cost < weakestCost) {
                        weakestCost = state.tower[mi].cost;
                        weakestIdx = mi;
                    }
                }
                var goldGain = weakestCost * 3;
                state.gold += goldGain;
                state.tower.splice(weakestIdx, 1);
            }
            break;
        }
        case 'midasGoldRush': {
            state.gold += 80;
            state.hearts = Math.max(0, state.hearts - 1);
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

    // Aggressive item count scaling: 2 at day 1, 6 by day 8.
    var maxItemsCap = 6;
    var numItems = Math.min(2 + Math.floor(state.day / 2), maxItemsCap);

    // Endless mode: extra items every 5 endless days, cap raises to 8.
    if (state.endless) {
        maxItemsCap = 8;
        numItems = Math.min(numItems + Math.floor(state.endlessDay / 5), maxItemsCap);
    }

    // Endless damage/buff scaling: +5% chance per endless day (capped 50%) for extra rolls.
    var endlessBonusPct = state.endless ? Math.min(50, state.endlessDay * 5) : 0;

    const tower = [];
    for (let i = 0; i < numItems; i++) {
        const template = pick(pool);
        const item = { ...template, stars: 0, uid: crypto.randomUUID() };

        // === Star scaling ===
        var stars = 0;
        var roll = Math.random() * 100;

        if (state.day >= 15) {
            // Day 15+: every item is at least 2-star, with chance for 3-star.
            stars = roll < 35 ? 3 : 2;
        } else if (state.day >= 10) {
            // Day 10+: 50% chance of 2-star, 25% chance of 3-star.
            if (roll < 25) stars = 3;
            else if (roll < 75) stars = 2;
            else if (roll < 90) stars = 1;
        } else if (state.day >= 7) {
            // Day 7+: 40% chance of 1-star, 20% chance of 2-star.
            if (roll < 20) stars = 2;
            else if (roll < 60) stars = 1;
        } else if (state.day >= 4) {
            // Day 4+: 30% chance of 1-star.
            if (roll < 30) stars = 1;
        }

        // Endless: additional star scaling on top.
        if (state.endless) {
            var bonusStars = Math.floor(state.endlessDay / 5);
            stars = Math.min(3, stars + bonusStars);
            if (Math.random() * 100 < endlessBonusPct) stars = Math.min(3, stars + 1);
        }

        item.stars = stars;
        if (item.stars > 0) {
            item.damage = Math.floor(item.damage * (1 + item.stars * 0.25));
            item.multicast += item.stars;
        }

        // === Day 8+: random damage / multicast buff on some items ===
        if (state.day >= 8) {
            // ~35% chance per item, +5% per endless day.
            var buffChance = 35 + (state.endless ? endlessBonusPct : 0);
            if (Math.random() * 100 < buffChance) {
                if (Math.random() < 0.5) {
                    var bonusDmg = 4 + Math.floor(state.day / 2);
                    item.damage += bonusDmg;
                } else {
                    item.multicast += 1;
                }
            }
        }

        // === Day 12+: 30% of enemy items get random "potion" effects ===
        if (state.day >= 12) {
            var potionChance = 30 + (state.endless ? Math.min(30, endlessBonusPct) : 0);
            if (Math.random() * 100 < potionChance) {
                var effects = ['poison', 'burn', 'heal', 'shield'];
                var pick1 = effects[Math.floor(Math.random() * effects.length)];
                var amt = 2 + Math.floor(state.day / 4);
                switch (pick1) {
                    case 'poison': item.poisonOnTrigger = (item.poisonOnTrigger || 0) + amt; break;
                    case 'burn':   item.burnOnTrigger   = (item.burnOnTrigger   || 0) + amt; break;
                    case 'heal':   item.healOnTrigger   = (item.healOnTrigger   || 0) + amt; break;
                    case 'shield': item.shieldOnTrigger = (item.shieldOnTrigger || 0) + amt; break;
                }
            }
        }

        tower.push(item);
    }
    return tower;
}

// === COMBAT ENGINE ===
function simulateCombat(playerTower, enemyTower, onTick, onEnd) {
    // baseHP scales with day; in endless mode it scales with endless days too.
    const baseHP = 1000 + state.day * 120 + (state.endless ? state.endlessDay * 80 : 0);
    const playerStartHP = baseHP + state.permanentBonuses.bonusHP;
    const combat = {
        playerHP: playerStartHP,
        playerMaxHP: playerStartHP,
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
        _reviveUsed: false,
        _thornsItems: [],
    };
    // Apply Core Crack to max HP
    function applyCoreCrack() {
        combat.enemyMaxHP = baseHP - combat.enemyDebuffs.coreCrack;
        combat.enemyHP = Math.min(combat.enemyHP, combat.enemyMaxHP);
        combat.playerMaxHP = playerStartHP - combat.playerDebuffs.coreCrack;
        combat.playerHP = Math.min(combat.playerHP, combat.playerMaxHP);
    }

    // Check for Doomsday Clock artifact
    var hasDoomsdayClock = playerTower.some(function(i) { return i.id === 'doomsday_clock'; });
    var MAX_TIME = hasDoomsdayClock ? 30 : 45;
    if (hasDoomsdayClock) {
        playerTower.forEach(function(item) {
            if (item.cooldown > 0) {
                item.damage = Math.floor(item.damage * 1.5);
            }
        });
        combat.log.push('[player] Doomsday Clock: Combat time limit 30s. All items +50% damage!');
    }

    // Check for Heart of Ucliat (revive)
    var hasRevive = playerTower.some(function(i) { return i.id === 'heart_of_ucliat'; });

    // Apply crystal bonuses at start of combat
    applyCrystalBonuses(playerTower, combat);

    // Apply orb effects at start of combat
    applyOrbStartEffects(playerTower, combat);

    // Track thorns items
    playerTower.forEach(function(item, idx) {
        if (item.essence && item.essence.effectType === 'thorns') {
            combat._thornsItems.push({ item: item, idx: idx });
        }
    });

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

        // Track HP before processing for thorns
        var hpBeforePlayer = combat.playerHP;

        // Process player items
        processTimers(playerTimers, playerTower, combat, 'player');
        // Process enemy items
        processTimers(enemyTimers, enemyTower, combat, 'enemy');

        // Thorns: if player took damage this tick, fire thorns items
        var damageTaken = hpBeforePlayer - combat.playerHP;
        if (damageTaken > 0 && combat._thornsItems.length > 0) {
            combat._thornsItems.forEach(function(ti) {
                fireItem(ti.item, ti.idx, playerTower, combat, 'player');
            });
        }

        // Check win conditions
        if (combat.enemyHP <= 0) {
            combat.done = true;
            combat.winner = 'player';
        } else if (combat.playerHP <= 0) {
            // Check revive (Heart of Ucliat)
            if (hasRevive && !combat._reviveUsed) {
                combat._reviveUsed = true;
                combat.playerHP = 1;
                combat.log.push('[player] Heart of Ucliat: REVIVED with 1 HP!');
            } else {
                combat.done = true;
                combat.winner = 'enemy';
            }
        } else if (combat.time >= MAX_TIME) {
            combat.done = true;
            combat.winner = combat.playerHP >= combat.enemyHP ? 'player' : 'enemy';
        }

        if (onTick) onTick(combat, playerTimers, enemyTimers);
        if (combat.done && onEnd) onEnd(combat);
    }

    return { combat, tick, TICK, playerTimers, enemyTimers };
}

// === CRYSTAL COMBAT BONUSES ===
function applyCrystalBonuses(playerTower, combat) {
    var manaCount = playerTower.filter(function(i) { return i.pack === 'mana'; }).length;
    var churchCount = playerTower.filter(function(i) { return i.pack === 'church'; }).length;
    var darkCount = playerTower.filter(function(i) { return i.pack === 'dark'; }).length;
    var gorthonCount = playerTower.filter(function(i) { return i.pack === 'gorthon'; }).length;
    var totalItems = playerTower.length;

    playerTower.forEach(function(item) {
        if (!item.crystals || item.crystals.length === 0) return;
        item.crystals.forEach(function(crystal) {
            switch (crystal.effectType) {
                case 'mana_scaling_dmg':
                    var bonus = crystal.baseValue * manaCount;
                    item.damage += bonus;
                    if (bonus > 0) combat.log.push('[player] ' + crystal.name + ': +' + bonus + ' dmg to ' + item.name);
                    break;
                case 'item_count_mc':
                    var mcBonus = crystal.baseValue * Math.floor(totalItems / 3);
                    item.multicast += mcBonus;
                    if (mcBonus > 0) combat.log.push('[player] ' + crystal.name + ': +' + mcBonus + ' MC to ' + item.name);
                    break;
                case 'church_scaling_heal':
                    var healBonus = crystal.baseValue * churchCount;
                    item.healOnTrigger = (item.healOnTrigger || 0) + healBonus;
                    if (healBonus > 0) combat.log.push('[player] ' + crystal.name + ': +' + healBonus + ' heal to ' + item.name);
                    break;
                case 'dark_scaling_poison':
                    var poisonBonus = crystal.baseValue * darkCount;
                    item.poisonOnTrigger = (item.poisonOnTrigger || 0) + poisonBonus;
                    if (poisonBonus > 0) combat.log.push('[player] ' + crystal.name + ': +' + poisonBonus + ' poison to ' + item.name);
                    break;
                case 'gorthon_scaling_cd':
                    var cdBonus = crystal.baseValue * gorthonCount;
                    if (item.cooldown > 0.3) {
                        item.cooldown = Math.max(0.3, item.cooldown - cdBonus);
                        if (cdBonus > 0) combat.log.push('[player] ' + crystal.name + ': -' + cdBonus.toFixed(1) + 's CD to ' + item.name);
                    }
                    break;
            }
        });
    });
}

// === ORB COMBAT EFFECTS ===
function applyOrbStartEffects(playerTower, combat) {
    if (!state.orbs || state.orbs.length === 0) return;
    state.orbs.forEach(function(orb) {
        switch (orb.effect) {
            case 'all_dmg_3':
                playerTower.forEach(function(item) { item.damage += 3; });
                combat.log.push('[player] ' + orb.name + ': All items +3 damage');
                break;
            case 'all_cd_02':
                playerTower.forEach(function(item) {
                    if (item.cooldown > 0.3) item.cooldown = Math.max(0.3, item.cooldown - 0.2);
                });
                combat.log.push('[player] ' + orb.name + ': All items -0.2s cooldown');
                break;
            case 'start_poison_5':
                combat.enemyDebuffs.poison += 5;
                combat.log.push('[player] ' + orb.name + ': Applied 5 Mana Poison to enemy');
                break;
            case 'start_shield_100':
                combat.playerShield += 100;
                combat.log.push('[player] ' + orb.name + ': +100 Shield');
                break;
            case 'all_mc_1':
                playerTower.forEach(function(item) { item.multicast += 1; });
                combat.log.push('[player] ' + orb.name + ': All items +1 multicast');
                break;
            // regen_30 is handled in applyDots
        }
    });
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
            // Cap multicast at 50 to prevent infinite loops and instant-kills
            const multicast = Math.min(50, Math.max(1, t.item.multicast));
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

    // Essence: Execute — 2x damage when enemy below 30% HP
    if (item.essence && item.essence.effectType === 'execute') {
        var targetHP = isPlayer ? combat.enemyHP : combat.playerHP;
        var targetMaxHP = isPlayer ? combat.enemyMaxHP : combat.playerMaxHP;
        if (targetHP < targetMaxHP * 0.3) {
            dmg = Math.floor(dmg * item.essence.effectValue);
        }
    }

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

        // Essence: Lifesteal — heal 20% of damage dealt
        if (item.essence && item.essence.effectType === 'lifesteal' && dmg > 0) {
            var healAmt = Math.floor(dmg * item.essence.effectValue);
            if (isPlayer) combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + healAmt);
            else combat.enemyHP = Math.min(combat.enemyMaxHP, combat.enemyHP + healAmt);
            if (healAmt > 0) combat.log.push(`[${side}] ${item.name} lifesteals ${healAmt} HP`);
        }
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
            case 'infinity_loop':
                item.damage += 1;
                item.multicast += 1;
                item.crit += 1;
                combat.log.push(`[${side}] ${item.name} gained +1 damage, +1 multicast, +1% crit!`);
                break;
        }
    }

    // Essence: Chain Below — trigger the item below this one
    if (item.essence && item.essence.effectType === 'chain_below' && isPlayer) {
        if (idx + 1 < tower.length) {
            var belowItem = tower[idx + 1];
            if (belowItem.cooldown > 0) {
                fireItem(belowItem, idx + 1, tower, combat, side);
                combat.log.push(`[${side}] ${item.name} chains into ${belowItem.name}!`);
            }
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
    // Orb of Mending: heal 3 HP per tick (30/sec) — called every 1s (10 ticks)
    if (state.orbs && state.orbs.length > 0) {
        var hasMending = state.orbs.some(function(o) { return o.effect === 'regen_30'; });
        if (hasMending) {
            combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + 30);
        }
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
        if (k === '_selectedPotionIdx') continue;
        if (k === '_selectedPotionId') continue;
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
    delete state._selectedPotionIdx;
    delete state._selectedPotionId;

    // Migration: older saves stored state.xp as "XP within current level" (per-level
    // semantics). The new system uses cumulative XP. If an old save is loaded, bump
    // state.xp up to the cumulative threshold for its current level so the XP bar
    // displays sanely and progression continues smoothly.
    if (typeof state.level === 'number' && typeof state.xp === 'number'
        && state.level > 1 && state.level <= MAX_LEVEL
        && state.xp < (XP_THRESHOLDS[state.level] || 0)) {
        state.xp = (XP_THRESHOLDS[state.level] || 0) + Math.max(0, state.xp);
    }
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
