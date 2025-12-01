
export enum Rarity {
  COMMON = 3,
  RARE = 4,
  LEGENDARY = 5,
  PROMO = 6,
}

export enum ElementType {
  PYRO = 'Pyro',
  HYDRO = 'Hydro',
  DENDRO = 'Dendro',
  ELECTRO = 'Electro',
  CRYO = 'Cryo',
}

export type CharacterRole = 'VANGUARD' | 'DUELIST' | 'OPERATOR' | 'DEADEYE';

export type ItemType = 'character' | 'weapon' | 'cosmetic' | 'chip';

export interface BaseItem {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  isNew?: boolean;
  type: ItemType;
  value: number; // Gold value
  level: number;
  xp: number;
  maxXp: number;
  rank: number; // Refinement Rank (1-5)
  restrictedRole?: CharacterRole; // Only usable by specific class
}

export interface Weapon extends BaseItem {
  type: 'weapon';
  stats: {
    atk: number;
    critRate: number; // Percentage
    armorPen: number; // Percentage
  };
  bonusStat?: { type: keyof CharacterStats, value: number }; // New Sub-stat
  icon?: string;
}

export interface ModChip extends BaseItem {
  type: 'chip';
  mainStat: { type: keyof CharacterStats, value: number };
  subStat?: { type: keyof CharacterStats, value: number };
}

export interface Cosmetic extends BaseItem {
  type: 'cosmetic';
  style: string; // CSS background value
  statBonus: { type: keyof CharacterStats, value: number };
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number; // %
  critDmg: number; // % (Base 150)
  evasion: number; // %
  accuracy: number; // % (Base 100)
  armorPen: number; // %
}

export interface Skill {
  name: string;
  description: string;
  multiplier: number; // e.g. 1.5 for 150%
  isAOE?: boolean;
  isHeal?: boolean;
  cooldown: number; // Max cooldown turns
}

export interface Character extends BaseItem {
  type: 'character';
  role: CharacterRole;
  title: string;
  element: ElementType;
  stats: CharacterStats;
  imageUrl: string;
  skills: {
    normal: Skill;
    skill: Skill;
    ultimate: Skill;
  };
  equippedWeaponId?: string;
  equippedBackgroundId?: string;
  equippedChipId?: string;
}

export type InventoryItem = Character | Weapon | Cosmetic | ModChip;

export interface QuestRequirement {
  minLevel?: number;
  requiredElement?: ElementType;
  partySize: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  reward: {
    gold: number;
    gems: number;
  };
  requirements: QuestRequirement;
  status: 'available' | 'active' | 'completed';
  startTime?: number;
  assignedCharacterIds: string[];
}

export type ShopItemContent = InventoryItem | { type: 'resource', resource: 'gems' | 'gold', amount: number };

export interface ShopItem {
  id: string;
  item: ShopItemContent;
  cost: number;
  currency: 'gold' | 'gems';
  soldOut: boolean;
}

export interface GameState {
  inventory: InventoryItem[];
  team: string[]; // IDs of 3 selected characters
  gems: number;
  gold: number;
  pityCounter: number; // For 5* guarantee
  quests: Quest[];
  shopStock: ShopItem[];
  lastFreeShopRefresh: number;
  hasBoughtFirstGold: boolean; // Economy Control
  username: string;
  level: number; // Player Account Level
  maxStageUnlocked: number; 
  clearedStages: Record<number, number>; // Stage ID -> Stars (1-3)
  campaignStage: number;
  rosterFilter?: ElementType | 'ALL';
  rosterSort?: 'LEVEL' | 'RARITY' | 'RANK';
  redeemedCodes?: string[];
  bankStock: Record<string, boolean>; // Tracks if a bank pack (by ID/Index) is sold out
}

export enum ViewState {
  HOME = 'HOME',
  GACHA = 'GACHA',
  ROSTER = 'ROSTER',
  BATTLE_PREP = 'BATTLE_PREP',
  CAMPAIGN = 'CAMPAIGN',
  BATTLE = 'BATTLE',
  QUESTS = 'QUESTS',
  SHOP = 'SHOP',
  PROFILE = 'PROFILE',
  EVENT = 'EVENT',
}

// Battle Types
export interface BattleUnit extends Character {
  currentTurnMeter: number;
  effects: BattleEffect[];
  isEnemy: boolean;
  computedStats: CharacterStats; // Final stats after equipment logic
  cooldowns: {
      skill: number;
      ultimate: number;
  };
  stability: number;
  maxStability: number;
  isStunned: boolean;
  consecutiveStuns: number; // Track how many times they've been stunned in a row
  isImmuneToBreak: boolean; // Grace period flag
}

export interface BattleEffect {
  id: string;
  name: string; // e.g., "Stun", "Attack Up"
  duration: number; // turns
  type: 'buff' | 'debuff';
}

export interface BattleLog {
  id: string;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'kill' | 'miss';
}

export interface DamagePopup {
  id: string;
  targetId: string;
  value: string | number;
  x: number;
  y: number;
  type: 'normal' | 'crit' | 'heal' | 'miss' | 'weak' | 'resist';
}

export interface UpgradeResult {
    newLevel: number;
    newXp: number;
    newMaxXp: number;
    newStats?: CharacterStats; 
    weaponStats?: { atk: number, critRate: number };
    levelsGained: number;
}

export interface BattleRewards {
    gold: number;
    xp: number;
    gems?: number;
    items?: InventoryItem[];
}

export interface CampaignStage {
    id: number;
    name: string;
    description: string;
    recommendedLevel: number;
    recommendedCP: number;
    enemies: { count: number, rarityRange: [Rarity, Rarity] };
    rewards: { gold: number, xp: number };
    boss?: boolean;
}

export interface Profile {
  gameState: GameState;
  timestamp: number;
}

export interface UpgradePreview {
    newLevel: number;
    newXp: number;
    newMaxXp: number;
    statsDiff: Partial<CharacterStats>;
}
