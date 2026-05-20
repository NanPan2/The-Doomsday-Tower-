import { ITEMS, PERKS, ENCOUNTERS, LEVEL_RARITY_ACCESS, PACKS } from './data.js';

// === GAME STATE ===
export const state = {
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
};

export function resetState() {
    state.day = 1;
    state.wins = 0;
    state.hearts = 10;
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
}


// === UTILITY ===
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// === SHOP GENERATION ===
export function generateShop() {
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
    // Free refresh for Adventurer's Guild perk
    state.freeRefresh = state.selectedPerks.includes('adventurers_guild');
}

function createShopItem(template) {
    return { ...template, stars: 0, frozen: false, uid: crypto.randomUUID() };
}

export function refreshShop() {
    const cost = state.freeRefresh ? 0 : 3;
    if (state.gold < cost) return false;
    state.gold -= cost;
    state.freeRefresh = false;
    state.shopFrozen = false;
    state.shop = [];
    generateShop();
    return true;
}

export function freezeShop() {
    state.shopFrozen = !state.shopFrozen;
    state.shop.forEach(i => i.frozen = state.shopFrozen);
}


// === BUYING & TOWER ===
export function buyItem(shopIndex) {
    const item = state.shop[shopIndex];
    if (!item || state.gold < item.cost) return false;
    if (state.tower.length >= state.towerMaxSlots) return false;
    state.gold -= item.cost;
    state.tower.push({ ...item });
    state.shop.splice(shopIndex, 1);
    return true;
}

export function sellItem(towerIndex) {
    const item = state.tower[towerIndex];
    if (!item) return false;
    const refund = Math.floor(item.cost * 0.5);
    state.gold += refund;
    state.tower.splice(towerIndex, 1);
    return refund;
}

export function levelUp() {
    const cost = 4 * (state.level - 1) + 48;
    if (state.gold < cost || state.level >= 7) return false;
    state.gold -= cost;
    state.level++;
    state.income += 5;
    // Treasure perk: free epic at level 5
    if (state.level === 5 && state.selectedPerks.includes('treasure')) {
        const epics = ITEMS.filter(i => i.rarity === 'epic');
        if (epics.length && state.tower.length < state.towerMaxSlots) {
            state.tower.push(createShopItem(pick(epics)));
        }
    }
    return true;
}

export function getLevelUpCost() {
    return 4 * (state.level - 1) + 48;
}

// === DAY PROGRESSION ===
export function startNewDay() {
    state.day++;
    state.gold += state.income;
    generateShop();
}

export function getHeartsLost() {
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
export function getEncounterForDay(day) {
    return ENCOUNTERS.find(e => e.day === day);
}


export function applyEncounterEffect(effect) {
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
export function generateOpponent() {
    const level = Math.min(state.level + rand(-1, 1), 7);
    const effectiveLevel = Math.max(1, level);
    const rarityTable = LEVEL_RARITY_ACCESS[effectiveLevel];
    const pool = [];
    for (const [rarity, weight] of Object.entries(rarityTable)) {
        if (weight <= 0) continue;
        const items = ITEMS.filter(i => i.rarity === rarity);
        for (let w = 0; w < weight; w++) pool.push(...items);
    }
    const numItems = Math.min(state.day + 1, 6);
    const tower = [];
    for (let i = 0; i < numItems; i++) {
        const template = pick(pool);
        const item = { ...template, stars: 0, uid: crypto.randomUUID() };
        // Scale stars with day
        if (state.day >= 6 && Math.random() > 0.6) item.stars = 1;
        if (state.day >= 9 && Math.random() > 0.7) item.stars = 2;
        if (item.stars > 0) {
            item.damage = Math.floor(item.damage * (1 + item.stars * 0.25));
            item.multicast += item.stars;
        }
        tower.push(item);
    }
    return tower;
}

// === COMBAT ENGINE ===
export function simulateCombat(playerTower, enemyTower, onTick, onEnd) {
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

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
