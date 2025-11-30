
import { Rarity, ElementType, Character, Weapon, Cosmetic, ModChip, CharacterStats, BattleUnit, Quest, InventoryItem, ShopItem, Skill, CampaignStage, BattleRewards, UpgradeResult, CharacterRole } from '../types';
import { generateCharacterLore, generateWeaponLore } from './geminiService';

export const PULL_COST = 160;

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    id: 1,
    name: "Neon Slums",
    description: "The outskirts of the city where the low-lives gather.",
    recommendedLevel: 1,
    recommendedCP: 1200,
    enemies: { count: 3, rarityRange: [Rarity.COMMON, Rarity.COMMON] },
    rewards: { gold: 100, xp: 50 }
  },
  {
    id: 2,
    name: "Industrial District",
    description: "Heavy machinery and rogue droids.",
    recommendedLevel: 5,
    recommendedCP: 2500,
    enemies: { count: 3, rarityRange: [Rarity.COMMON, Rarity.RARE] },
    rewards: { gold: 200, xp: 120 }
  },
  {
    id: 3,
    name: "Corporate Plaza",
    description: "Security forces are tight here.",
    recommendedLevel: 10,
    recommendedCP: 4500,
    enemies: { count: 3, rarityRange: [Rarity.RARE, Rarity.RARE] },
    rewards: { gold: 500, xp: 300 },
    boss: true
  },
  {
    id: 4,
    name: "Sky Garden",
    description: "Elite residence layer.",
    recommendedLevel: 20,
    recommendedCP: 7000,
    enemies: { count: 3, rarityRange: [Rarity.RARE, Rarity.LEGENDARY] },
    rewards: { gold: 1000, xp: 800 }
  },
  {
    id: 5,
    name: "The Core",
    description: "The AI mainframe.",
    recommendedLevel: 30,
    recommendedCP: 11000,
    enemies: { count: 3, rarityRange: [Rarity.LEGENDARY, Rarity.LEGENDARY] },
    rewards: { gold: 3000, xp: 2000 },
    boss: true
  },
  {
    id: 6,
    name: "Deep Net",
    description: "The digital underworld.",
    recommendedLevel: 40,
    recommendedCP: 16000,
    enemies: { count: 3, rarityRange: [Rarity.RARE, Rarity.LEGENDARY] },
    rewards: { gold: 4000, xp: 2500 }
  },
  {
    id: 7,
    name: "Firewall Breach",
    description: "Elite cyber-security protocols.",
    recommendedLevel: 50,
    recommendedCP: 22000,
    enemies: { count: 3, rarityRange: [Rarity.LEGENDARY, Rarity.LEGENDARY] },
    rewards: { gold: 5000, xp: 3500 },
    boss: true
  },
  {
    id: 8,
    name: "System Root",
    description: "Corrupted data flows.",
    recommendedLevel: 60,
    recommendedCP: 30000,
    enemies: { count: 3, rarityRange: [Rarity.LEGENDARY, Rarity.LEGENDARY] },
    rewards: { gold: 7000, xp: 5000 }
  },
  {
    id: 9,
    name: "Admin Tower",
    description: "The throne of the machine god.",
    recommendedLevel: 70,
    recommendedCP: 45000,
    enemies: { count: 3, rarityRange: [Rarity.LEGENDARY, Rarity.LEGENDARY] },
    rewards: { gold: 10000, xp: 8000 }
  },
  {
    id: 10,
    name: "Singularity",
    description: "The end of all things.",
    recommendedLevel: 90,
    recommendedCP: 75000,
    enemies: { count: 3, rarityRange: [Rarity.LEGENDARY, Rarity.LEGENDARY] },
    rewards: { gold: 20000, xp: 15000 },
    boss: true
  }
];

// XP Curve: Level * 100 * 1.15^Level (Slightly flatter curve)
const getXpForNextLevel = (level: number) => Math.floor(100 * Math.pow(1.15, level - 1));

export const calculateBaseStats = (rarity: Rarity, level: number, rank: number, role?: CharacterRole): CharacterStats => {
  const rarityMult = rarity === Rarity.PROMO ? 2.5 : rarity === Rarity.LEGENDARY ? 2.0 : rarity === Rarity.RARE ? 1.5 : 1.0;
  const rankMult = 1 + ((rank - 1) * 0.05); // 5% per rank
  const levelMult = 1 + ((level - 1) * 0.1); // 10% per level

  let baseHp = 1000 * rarityMult;
  let baseAtk = 100 * rarityMult;
  let baseDef = 50 * rarityMult;
  let baseSpeed = 100;

  // Class Multipliers
  if (role === 'VANGUARD') {
      baseHp *= 1.4;
      baseDef *= 1.3;
      baseAtk *= 0.8;
      baseSpeed *= 0.9;
  } else if (role === 'DUELIST') {
      baseAtk *= 1.3;
      baseSpeed *= 1.1;
      baseHp *= 0.9;
  } else if (role === 'OPERATOR') {
      baseSpeed *= 1.15; // Fast to heal
      baseAtk *= 0.7; // Healing scales with ATK usually, but lower base
  } else if (role === 'DEADEYE') {
      baseAtk *= 1.4;
      baseSpeed *= 0.8;
      baseHp *= 0.8;
  }

  return {
    hp: Math.floor(baseHp * levelMult * rankMult),
    maxHp: Math.floor(baseHp * levelMult * rankMult),
    atk: Math.floor(baseAtk * levelMult * rankMult),
    def: Math.floor(baseDef * levelMult * rankMult),
    speed: Math.floor(baseSpeed + (level * 0.5)),
    critRate: 5 + ((rank - 1) * 1) + (role === 'DEADEYE' ? 10 : 0),
    critDmg: 150 + (role === 'DUELIST' ? 20 : 0),
    evasion: role === 'OPERATOR' ? 5 : 0,
    accuracy: role === 'DEADEYE' ? 110 : 100,
    armorPen: role === 'VANGUARD' ? 10 : 0
  };
};

export const calculateWeaponStats = (weapon: Weapon, level: number, rank: number) => {
    // const rarityMult = weapon.rarity === Rarity.LEGENDARY ? 2.0 : weapon.rarity === Rarity.RARE ? 1.5 : 1.0;
    const levelMult = 1 + ((level - 1) * 0.1);
    const rankMult = 1 + ((rank - 1) * 0.05);

    return {
        atk: Math.floor(weapon.stats.atk * levelMult * rankMult),
        critRate: weapon.stats.critRate + (rank - 1),
        armorPen: weapon.stats.armorPen
    };
};

export const calculateComputedStats = (character: Character, inventory: InventoryItem[]): CharacterStats => {
  // If role is missing (legacy save), default to DUELIST
  const role = character.role || 'DUELIST';

  // Recalculate base stats dynamically
  const baseStats = calculateBaseStats(character.rarity, character.level, character.rank || 1, role);

  const stats = { 
      ...baseStats,
      hp: character.stats.hp > 0 ? character.stats.hp : baseStats.maxHp,
      accuracy: baseStats.accuracy,
      evasion: baseStats.evasion,
      armorPen: baseStats.armorPen
  };
  
  // Weapon
  if (character.equippedWeaponId) {
    const weapon = inventory.find(i => i.id === character.equippedWeaponId) as Weapon;
    if (weapon && weapon.stats) {
        // Class Restriction Check
        if (!weapon.restrictedRole || weapon.restrictedRole === character.role) {
            stats.atk += weapon.stats.atk;
            stats.critRate += weapon.stats.critRate;
            stats.armorPen += (weapon.stats.armorPen || 0);
        }
    }
  }

  // Chip
  if (character.equippedChipId) {
      const chip = inventory.find(i => i.id === character.equippedChipId) as ModChip;
      // Chips usually universal, but could support restrictedRole too
      if (chip && (!chip.restrictedRole || chip.restrictedRole === character.role)) {
          if (chip.mainStat) stats[chip.mainStat.type] += chip.mainStat.value;
          if (chip.subStat) stats[chip.subStat.type] += chip.subStat.value;
      }
  }

  // Cosmetic
  if (character.equippedBackgroundId) {
      const cosmetic = inventory.find(i => i.id === character.equippedBackgroundId) as Cosmetic;
      if (cosmetic && cosmetic.statBonus) {
          const type = cosmetic.statBonus.type;
          // Apply significant boosts for cosmetics now
          if (type === 'speed' || type === 'critRate' || type === 'evasion' || type === 'accuracy' || type === 'armorPen') {
               stats[type] += cosmetic.statBonus.value; 
          } else {
               // For scaling stats like ATK/HP, treat value as percentage of base if needed, but for now flat is simpler.
               // Let's assume high flat values generated
               stats[type] += cosmetic.statBonus.value;
          }
      }
  }

  return stats;
};

// Enemy Archetypes
interface EnemyArchetype {
    name: string;
    role: CharacterRole | 'Boss';
    statsMod: { hp: number, atk: number, def: number, speed: number };
    avatarSeed: string;
    skills: { normal: string, skill: string, ult: string };
}

const ENEMY_ARCHETYPES: Record<string, EnemyArchetype> = {
    'flux_rat': {
        name: 'Flux Rat',
        role: 'DUELIST',
        statsMod: { hp: 0.6, atk: 1.1, def: 0.5, speed: 1.1 }, // Fast, fragile
        avatarSeed: 'rat',
        skills: { normal: 'Bite', skill: 'Scurry', ult: 'Swarm Attack' }
    },
    'security_droid': {
        name: 'Sec-Droid',
        role: 'VANGUARD',
        statsMod: { hp: 1.2, atk: 0.8, def: 1.3, speed: 0.8 }, // Tanky, slow
        avatarSeed: 'droid',
        skills: { normal: 'Baton Strike', skill: 'Shield Up', ult: 'Stun Grenade' }
    },
    'cyber_sniper': {
        name: 'Cyber Sniper',
        role: 'DEADEYE',
        statsMod: { hp: 0.7, atk: 1.4, def: 0.6, speed: 1.0 }, // High damage
        avatarSeed: 'sniper',
        skills: { normal: 'Shot', skill: 'Aim', ult: 'Headshot' }
    },
    'iron_hulk': {
        name: 'Iron Hulk',
        role: 'VANGUARD',
        statsMod: { hp: 1.5, atk: 1.0, def: 1.5, speed: 0.6 }, // Very tanky
        avatarSeed: 'hulk',
        skills: { normal: 'Smash', skill: 'Quake', ult: 'Ground Zero' }
    },
    'data_lich': {
        name: 'Data Lich',
        role: 'Boss',
        statsMod: { hp: 2.5, atk: 1.3, def: 1.2, speed: 0.9 }, // Boss stats
        avatarSeed: 'lich',
        skills: { normal: 'Corrupt', skill: 'Life Drain', ult: 'System Failure' }
    }
};

export const createEnemy = (stageLevel: number, isBoss: boolean = false): BattleUnit => {
    const id = crypto.randomUUID();
    let rarity = Rarity.COMMON;
    if (stageLevel > 10) rarity = Rarity.RARE;
    if (stageLevel > 30 || isBoss) rarity = Rarity.LEGENDARY;

    // Pick Archetype
    let typeKey = 'security_droid';
    if (isBoss) {
        typeKey = 'data_lich';
    } else {
        const roll = Math.random();
        if (stageLevel < 5) {
            typeKey = roll > 0.5 ? 'flux_rat' : 'security_droid';
        } else if (stageLevel < 15) {
            typeKey = roll > 0.6 ? 'security_droid' : roll > 0.3 ? 'cyber_sniper' : 'flux_rat';
        } else {
            typeKey = roll > 0.7 ? 'iron_hulk' : roll > 0.4 ? 'cyber_sniper' : 'security_droid';
        }
    }

    const arch = ENEMY_ARCHETYPES[typeKey];
    const role: CharacterRole = arch.role === 'Boss' ? 'DEADEYE' : arch.role as CharacterRole;

    const baseStats = calculateBaseStats(rarity, stageLevel, 1, role);
    
    // Apply Archetype Modifiers
    const stats: CharacterStats = {
        ...baseStats,
        hp: Math.floor(baseStats.hp * arch.statsMod.hp),
        maxHp: Math.floor(baseStats.maxHp * arch.statsMod.hp),
        atk: Math.floor(baseStats.atk * arch.statsMod.atk),
        def: Math.floor(baseStats.def * arch.statsMod.def),
        speed: Math.floor(baseStats.speed * arch.statsMod.speed),
        armorPen: 0
    };

    if (stageLevel === 1 && stats.speed > 100) stats.speed = 95;

    const elements = [ElementType.PYRO, ElementType.HYDRO, ElementType.DENDRO, ElementType.ELECTRO, ElementType.CRYO];
    const el = elements[Math.floor(Math.random() * elements.length)];

    let maxStability = 2;
    if (role === 'VANGUARD') maxStability = 3;
    if (isBoss) maxStability = 5;

    return {
        id,
        name: isBoss ? `BOSS: ${arch.name}` : `${arch.name} v${stageLevel}`,
        title: arch.role,
        role: role,
        description: 'Hostile Entity',
        rarity,
        element: el,
        level: stageLevel,
        xp: 0,
        maxXp: 0,
        rank: 1,
        stats,
        computedStats: stats,
        imageUrl: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${arch.avatarSeed}${id}&backgroundColor=${isBoss ? 'ff0000' : 'transparent'}`,
        skills: {
            normal: { name: arch.skills.normal, description: 'Attack', multiplier: 1, cooldown: 0 },
            skill: { name: arch.skills.skill, description: 'Skill', multiplier: 1.2, cooldown: 3, isAOE: arch.role === 'Boss' },
            ultimate: { name: arch.skills.ult, description: 'Ultimate', multiplier: 1.8, cooldown: 5, isAOE: arch.role === 'Boss' || arch.name === 'Iron Hulk' }
        },
        type: 'character',
        value: 0,
        currentTurnMeter: 0,
        effects: [],
        isEnemy: true,
        cooldowns: { skill: 0, ultimate: 0 },
        stability: maxStability,
        maxStability,
        isStunned: false
    };
};

export const calculateDamage = (attacker: BattleUnit, defender: BattleUnit, skill: Skill, weapon?: Weapon): { damage: number, isCrit: boolean, type: 'normal' | 'crit' | 'heal' | 'miss' | 'weak' | 'resist', stabilityDamage: number } => {
    // Healing logic
    if (skill.isHeal) {
        // Healing scales with ATK usually
        const healAmount = Math.floor(attacker.computedStats.atk * skill.multiplier);
        return { damage: healAmount, isCrit: false, type: 'heal', stabilityDamage: 0 };
    }

    // Hit Check
    const attackerAcc = attacker.computedStats?.accuracy || 100;
    const defenderEva = defender.computedStats?.evasion || 0;
    
    const hitChance = (attackerAcc - defenderEva) / 100;
    if (Math.random() > hitChance) {
        return { damage: 0, isCrit: false, type: 'miss', stabilityDamage: 0 };
    }

    // Crit Check
    const critChance = (attacker.computedStats?.critRate || 5) / 100;
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? (attacker.computedStats?.critDmg || 150) / 100 : 1.0;

    // Element Check (2.0x for Weakness, 0.5x for Resist)
    let elementMult = 1.0;
    let type: 'normal' | 'crit' | 'heal' | 'miss' | 'weak' | 'resist' = isCrit ? 'crit' : 'normal';

    const el = attacker.element;
    const targetEl = defender.element;
    
    if (el === ElementType.PYRO && targetEl === ElementType.DENDRO) elementMult = 2.0;
    else if (el === ElementType.DENDRO && targetEl === ElementType.HYDRO) elementMult = 2.0;
    else if (el === ElementType.HYDRO && targetEl === ElementType.PYRO) elementMult = 2.0;
    else if (el === ElementType.ELECTRO && targetEl === ElementType.CRYO) elementMult = 2.0;
    else if (el === ElementType.CRYO && targetEl === ElementType.ELECTRO) elementMult = 2.0;
    
    // Resists
    else if (el === ElementType.DENDRO && targetEl === ElementType.PYRO) elementMult = 0.5;
    else if (el === ElementType.HYDRO && targetEl === ElementType.DENDRO) elementMult = 0.5;
    else if (el === ElementType.PYRO && targetEl === ElementType.HYDRO) elementMult = 0.5;
    
    if (elementMult > 1) type = 'weak';
    if (elementMult < 1) type = 'resist';

    let stabilityDamage = elementMult > 1 ? 2 : 1;
    if (isCrit) stabilityDamage += 0.5;

    const overloadMult = defender.isStunned ? 1.5 : 1.0;

    const def = defender.computedStats?.def || 0;
    const pen = attacker.computedStats?.armorPen || 0;
    const effectiveDef = Math.max(0, def * (1 - (pen / 100)));
    
    const defMitigation = 100 / (100 + effectiveDef);
    
    let rawDamage = attacker.computedStats.atk * skill.multiplier * critMult * elementMult * overloadMult;
    let finalDamage = Math.floor(rawDamage * defMitigation);
    finalDamage = Math.max(1, finalDamage); 

    return { damage: finalDamage, isCrit, type, stabilityDamage };
};

export const calculateBattleRewards = (stageId: number): BattleRewards => {
    const stage = CAMPAIGN_STAGES.find(s => s.id === stageId);
    if (!stage) return { gold: 50, xp: 20 };
    
    const variance = 0.8 + Math.random() * 0.4;
    
    const rewards: BattleRewards = {
        gold: Math.floor(stage.rewards.gold * variance),
        xp: Math.floor(stage.rewards.xp * variance),
        gems: stage.boss ? 50 : 0,
        items: []
    };

    const dropChance = stage.boss ? 0.3 : 0.1;
    if (Math.random() < dropChance) {
        const rarity = stage.id > 3 ? Rarity.RARE : Rarity.COMMON;
        const typeRoll = Math.random();
        
        let newItem: InventoryItem;
        const id = crypto.randomUUID();

        if (typeRoll < 0.6) {
             newItem = {
                 id,
                 name: `Dropped Weapon`,
                 type: 'weapon',
                 rarity,
                 description: "Salvaged from battle",
                 level: 1, xp: 0, maxXp: 100, rank: 1, value: 50,
                 isNew: true,
                 stats: { atk: 15 * rarity, critRate: rarity, armorPen: 0 }
             } as Weapon;
        } else {
             newItem = {
                 id,
                 name: `Salvaged Chip`,
                 type: 'chip',
                 rarity,
                 description: "Salvaged from battle",
                 level: 1, xp: 0, maxXp: 100, rank: 1, value: 50,
                 isNew: true,
                 mainStat: { type: 'hp', value: 50 * rarity }
             } as ModChip;
        }
        rewards.items?.push(newItem);
    }

    return rewards;
};

export const generateQuests = (count: number): Quest[] => {
    const quests: Quest[] = [];
    const titles = ["Patrol Sector 7", "Retrieve Data Chip", "Escort VIP", "Eliminate Cyber-Rats", "Hack Server Node"];
    const elements = [ElementType.PYRO, ElementType.HYDRO, ElementType.DENDRO, ElementType.ELECTRO, ElementType.CRYO];

    for (let i = 0; i < count; i++) {
        const duration = 60 + Math.floor(Math.random() * 300); // 1-6 mins
        quests.push({
            id: crypto.randomUUID(),
            title: titles[Math.floor(Math.random() * titles.length)],
            description: "Complete the objective to earn rewards.",
            duration,
            reward: {
                gold: 100 + Math.floor(Math.random() * 200),
                gems: Math.random() > 0.8 ? 10 : 0
            },
            requirements: {
                partySize: 1 + Math.floor(Math.random() * 2), // 1-3
                minLevel: Math.floor(Math.random() * 5) + 1,
                requiredElement: Math.random() > 0.7 ? elements[Math.floor(Math.random() * elements.length)] : undefined
            },
            status: 'available',
            assignedCharacterIds: []
        });
    }
    return quests;
};

export const refreshShop = (hasBoughtFirstGold: boolean): ShopItem[] => {
    const items: ShopItem[] = [];
    
    // Starter Gold
    if (!hasBoughtFirstGold) {
        items.push({
            id: 'starter-gold',
            item: { type: 'resource', resource: 'gold', amount: 10000 },
            cost: 0,
            currency: 'gems',
            soldOut: false
        });
    }
    
    // Featured Item Logic
    const rRoll = Math.random();
    let featuredItem: ShopItem;

    if (hasBoughtFirstGold) {
        if (rRoll > 0.98) { // 2% chance for Legendary Featured (Was 5-10%)
            featuredItem = {
                id: crypto.randomUUID(),
                item: { type: 'resource', resource: 'gold', amount: 50000 },
                cost: 1500, // True Legendary Price
                currency: 'gems',
                soldOut: false
            };
        } else if (rRoll > 0.8) { // 18% Epic
             featuredItem = {
                id: crypto.randomUUID(),
                item: { type: 'resource', resource: 'gold', amount: 20000 },
                cost: 800, 
                currency: 'gems',
                soldOut: false
            };
        } else {
             // Mostly Rare/Common deals
             featuredItem = {
                id: crypto.randomUUID(),
                item: { type: 'resource', resource: 'gold', amount: 5000 },
                cost: 200, 
                currency: 'gems',
                soldOut: false
            };
        }
        items.push(featuredItem);
    } else {
        items.push({
            id: crypto.randomUUID(),
            item: { type: 'resource', resource: 'gold', amount: 5000 },
            cost: 200, 
            currency: 'gems',
            soldOut: false
        });
    }

    // Random Items Logic
    for (let i = 0; i < 6; i++) {
        const rRoll = Math.random();
        // Reduced Legendary chance in standard pool to 2%
        const rarity = rRoll > 0.98 ? Rarity.LEGENDARY : rRoll > 0.7 ? Rarity.RARE : Rarity.COMMON;
        
        const typeRoll = Math.random();
        let item: InventoryItem;

        // Weapon Generation
        if (typeRoll < 0.4) {
             const isHealerWeapon = Math.random() < 0.1;
             item = {
                 id: crypto.randomUUID(),
                 name: rarity === Rarity.LEGENDARY ? (isHealerWeapon ? "Nanite Injector" : "Prototype Railgun") : "Standard Rifle",
                 type: 'weapon',
                 rarity,
                 description: isHealerWeapon ? "Advanced medical tech." : "Combat ready.",
                 level: 1, xp: 0, maxXp: 100, rank: 1, value: 0,
                 restrictedRole: isHealerWeapon ? 'OPERATOR' : undefined,
                 stats: { 
                     atk: (isHealerWeapon ? 10 : 30) * rarity, 
                     critRate: isHealerWeapon ? 0 : rarity * 2, 
                     armorPen: rarity === Rarity.LEGENDARY ? 10 : 0 
                 }
             } as Weapon;
        } else if (typeRoll < 0.7) {
            // Chip
             item = {
                 id: crypto.randomUUID(),
                 name: "Market Chip",
                 type: 'chip',
                 rarity,
                 description: "Bought from shop",
                 level: 1, xp: 0, maxXp: 100, rank: 1, value: 0,
                 mainStat: { type: 'atk', value: 8 * rarity }
             } as ModChip;
        } else {
             // Cosmetics - Now more valuable
             const styles = ['bg-gradient-to-r from-pink-500 to-yellow-500', 'bg-gradient-to-br from-blue-400 to-green-300', 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black', 'bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-yellow-200 via-emerald-200 to-yellow-200'];
             item = {
                 id: crypto.randomUUID(),
                 name: "Holo-Style",
                 type: 'cosmetic',
                 rarity,
                 description: "Visual Upgrade",
                 level: 1, xp: 0, maxXp: 100, rank: 1, value: 0,
                 style: styles[Math.floor(Math.random() * styles.length)],
                 statBonus: { type: 'speed', value: 5 * rarity } // +5 speed per rarity
             } as Cosmetic;
        }

        let cost = 500;
        let currency: 'gold' | 'gems' = 'gold';

        // PRICING RULES
        if (rarity === Rarity.LEGENDARY) {
            cost = 1500; // Increased to 1500
            currency = 'gems';
        } else if (rarity === Rarity.RARE) {
            cost = 1500;
            currency = 'gold';
        }

        items.push({
            id: crypto.randomUUID(),
            item,
            cost,
            currency,
            soldOut: false
        });
    }

    return items;
};

export const getFodderXp = (item: InventoryItem): number => {
    let base = 100;
    if (item.rarity === Rarity.RARE) base = 300;
    if (item.rarity === Rarity.LEGENDARY) base = 1000;
    if (item.rarity === Rarity.PROMO) base = 5000;
    return base + (item.xp / 2);
};

export const simulateUpgrade = (target: InventoryItem, materials: InventoryItem[]): UpgradeResult => {
    let totalXp = target.xp;
    let currentLevel = target.level;
    let currentMaxXp = target.maxXp;
    let levelsGained = 0;

    materials.forEach(mat => {
        totalXp += getFodderXp(mat);
    });

    while (totalXp >= currentMaxXp) {
        totalXp -= currentMaxXp;
        currentLevel++;
        levelsGained++;
        currentMaxXp = getXpForNextLevel(currentLevel);
    }

    let newStats: CharacterStats | undefined;
    let weaponStats: { atk: number, critRate: number } | undefined;

    if (target.type === 'character') {
        const t = target as Character;
        newStats = calculateBaseStats(target.rarity, currentLevel, target.rank || 1, t.role);
    } else if (target.type === 'weapon') {
        weaponStats = calculateWeaponStats(target as Weapon, currentLevel, target.rank || 1);
    }

    return {
        newLevel: currentLevel,
        newXp: totalXp,
        newMaxXp: currentMaxXp,
        newStats,
        weaponStats,
        levelsGained
    };
};

export const calculateRankBonus = (rank: number) => {
    return (rank - 1) * 5; 
}

export const ETOVO_CHAR: Character = {
    id: 'etovo-promo',
    type: 'character',
    name: 'Etovo',
    title: 'Glitch Architect',
    role: 'DEADEYE',
    description: 'A reality-bending anomaly from the system core.',
    rarity: Rarity.PROMO,
    element: ElementType.ELECTRO,
    level: 1, xp: 0, maxXp: 100, rank: 1, value: 0,
    imageUrl: 'https://imgur.com/a/haMSNhS', // Fallback handled in component if broken
    stats: calculateBaseStats(Rarity.PROMO, 1, 1, 'DEADEYE'),
    skills: {
        normal: { name: 'Syntax Error', description: 'Deals randomized damage.', multiplier: 1.2, cooldown: 0 },
        skill: { name: 'Code Inject', description: 'Massive AOE Damage.', multiplier: 2.0, cooldown: 3, isAOE: true },
        ultimate: { name: 'SYSTEM RESET', description: 'Obliterates all enemies.', multiplier: 5.0, cooldown: 5, isAOE: true }
    }
};

export const performPull = async (pityCounter: number): Promise<{ item: InventoryItem, pityReset: boolean }> => {
  const isPity = pityCounter >= 89;
  const roll = Math.random() * 100;
  
  let rarity = Rarity.COMMON;
  let pityReset = false;

  if (isPity || roll < 0.6) {
    rarity = Rarity.LEGENDARY;
    pityReset = true;
  } else if (roll < 5.0) {
    rarity = Rarity.RARE;
  } else {
    rarity = Rarity.COMMON;
  }

  const typeRoll = Math.random();
  let type: 'character' | 'weapon' | 'chip' | 'cosmetic' = 'character';
  
  if (typeRoll < 0.4) type = 'character';
  else if (typeRoll < 0.7) type = 'weapon';
  else if (typeRoll < 0.9) type = 'chip';
  else type = 'cosmetic';

  if (rarity === Rarity.LEGENDARY && type !== 'character' && Math.random() < 0.5) {
      type = 'character';
  }

  const id = crypto.randomUUID();
  let newItem: any = {
      id,
      rarity,
      type,
      level: 1,
      xp: 0,
      maxXp: getXpForNextLevel(1),
      rank: 1,
      value: rarity * 100,
      isNew: true
  };

  if (type === 'character') {
      const elements = [ElementType.PYRO, ElementType.HYDRO, ElementType.DENDRO, ElementType.ELECTRO, ElementType.CRYO];
      const el = elements[Math.floor(Math.random() * elements.length)];
      
      const roles: CharacterRole[] = ['VANGUARD', 'DUELIST', 'OPERATOR', 'DEADEYE'];
      const role = roles[Math.floor(Math.random() * roles.length)];

      const lore = await generateCharacterLore(rarity, el, role);
      
      const stats = calculateBaseStats(rarity, 1, 1, role);
      
      const isHeal = role === 'OPERATOR';
      const isAOE = role === 'DEADEYE';

      newItem = {
          ...newItem,
          name: lore.name,
          title: lore.title,
          description: lore.description,
          element: el,
          role: role,
          stats,
          imageUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${lore.name}&backgroundColor=${rarity === Rarity.LEGENDARY ? 'ffd5dc' : 'b6e3f4'}`,
          skills: {
              normal: { name: lore.skillNames.normal || 'Attack', description: 'Basic attack', multiplier: 1, cooldown: 0 },
              skill: { name: lore.skillNames.skill || 'Skill', description: 'Special move', multiplier: isHeal ? 2.5 : 1.5, cooldown: 3, isAOE: false, isHeal },
              ultimate: { name: lore.skillNames.ultimate || 'Ultimate', description: lore.skillNames.ultimateDesc || 'Ultimate move', multiplier: isHeal ? 4.0 : 3.0, cooldown: 5, isAOE: isAOE || isHeal, isHeal }
          }
      };
  } else if (type === 'weapon') {
      const lore = await generateWeaponLore(rarity);
      const isHealer = Math.random() < 0.1; // 10% chance for Healer weapon
      newItem = {
          ...newItem,
          name: isHealer ? "Medi-System" : lore.name,
          description: isHealer ? "Life support gear." : lore.description,
          restrictedRole: isHealer ? 'OPERATOR' : undefined,
          stats: {
              atk: (isHealer ? 10 : 50) * rarity,
              critRate: isHealer ? 0 : 2 * rarity,
              armorPen: 0
          }
      };
  } else if (type === 'chip') {
      const statsKeys: (keyof CharacterStats)[] = ['atk', 'def', 'speed', 'critRate', 'maxHp'];
      const mainStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];
      newItem = {
          ...newItem,
          name: `${mainStat.toUpperCase()} Chip v${rarity}.0`,
          description: `Enhances ${mainStat}`,
          mainStat: { type: mainStat, value: 10 * rarity },
      };
  } else {
      const styles = ['bg-gradient-to-r from-pink-500 to-yellow-500', 'bg-gradient-to-br from-blue-400 to-green-300', 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black'];
      newItem = {
          ...newItem,
          name: "Street Style",
          description: "Visual Upgrade",
          style: styles[Math.floor(Math.random() * styles.length)],
          statBonus: { type: 'speed', value: 5 * rarity }
      };
  }

  return { item: newItem, pityReset };
};