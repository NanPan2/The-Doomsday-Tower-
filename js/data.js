// === PACKS ===
const PACKS = {
    mana: { name: 'Mana Pack', color: '#6644ff', desc: 'Spells, cores, mana flow' },
    doomsday: { name: 'Doomsday Pack', color: '#cc2200', desc: 'Heavy weapons, bleed/poison' },
    lostmagic: { name: 'Lost Magic Pack', color: '#00ccaa', desc: 'Relics, ancient-forged' },
    dark: { name: 'Dark Pack', color: '#8800aa', desc: 'Cursed and corrupted' },
    gorthon: { name: 'Gorthon Pack', color: '#22aacc', desc: 'Elven magi-tech, speed' },
    church: { name: 'Church Pack', color: '#cccc44', desc: 'Divine relics, defense' },
    neutral: { name: 'Neutral Pack', color: '#888899', desc: 'Standalone / cross-synergy' },
};

// === TAGS ===
const TAGS = ['Weapon','Bow','Dagger','Spell','Relic','Skill','Skyspine'];

// === RARITIES ===
const RARITIES = {
    common: { name: 'Common', color: '#aaaacc', weight: 60 },
    rare: { name: 'Rare', color: '#4488ff', weight: 25 },
    epic: { name: 'Epic', color: '#aa44ff', weight: 10 },
    legendary: { name: 'Legendary', color: '#ffaa00', weight: 4 },
    relic: { name: 'Relic', color: '#00ffcc', weight: 1 },
    cursed: { name: 'Cursed', color: '#ff44aa', weight: 5 },
    forged: { name: 'Forged', color: '#ff6600', weight: 0 },
};



// === ITEMS DATABASE ===
const ITEMS = [
    // --- COMMON ITEMS ---
    { id: 'voidspike', name: 'Voidspike', rarity: 'common', damage: 18, cooldown: 2.7, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'mana', cost: 25, ability: 'On trigger: Gain +2 bonus damage per debuff on enemy.' },
    { id: 'iron_sword', name: 'Iron Sword', rarity: 'common', damage: 22, cooldown: 3.0, crit: 10, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 20, ability: 'On trigger: Deal +5 damage if enemy has Bleed.' },
    { id: 'shortbow', name: 'Shortbow', rarity: 'common', damage: 14, cooldown: 2.2, crit: 15, multicast: 1, tags: ['Bow'], pack: 'neutral', cost: 20, ability: 'On trigger: 20% chance to fire twice.' },
    { id: 'ice_spear', name: 'Ice Spear', rarity: 'common', damage: 16, cooldown: 2.8, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'mana', cost: 25, ability: 'On trigger: Permanently gain +1% crit chance.' },
    { id: 'rusty_dagger', name: 'Rusty Dagger', rarity: 'common', damage: 10, cooldown: 1.5, crit: 25, multicast: 1, tags: ['Dagger'], pack: 'doomsday', cost: 15, ability: 'On crit: Apply 3 Bleed to enemy.' },
    { id: 'mana_bolt', name: 'Mana Bolt', rarity: 'common', damage: 20, cooldown: 3.2, crit: 0, multicast: 1, tags: ['Spell'], pack: 'mana', cost: 25, ability: 'On trigger: Gain +1 damage per other Spell item.' },
    { id: 'hunters_axe', name: "Hunter's Axe", rarity: 'common', damage: 28, cooldown: 3.8, crit: 5, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 25, ability: 'Start of Combat: Gain +5 damage permanently.' },
    { id: 'spark_wand', name: 'Spark Wand', rarity: 'common', damage: 12, cooldown: 2.0, crit: 0, multicast: 2, tags: ['Spell'], pack: 'mana', cost: 30, ability: 'Base multicast 2.' },
    { id: 'wooden_shield', name: 'Wooden Shield', rarity: 'common', damage: 0, cooldown: 5.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 15, ability: 'On trigger: Gain 30 Shield.' },
    { id: 'longbow', name: 'Longbow', rarity: 'common', damage: 20, cooldown: 3.0, crit: 10, multicast: 1, tags: ['Bow'], pack: 'neutral', cost: 22, ability: 'On trigger: Deal +3 damage per other Bow.' },

    { id: 'prayer_beads', name: 'Prayer Beads', rarity: 'common', damage: 0, cooldown: 4.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 18, ability: 'On trigger: Heal 20 HP.' },
    { id: 'skyspine_dart', name: 'Skyspine Dart', rarity: 'common', damage: 8, cooldown: 1.2, crit: 10, multicast: 1, tags: ['Skyspine'], pack: 'gorthon', cost: 20, ability: 'On trigger: Give item below +1 multicast for this combat.' },
    // --- RARE ITEMS ---
    { id: 'flameblade', name: 'Flameblade', rarity: 'rare', damage: 30, cooldown: 3.2, crit: 10, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 35, ability: 'On trigger: Apply 5 Burn to enemy.' },
    { id: 'crescentshot', name: 'Crescentshot', rarity: 'rare', damage: 18, cooldown: 2.5, crit: 20, multicast: 1, tags: ['Bow'], pack: 'mana', cost: 35, ability: 'On trigger: Permanently gain +2 damage.' },
    { id: 'shadow_knife', name: 'Shadow Knife', rarity: 'rare', damage: 14, cooldown: 1.4, crit: 30, multicast: 1, tags: ['Dagger'], pack: 'dark', cost: 30, ability: 'On crit: Apply 5 Mana Poison.' },
    { id: 'arcane_focus', name: 'Arcane Focus', rarity: 'rare', damage: 0, cooldown: 4.0, crit: 0, multicast: 1, tags: ['Spell'], pack: 'mana', cost: 35, ability: 'On trigger: Give all Spell items +1 multicast for this combat.' },
    { id: 'blessed_mace', name: 'Blessed Mace', rarity: 'rare', damage: 25, cooldown: 3.5, crit: 5, multicast: 1, tags: ['Weapon'], pack: 'church', cost: 35, ability: 'On trigger: Gain 15 Shield. Deal +1 damage per 10 Shield.' },
    { id: 'venom_fang', name: 'Venom Fang', rarity: 'rare', damage: 12, cooldown: 1.8, crit: 15, multicast: 1, tags: ['Dagger'], pack: 'doomsday', cost: 30, ability: 'On trigger: Apply 4 Mana Poison. Stacks.' },
    { id: 'skyspine_repeater', name: 'Skyspine Repeater', rarity: 'rare', damage: 10, cooldown: 1.0, crit: 5, multicast: 2, tags: ['Skyspine','Bow'], pack: 'gorthon', cost: 38, ability: 'Base multicast 2. On trigger: +1 multicast per other Gorthon item.' },
    { id: 'dark_tome', name: 'Dark Tome', rarity: 'rare', damage: 15, cooldown: 3.0, crit: 0, multicast: 1, tags: ['Spell'], pack: 'dark', cost: 32, ability: 'On trigger: Gain +2 damage per Cursed item in tower.' },
    { id: 'holy_ward', name: 'Holy Ward', rarity: 'rare', damage: 0, cooldown: 6.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 30, ability: 'On trigger: Gain 60 Shield. Remove 1 debuff.' },
    { id: 'elven_compound', name: 'Elven Compound', rarity: 'rare', damage: 22, cooldown: 2.4, crit: 15, multicast: 1, tags: ['Bow'], pack: 'gorthon', cost: 35, ability: 'On trigger: Fire 1 extra time per other Bow in tower.' },

    // --- EPIC ITEMS ---
    { id: 'moonveil', name: 'Moonveil', rarity: 'epic', damage: 20, cooldown: 4.2, crit: 0, multicast: 2, tags: ['Spell'], pack: 'mana', cost: 60, ability: 'Start of Combat: Give all Mana Pack items +2 bonus multicast.' },
    { id: 'skyspine_launcher', name: 'Skyspine Launcher', rarity: 'epic', damage: 15, cooldown: 2.4, crit: 10, multicast: 1, tags: ['Skyspine','Bow'], pack: 'gorthon', cost: 55, ability: 'On trigger: Trigger 1 random Bow in your tower.' },
    { id: 'cursed_tiara', name: 'Cursed Tiara', rarity: 'epic', damage: 10, cooldown: 3.5, crit: 0, multicast: 1, tags: ['Relic'], pack: 'dark', cost: 50, ability: 'Start of Combat: Gain +1 multicast per other Dark item in tower.' },
    { id: 'doomsday_cleaver', name: 'Doomsday Cleaver', rarity: 'epic', damage: 45, cooldown: 4.5, crit: 15, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 55, ability: 'On trigger: Apply 8 Bleed. Deal +2 damage per Bleed stack on enemy.' },
    { id: 'divine_pact', name: 'Divine Pact', rarity: 'epic', damage: 0, cooldown: 8.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 50, ability: 'On trigger: Heal 100 HP and give all Church items +1 multicast permanently.' },
    { id: 'trovak_codex', name: 'Trovak Codex', rarity: 'epic', damage: 0, cooldown: 0, crit: 0, multicast: 0, tags: ['Spell'], pack: 'mana', cost: 60, ability: 'Passive: All Spell items gain +6 damage and +1 multicast permanently (Spellbook).' },
    { id: 'core_cracker', name: 'Core Cracker', rarity: 'epic', damage: 30, cooldown: 5.0, crit: 0, multicast: 1, tags: ['Relic'], pack: 'lostmagic', cost: 55, ability: 'On First Trigger: Apply 200 Core Crack to enemy tower.' },
    { id: 'rainbow_bow', name: 'Rainbow Bow', rarity: 'epic', damage: 12, cooldown: 2.0, crit: 20, multicast: 1, tags: ['Bow'], pack: 'neutral', cost: 50, ability: 'On trigger: Fire once per other Bow in your tower.' },

    // --- LEGENDARY ITEMS ---
    { id: 'solaris', name: 'Solaris', rarity: 'legendary', damage: 25, cooldown: 4.0, crit: 0, multicast: 3, tags: ['Spell'], pack: 'mana', cost: 75, ability: 'Start of Combat: Permanently gain +2 multicast and +20 heal.' },
    { id: 'moonstone', name: 'Moonstone', rarity: 'legendary', damage: 30, cooldown: 3.8, crit: 0, multicast: 2, tags: ['Spell'], pack: 'mana', cost: 70, ability: 'Start of Combat: Permanently gain +4 damage per Mana Pack item.' },
    { id: 'doomsday_edge', name: 'Doomsday Edge', rarity: 'legendary', damage: 60, cooldown: 5.0, crit: 20, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 75, ability: 'On trigger: Apply 12 Bleed and 12 Burn. Deal +1 damage per total debuff stack.' },
    { id: 'skyspine_harness', name: 'Skyspine Harness', rarity: 'legendary', damage: 5, cooldown: 0.8, crit: 5, multicast: 3, tags: ['Skyspine'], pack: 'gorthon', cost: 80, ability: 'On trigger: Give item below +2 multicast. Base multicast 3.' },
    { id: 'ucliat_blessing', name: "Ucliat's Blessing", rarity: 'legendary', damage: 0, cooldown: 10.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 70, ability: 'On trigger: Heal 200 HP, gain 100 Shield, +1 multicast to all items permanently.' },
    { id: 'void_crown', name: 'Void Crown', rarity: 'legendary', damage: 20, cooldown: 3.0, crit: 0, multicast: 2, tags: ['Relic'], pack: 'dark', cost: 75, ability: 'Start of Combat: Gain +2 multicast per Cursed item. Apply 10 Mana Poison to self.' },
    // --- RELIC ITEMS ---
    { id: 'ancient_core', name: 'Ancient Core', rarity: 'relic', damage: 35, cooldown: 4.5, crit: 10, multicast: 2, tags: ['Relic'], pack: 'lostmagic', cost: 65, ability: 'On trigger: 50% chance to triple damage. 25% chance to deal 0.' },
    { id: 'chrono_shard', name: 'Chrono Shard', rarity: 'relic', damage: 0, cooldown: 6.0, crit: 0, multicast: 1, tags: ['Relic'], pack: 'lostmagic', cost: 60, ability: 'On trigger: Reduce all ally cooldowns by 0.5s permanently.' },
    // --- CURSED ITEMS ---
    { id: 'cursed_blade', name: 'Cursed Blade', rarity: 'cursed', damage: 40, cooldown: 2.5, crit: 20, multicast: 1, tags: ['Weapon'], pack: 'dark', cost: 35, ability: 'On trigger: Deal 40 damage. Take 10 damage to self.' },
    { id: 'cursed_shield', name: 'Cursed Shield', rarity: 'cursed', damage: 0, cooldown: 5.0, crit: 0, multicast: 3, tags: ['Skill'], pack: 'dark', cost: 40, ability: 'Start of Combat: Permanently gain +3 multicast. Take 50 self-damage.' },
    { id: 'blood_chalice', name: 'Blood Chalice', rarity: 'cursed', damage: 0, cooldown: 4.0, crit: 0, multicast: 1, tags: ['Relic'], pack: 'dark', cost: 38, ability: 'On trigger: Heal 40 HP. Apply 5 Bleed to self.' },

    // --- POTION-GENERATING WEAPONS ---
    { id: 'alchemists_retort', name: "Alchemist's Retort", rarity: 'rare', damage: 8, cooldown: 4.0, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'mana', cost: 40, ability: 'On trigger: Generate 1 random Vial to inventory.', special: 'generate_random_vial' },
    { id: 'brew_cauldron', name: 'Brew Cauldron', rarity: 'epic', damage: 0, cooldown: 6.0, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'neutral', cost: 65, ability: 'Every 3 triggers: Generate 1 Phantom Brew to inventory.', special: 'generate_phantom_brew' },
    { id: 'pompas_distiller', name: 'Pompas Distiller', rarity: 'rare', damage: 0, cooldown: 5.0, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'church', cost: 35, ability: 'On trigger: Generate 1 Health Vial to inventory.', special: 'generate_health_vial' },

    // --- PASSIVE HEALTH REGEN WEAPONS ---
    { id: 'lifewell_totem', name: 'Lifewell Totem', rarity: 'common', damage: 0, cooldown: 3.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 20, ability: 'On trigger: Heal 15 HP.', special: 'heal_trigger' },
    { id: 'mending_aura', name: 'Mending Aura', rarity: 'rare', damage: 0, cooldown: 4.5, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 38, ability: 'On trigger: Heal 25 HP. Gain +2 heal per trigger permanently.', special: 'mending_aura' },
    { id: 'sanctified_chalice', name: 'Sanctified Chalice', rarity: 'epic', damage: 0, cooldown: 6.0, crit: 0, multicast: 1, tags: ['Skill'], pack: 'church', cost: 52, ability: 'On trigger: Heal 50 HP and give +5 Shield.', special: 'heal_and_shield' },

    // --- STACKING STAT WEAPONS ---
    { id: 'accumulator', name: 'Accumulator', rarity: 'common', damage: 5, cooldown: 2.0, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'gorthon', cost: 22, ability: 'On trigger: Permanently gain +1 damage.', special: 'stack_damage' },
    { id: 'battle_hardened_axe', name: 'Battle-Hardened Axe', rarity: 'rare', damage: 20, cooldown: 3.5, crit: 5, multicast: 1, tags: ['Weapon'], pack: 'doomsday', cost: 38, ability: 'After every 5 triggers: Gain +8 damage and +5% crit permanently.', special: 'stack_5_trigger' },
    { id: 'mana_capacitor', name: 'Mana Capacitor', rarity: 'epic', damage: 15, cooldown: 3.0, crit: 0, multicast: 1, tags: ['Spell'], pack: 'mana', cost: 58, ability: 'On trigger: Permanently gain +1 multicast every 4th trigger.', special: 'stack_multicast_4' },
    { id: 'void_siphon', name: 'Void Siphon', rarity: 'rare', damage: 12, cooldown: 2.8, crit: 0, multicast: 1, tags: ['Weapon'], pack: 'dark', cost: 36, ability: 'On trigger: Gain +1 damage per debuff on enemy. Stacks permanently.', special: 'stack_debuff_damage' },
    { id: 'elven_amplifier', name: 'Elven Amplifier', rarity: 'legendary', damage: 10, cooldown: 1.5, crit: 0, multicast: 2, tags: ['Weapon'], pack: 'gorthon', cost: 72, ability: 'On trigger: Permanently gain +0.5 multicast every 3rd trigger.', special: 'stack_multicast_3' },
];



// === PERKS ===
const PERKS = [
    { id: 'heros_core', name: "Hero's Core", desc: 'Take 1 less heart damage on losses during Days 1-4.' },
    { id: 'treasure', name: 'Treasure', desc: 'Gain a free Epic chest when you reach Level 5.' },
    { id: 'expanded_stock', name: 'Expanded Stock', desc: 'See 9 items in each shop instead of 7.' },
    { id: 'mana_conduit', name: 'Mana Conduit', desc: 'One tower slot passively reduces cooldown of adjacent items by 10%.' },
    { id: 'relic_seeker', name: 'Relic Seeker', desc: 'Start with a random Common Relic item.' },
    { id: 'doomsday_veteran', name: 'Doomsday Veteran', desc: 'Start Day 1 with 10 bonus gold.' },
    { id: 'adventurers_guild', name: "Adventurer's Guild Card", desc: 'One free shop refresh per day.' },
];

// === ENCOUNTERS ===
const ENCOUNTERS = [
    { day: 3, npcs: [
        { name: 'Wandering Merchant', icon: '🧳', flavor: 'A weary traveler offers rare goods.',
          choices: [
            { label: 'Buy Wares', desc: 'Gain 1 random Rare item.', effect: 'giveRandomRare' },
            { label: 'Trade Secrets', desc: 'Permanently gain +5 gold income.', effect: 'bonusIncome5' },
          ]},
    ]},
    { day: 4, npcs: [
        { name: 'Hunter', icon: '🏹', flavor: 'A seasoned hunter from the Doomsday frontier.',
          choices: [
            { label: 'Loot Drop', desc: 'Gain 2 random common weapons.', effect: 'give2CommonWeapons' },
            { label: 'Sharpen', desc: 'Give all your weapons +6 damage permanently.', effect: 'sharpenWeapons' },
          ]},
        { name: 'Core Brewer', icon: '🧪', flavor: 'Bubbling potions line the shelves of a makeshift lab.',
          choices: [
            { label: 'Core Brew', desc: 'Gain a Core Brew potion (random stat boost).', effect: 'giveCoreBrew' },
            { label: 'Crystal Infusion', desc: 'Give 1 random item +1 multicast permanently.', effect: 'randomMulticast' },
          ]},
    ]},
    { day: 6, npcs: [
        { name: 'The Crimson Priest', icon: '⛪', flavor: 'Order-aligned. The Church demands offerings.',
          choices: [
            { label: 'Mana Blessing', desc: 'All Spell items gain +3 damage permanently.', effect: 'spellDamage3' },
            { label: 'Relic Access', desc: 'Next shop guaranteed to contain 1 Relic item.', effect: 'guaranteeRelic' },
          ]},
        { name: 'Celestia', icon: '✨', flavor: 'A star-touched spirit offers a wish.',
          choices: [
            { label: 'Wish: Upgrade', desc: 'Upgrade a random 1-star item to 2-star.', effect: 'upgradeRandom' },
            { label: 'Wish: Gold', desc: 'Gain 50 gold immediately.', effect: 'giveGold50' },
          ]},
    ]},

    { day: 8, npcs: [
        { name: 'Church Sage', icon: '📿', flavor: 'Holy words echo through the ruins.',
          choices: [
            { label: 'Holy Favor', desc: 'Gain 40 Shield at start of each combat permanently.', effect: 'permanentShield40' },
            { label: 'Mend', desc: 'Heal 3 Hearts.', effect: 'heal3Hearts' },
          ]},
    ]},
    { day: 9, npcs: [
        { name: 'Carmen', icon: '🎭', flavor: 'A Tenebrim-aligned trickster. Risk and reward.',
          choices: [
            { label: 'Gamble', desc: 'Gain 1 random Legendary OR lose 30 gold.', effect: 'gambleLegendary' },
            { label: 'Dark Pact', desc: 'Gain +2 multicast to all items. Take 2 heart damage.', effect: 'darkPact' },
          ]},
        { name: 'Medic', icon: '🏥', flavor: 'A field medic offers emergency aid.',
          choices: [
            { label: 'Emergency Heal', desc: '+500 max HP to your tower.', effect: 'bonusHP500' },
            { label: 'Stimulant', desc: 'All items get -0.3s cooldown permanently.', effect: 'cooldownReduction' },
          ]},
    ]},
    { day: 11, npcs: [
        { name: 'Grand Bishop', icon: '👑', flavor: 'The highest authority of the Church of Ucliat.',
          choices: [
            { label: 'Divine Arsenal', desc: 'Gain 1 random Legendary Church item.', effect: 'giveLegendaryChurch' },
            { label: 'Blessing of Ucliat', desc: '+1 multicast to all Spell items permanently.', effect: 'spellMulticast' },
          ]},
    ]},
];

// === POTIONS DATABASE ===
const POTIONS = [
    { id: 'damage_vial', name: 'Damage Vial', cost: 12, type: 'weapon-buff', desc: '+4 damage to target item.', effectType: 'damage', effectValue: 4, color: '#ff4444' },
    { id: 'crit_vial', name: 'Crit Vial', cost: 12, type: 'weapon-buff', desc: '+10% crit chance to target item.', effectType: 'crit', effectValue: 10, color: '#4488ff' },
    { id: 'heal_vial', name: 'Heal Vial', cost: 14, type: 'weapon-buff', desc: '+4 heal on trigger to target item.', effectType: 'heal', effectValue: 4, color: '#44ee77' },
    { id: 'mana_poison_vial', name: 'Mana Poison Vial', cost: 14, type: 'weapon-buff', desc: '+2 Mana Poison on trigger to target item.', effectType: 'poison', effectValue: 2, color: '#aa44ff' },
    { id: 'burn_vial', name: 'Burn Vial', cost: 14, type: 'weapon-buff', desc: '+2 Burn on trigger to target item.', effectType: 'burn', effectValue: 2, color: '#ff6633' },
    { id: 'shield_vial', name: 'Shield Vial', cost: 14, type: 'weapon-buff', desc: '+4 Shield on trigger to target item.', effectType: 'shield', effectValue: 4, color: '#66ccff' },
    { id: 'time_vial', name: 'Time Vial', cost: 18, type: 'weapon-buff', desc: '-0.2s cooldown to target item.', effectType: 'cooldown', effectValue: 0.2, color: '#ffdd00' },
    { id: 'phantom_brew', name: 'Phantom Brew', cost: 55, type: 'weapon-buff', desc: '+1 multicast to target item.', effectType: 'multicast', effectValue: 1, color: '#bb44ff' },
    { id: 'health_vial', name: 'Health Vial', cost: 10, type: 'tower-buff', desc: '+150 max tower HP.', effectType: 'maxhp', effectValue: 150, color: '#44ee77' },
    { id: 'mending_serum', name: 'Mending Serum', cost: 20, type: 'weapon-buff', desc: '+8 heal on trigger to target item.', effectType: 'healboost', effectValue: 8, color: '#22cc66' },
    { id: 'morph_vial', name: 'Morph Vial', cost: 22, type: 'utility', desc: 'Transform target item into random item of same rarity.', effectType: 'morph', effectValue: 0, color: '#ff8800' },
    { id: 'crownforge_brew', name: 'Crownforge Brew', cost: 45, type: 'utility', desc: 'Upgrade target item star level by 1.', effectType: 'upgrade', effectValue: 1, color: '#ffd700' },
];

// === LEVEL THRESHOLDS FOR RARITY ACCESS ===
const LEVEL_RARITY_ACCESS = {
    1: { common: 80, rare: 18, epic: 2, legendary: 0, relic: 0, cursed: 0 },
    2: { common: 65, rare: 25, epic: 8, legendary: 2, relic: 0, cursed: 0 },
    3: { common: 50, rare: 30, epic: 13, legendary: 5, relic: 1, cursed: 1 },
    4: { common: 35, rare: 30, epic: 20, legendary: 10, relic: 3, cursed: 2 },
    5: { common: 20, rare: 28, epic: 25, legendary: 17, relic: 6, cursed: 4 },
    6: { common: 10, rare: 22, epic: 28, legendary: 24, relic: 10, cursed: 6 },
    7: { common: 5, rare: 15, epic: 30, legendary: 28, relic: 14, cursed: 8 },
};
