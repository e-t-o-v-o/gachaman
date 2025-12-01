
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { GameState, ViewState, Character, Rarity, ElementType, Quest, InventoryItem, ShopItem, CharacterStats, BattleRewards, Weapon, Cosmetic, ModChip } from './types';
import GachaScene from './components/GachaScene';
import BattleArena from './components/BattleArena';
import Card from './components/Card';
import QuestBoard from './components/QuestBoard';
import CharacterDetail from './components/CharacterDetail';
import Shop from './components/Shop';
import CampaignMap from './components/CampaignMap';
import AlienEvent from './components/AlienEvent';
import { generateQuests, refreshShop, calculateComputedStats, simulateUpgrade, calculateBaseStats, calculateWeaponStats, ETOVO_CHAR, ALIEN_ETOVO_CHAR } from './services/gameLogic';
import { Coins, Hexagon, ShieldCheck, User, Play, Menu, ShoppingBag, CreditCard, X, Info, Settings, Save, Download, Upload, Diamond, CheckCircle, HelpCircle, Shield, Sword, Cross, Crosshair, Zap, Eye, Gauge, Keyboard, Star, BarChart3, Fingerprint, Crown, Heart, Cpu, Sparkles, Activity, AlertTriangle, Trophy } from 'lucide-react';

const INITIAL_STATE: GameState = {
  inventory: [],
  team: [],
  gems: 320, 
  gold: 5000, 
  pityCounter: 0,
  quests: [],
  shopStock: [],
  lastFreeShopRefresh: 0,
  hasBoughtFirstGold: false,
  username: "Player",
  level: 1,
  maxStageUnlocked: 1,
  clearedStages: {},
  campaignStage: 1,
  redeemedCodes: [],
  bankStock: {}
};

const STARTER_CHAR: Character = {
  id: 'starter-1',
  type: 'character',
  name: 'Guy',
  title: 'You Like This Weiner?',
  role: 'OPERATOR',
  description: 'A mystical processed meat entity with enchanting moves.',
  rarity: Rarity.LEGENDARY,
  element: ElementType.PYRO,
  level: 1,
  xp: 0,
  maxXp: 100,
  rank: 1,
  stats: { 
      hp: 1800, maxHp: 1800, atk: 90, def: 80, speed: 120, 
      critRate: 10, critDmg: 150, evasion: 15, accuracy: 100, armorPen: 0 
  },
  imageUrl: 'https://i.imgur.com/aHYGLpP.gif',
  skills: { 
      normal: { name: 'Casing Slap', description: 'Slaps enemy with meat casing.', multiplier: 1.0, cooldown: 0 }, 
      skill: { name: 'Hot Dog Water', description: 'Heals allies with savory broth.', multiplier: 2.0, cooldown: 3, isHeal: true, isAOE: true }, 
      ultimate: { name: 'GLIZZY OVERLOAD', description: 'Hypnotic dance that confuses enemies.', multiplier: 3.5, cooldown: 5, isAOE: true } 
  },
  value: 0
};

const SAVE_KEY = 'aether_chronicles_save_v2';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [showBank, setShowBank] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [importString, setImportString] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<ElementType | 'ALL'>('ALL');
  const [rosterTypeFilter, setRosterTypeFilter] = useState<'character' | 'weapon' | 'chip'>('character');
  const [rosterSort, setRosterSort] = useState<'LEVEL' | 'RARITY' | 'RANK'>('LEVEL');
  const [showGuide, setShowGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'basics' | 'classes' | 'stats' | 'combat' | 'upgrades' | 'credits'>('basics');
  const [creditCardDeclined, setCreditCardDeclined] = useState(false);
  
  // Fanfare State
  const [redeemedItem, setRedeemedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setGameState({ ...INITIAL_STATE, ...parsed }); 
          } catch (e) {
              console.error("Failed to load save", e);
          }
      } else {
        setGameState(prev => ({
            ...prev,
            inventory: [STARTER_CHAR],
            team: [STARTER_CHAR.id],
            shopStock: refreshShop(false),
            lastFreeShopRefresh: Date.now(),
            quests: generateQuests(5)
        }));
      }
      setHasLoaded(true);
  }, []);

  useEffect(() => {
      if (hasLoaded) {
          localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      }
  }, [gameState, hasLoaded]);

  const isCharacterBusy = (id: string) => {
      return gameState.quests.some(q => q.status === 'active' && q.assignedCharacterIds.includes(id));
  };

  const handlePullComplete = (newItems: InventoryItem[], cost: number) => {
    setGameState(prev => ({
      ...prev,
      gems: prev.gems - cost,
      inventory: [...prev.inventory, ...newItems],
      pityCounter: prev.pityCounter + newItems.length 
    }));
  };

  const toggleTeamMember = (id: string) => {
    if (isCharacterBusy(id)) {
        alert("This agent is currently deployed on a mission!");
        return;
    }

    setGameState(prev => {
      const isSelected = prev.team.includes(id);
      if (isSelected) {
        if (prev.team.length === 1) return prev;
        return { ...prev, team: prev.team.filter(tid => tid !== id) };
      } else {
        if (prev.team.length >= 3) return prev;
        return { ...prev, team: [...prev.team, id] };
      }
    });
  };

  const handleEquip = (charId: string, itemId: string, slot: 'weapon' | 'background' | 'chip') => {
      setGameState(prev => {
          const previousOwner = prev.inventory.find(i => 
              i.type === 'character' && (
                  (slot === 'weapon' && (i as Character).equippedWeaponId === itemId) ||
                  (slot === 'background' && (i as Character).equippedBackgroundId === itemId) ||
                  (slot === 'chip' && (i as Character).equippedChipId === itemId)
              )
          ) as Character | undefined;

          const newInventory = prev.inventory.map(item => {
              if (item.type !== 'character') return item;
              
              let char = { ...item } as Character;

              if (previousOwner && char.id === previousOwner.id) {
                  if (slot === 'weapon') delete char.equippedWeaponId;
                  if (slot === 'background') delete char.equippedBackgroundId;
                  if (slot === 'chip') delete char.equippedChipId;
              }

              if (char.id === charId) {
                  if (slot === 'weapon') char.equippedWeaponId = itemId;
                  if (slot === 'background') char.equippedBackgroundId = itemId;
                  if (slot === 'chip') char.equippedChipId = itemId;
              }

              return char;
          });

          const updatedChar = newInventory.find(i => i.id === charId) as Character;
          if (selectedItemDetail?.id === charId) {
              setSelectedItemDetail(updatedChar);
          }

          return { ...prev, inventory: newInventory };
      });
  };

  const handleUpgrade = (targetId: string, materialIds: string[]) => {
      setGameState(prev => {
          const target = prev.inventory.find(i => i.id === targetId);
          if (!target) return prev;

          const materials = prev.inventory.filter(i => materialIds.includes(i.id));
          
          const isRefinement = materials.length === 1 && materials[0].name === target.name && materials[0].rarity === target.rarity;
          
          let updatedTarget = { ...target };
          
          if (isRefinement) {
             const newRank = (target.rank || 1) + 1;
             updatedTarget.rank = newRank;
             
             if (target.type === 'character') {
                 updatedTarget.stats = calculateBaseStats(target.rarity, target.level, newRank, (target as Character).role);
             } else if (target.type === 'weapon') {
                 (updatedTarget as Weapon).stats = calculateWeaponStats(target as Weapon, target.level, newRank);
             }
          } else {
              const result = simulateUpgrade(target, materials);
              updatedTarget.level = result.newLevel;
              updatedTarget.xp = result.newXp;
              updatedTarget.maxXp = result.newMaxXp;
              
              if (updatedTarget.type === 'character' && result.newStats) {
                  (updatedTarget as Character).stats = result.newStats;
              } else if (updatedTarget.type === 'weapon' && result.weaponStats) {
                  (updatedTarget as Weapon).stats = { ...result.weaponStats, armorPen: (target as Weapon).stats.armorPen };
              }
          }

          const remainingInventory = prev.inventory.filter(i => !materialIds.includes(i.id));
          const finalInventory = remainingInventory.map(i => i.id === targetId ? updatedTarget : i);
          
          if (selectedItemDetail?.id === targetId) setSelectedItemDetail(updatedTarget as Character);

          return { ...prev, inventory: finalInventory };
      });
  };

  const handleShopPurchase = (shopItem: ShopItem) => {
      setGameState(prev => {
          const newGold = shopItem.currency === 'gold' ? prev.gold - shopItem.cost : prev.gold;
          const newGems = shopItem.currency === 'gems' ? prev.gems - shopItem.cost : prev.gems;
          
          let newInventory = [...prev.inventory];
          let addedGold = 0;
          let boughtGoldPack = false;

          const item = shopItem.item;
          if ('type' in item && item.type === 'resource') {
              if (item.resource === 'gold') {
                  addedGold = item.amount;
                  boughtGoldPack = true;
              }
          } else {
              newInventory.push(item as InventoryItem);
          }

          const newStock = prev.shopStock.map(s => s.id === shopItem.id ? { ...s, soldOut: true } : s);

          return {
              ...prev,
              gold: newGold + addedGold,
              gems: newGems,
              inventory: newInventory,
              shopStock: newStock,
              hasBoughtFirstGold: boughtGoldPack ? true : prev.hasBoughtFirstGold
          };
      });
  };

  const handleShopRefresh = (paid: boolean) => {
      if (paid) {
          setGameState(prev => ({
              ...prev,
              gems: prev.gems - 200,
              shopStock: refreshShop(prev.hasBoughtFirstGold)
          }));
      } else {
          setGameState(prev => ({
              ...prev,
              shopStock: refreshShop(prev.hasBoughtFirstGold),
              lastFreeShopRefresh: Date.now()
          }));
      }
  };

  const handleStartQuest = (questId: string, characterIds: string[]) => {
      setGameState(prev => {
          return {
              ...prev,
              quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'active', startTime: Date.now(), assignedCharacterIds: characterIds } : q)
          };
      });
  };

  const handleCancelQuest = (questId: string) => {
      setGameState(prev => ({
          ...prev,
          quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'available', assignedCharacterIds: [], startTime: undefined } : q)
      }));
  };

  const handleClaimQuest = (questId: string) => {
       setGameState(prev => {
           const q = prev.quests.find(x => x.id === questId);
           if(!q) return prev;
           return {
               ...prev, 
               gold: prev.gold + q.reward.gold, 
               gems: prev.gems + q.reward.gems, 
               quests: prev.quests.map(x => x.id === questId ? {...x, status: 'completed', assignedCharacterIds: []} : x)
            };
       });
  };

  const handleClaimAllQuests = (questId: string) => {
      handleClaimQuest(questId);
  }

  const handleBuyGems = (id: string, totalAmount: number, cost: number, isWhalePack: boolean = false) => {
      if (gameState.bankStock[id]) return;

      if (isWhalePack) {
          setCreditCardDeclined(true);
          setGameState(prev => ({
              ...prev,
              bankStock: { ...prev.bankStock, [id]: true }
          }));
          return;
      }

      setGameState(prev => ({ 
          ...prev, 
          gems: prev.gems + totalAmount,
          bankStock: { ...prev.bankStock, [id]: true }
      }));
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
  };

  const handleImportSave = () => {
      try {
          const data = atob(importString);
          const parsed = JSON.parse(data);
          setGameState(parsed);
          setShowProfile(false);
          alert("Save Imported Successfully!");
      } catch (e) {
          alert("Invalid Save String");
      }
  };

  const handleRedeemCode = () => {
      const code = promoCodeInput.trim().toLowerCase();
      if (gameState.redeemedCodes?.includes(code)) {
          alert("Code already redeemed!");
          return;
      }
      
      if (code === 'etovo') {
          const newItem = { ...ETOVO_CHAR, id: `etovo-${Date.now()}`, isNew: true };
          setGameState(prev => ({
              ...prev,
              inventory: [...prev.inventory, newItem],
              redeemedCodes: [...(prev.redeemedCodes || []), code]
          }));
          setPromoCodeInput("");
          setShowProfile(false);
          setRedeemedItem(newItem);
      } else {
          alert("Invalid Code");
      }
  };

  const handleEventVictory = () => {
      const newItem = { ...ALIEN_ETOVO_CHAR, id: `alien-etovo-${Date.now()}`, isNew: true };
      setGameState(prev => ({
          ...prev,
          inventory: [...prev.inventory, newItem]
      }));
      setView(ViewState.HOME);
      setRedeemedItem(newItem);
  };

  const startBattle = (stageId: number) => {
      setActiveStageId(stageId);
      const activeTeamIds = gameState.team.filter(id => !isCharacterBusy(id));
      if (activeTeamIds.length < gameState.team.length) {
          const proceed = window.confirm("Some team members are busy on missions. Proceed with reduced squad?");
          if (!proceed) return;
          if (activeTeamIds.length === 0) {
              alert("No agents available!");
              return;
          }
      }
      setView(ViewState.BATTLE);
  };

  const handleBattleEnd = (result: { win: boolean, rewards?: BattleRewards }) => {
      if (result.win && result.rewards) {
          setGameState(prev => {
              const maxStage = Math.max(prev.maxStageUnlocked, activeStageId + 1);
              const cleared = { ...prev.clearedStages, [activeStageId]: 3 };
              
              const newInventory = [...prev.inventory];
              if (result.rewards?.items) {
                  newInventory.push(...result.rewards.items);
              }

              return {
                  ...prev,
                  gold: prev.gold + result.rewards!.gold,
                  gems: prev.gems + (result.rewards!.gems || 0),
                  maxStageUnlocked: maxStage,
                  clearedStages: cleared,
                  inventory: newInventory
              };
          });
      }
      setView(ViewState.CAMPAIGN);
  };

  const handleItemClick = (item: InventoryItem) => {
      if (item.isNew) {
          setGameState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i => i.id === item.id ? { ...i, isNew: false } : i)
          }));
          const cleanItem = { ...item, isNew: false };
          setSelectedItemDetail(cleanItem);
      } else {
          setSelectedItemDetail(item);
      }
  };

  const calculateTeamPower = () => {
      const teamChars = gameState.team.map(id => gameState.inventory.find(i => i.id === id) as Character).filter(Boolean);
      let power = 0;
      teamChars.forEach(c => {
          const stats = calculateComputedStats(c, gameState.inventory);
          power += stats.atk + stats.hp / 10 + stats.def + stats.speed;
      });
      return Math.floor(power);
  };

  const getShowcaseCharacter = (): Character => {
      const activeChars = gameState.team
          .map(id => gameState.inventory.find(i => i.id === id) as Character)
          .filter(Boolean);
      
      if (activeChars.length === 0) return STARTER_CHAR;

      return activeChars.sort((a, b) => {
          if (b.rarity !== a.rarity) return b.rarity - a.rarity;
          if (b.level !== a.level) return b.level - a.level;
          const cpA = a.stats.atk + a.stats.hp/10;
          const cpB = b.stats.atk + b.stats.hp/10;
          return cpB - cpA;
      })[0];
  };

  const renderRedemptionOverlay = () => {
      if (!redeemedItem) return null;
      
      return (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 overflow-hidden gap-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black animate-pulse-fast"></div>
              
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <div className="w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(255,255,255,0.2)_20deg,transparent_40deg,rgba(255,255,255,0.2)_60deg,transparent_80deg,rgba(255,255,255,0.2)_100deg,transparent_120deg,rgba(255,255,255,0.2)_140deg,transparent_160deg,rgba(255,255,255,0.2)_180deg,transparent_200deg,rgba(255,255,255,0.2)_220deg,transparent_240deg,rgba(255,255,255,0.2)_260deg,transparent_280deg,rgba(255,255,255,0.2)_300deg,transparent_320deg,rgba(255,255,255,0.2)_340deg,transparent_360deg)] animate-[spin_20s_linear_infinite]"></div>
              </div>

              <div className="relative z-10 text-center animate-pop-in flex flex-col items-center gap-8">
                  <div className="text-4xl md:text-7xl font-black italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-widest uppercase">
                      ACQUIRED
                  </div>
                  
                  <div className="scale-110 md:scale-125 rotate-3 shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                      <Card character={redeemedItem} showStats />
                  </div>

                  <div className="text-white font-mono animate-pulse flex items-center gap-2 text-xs md:text-base">
                      <Sparkles className="inline text-white" size={16} /> 
                      <span className="tracking-widest">LIMITED TIME REWARD</span> 
                      <Sparkles className="inline text-white" size={16} />
                  </div>

                  <button 
                    onClick={() => setRedeemedItem(null)}
                    className="bg-white text-black font-black text-lg md:text-xl px-12 py-3 rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_white]"
                  >
                      CONFIRM
                  </button>
              </div>
          </div>
      );
  };

  const getElementColor = (el: ElementType) => {
      switch(el) {
          case ElementType.PYRO: return 'from-red-500 to-orange-600';
          case ElementType.HYDRO: return 'from-blue-500 to-cyan-600';
          case ElementType.DENDRO: return 'from-green-500 to-emerald-600';
          case ElementType.ELECTRO: return 'from-purple-500 to-indigo-600';
          case ElementType.CRYO: return 'from-cyan-300 to-blue-400';
          default: return 'from-gray-500 to-gray-700';
      }
  }

  const findItemOwner = (itemId: string): Character | undefined => {
      return gameState.inventory.find(i => 
          i.type === 'character' && 
          ((i as Character).equippedWeaponId === itemId || 
           (i as Character).equippedBackgroundId === itemId || 
           (i as Character).equippedChipId === itemId)
      ) as Character | undefined;
  }

  const renderHome = () => {
    const leader = getShowcaseCharacter();
    const stats = calculateComputedStats(leader, gameState.inventory);
    const xpPercent = (leader.xp / leader.maxXp) * 100;
    const weapon = gameState.inventory.find(i => i.id === leader.equippedWeaponId) as Weapon;
    const chip = gameState.inventory.find(i => i.id === leader.equippedChipId) as ModChip;

    return (
    <div className="flex flex-col h-full bg-gray-100 relative overflow-y-auto">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {/* Event Banner */}
      <div 
        onClick={() => setView(ViewState.EVENT)}
        className="w-full bg-black text-popGreen border-b-4 border-popGreen cursor-pointer hover:bg-gray-900 transition-colors shrink-0"
      >
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-4 animate-pulse">
                  <AlertTriangle className="text-popGreen" />
                  <span className="font-mono font-bold uppercase tracking-widest text-sm md:text-base">SYSTEM ALERT: CORRUPTION DETECTED</span>
              </div>
              <div className="bg-popGreen text-black text-xs font-black px-2 py-1 uppercase rounded animate-bounce-small">
                  PLAY EVENT
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 min-h-0">
        
        {/* DESKTOP SHOWCASE (Rich Data Card) */}
        <div className="hidden md:flex w-full md:w-5/12 lg:w-4/12 flex-col bg-white border-4 border-popBlack shadow-brutal group overflow-hidden relative">
            {/* Image Header */}
            <div className={`relative h-[45%] w-full bg-gradient-to-br ${getElementColor(leader.element)} overflow-hidden`}>
                <div className="absolute inset-0 bg-dots opacity-20"></div>
                <div className="absolute top-2 left-2 z-10 flex gap-2">
                    <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-white font-black text-xs border border-white/30">{leader.role}</div>
                    <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-white font-black text-xs border border-white/30">{leader.element}</div>
                </div>
                <div className="absolute inset-0 flex items-end justify-center">
                    <img 
                        src={leader.imageUrl} 
                        className="h-[95%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transform group-hover:scale-105 transition-transform duration-500"
                        alt={leader.name}
                    />
                </div>
            </div>

            {/* Info Body */}
            <div className="flex-1 p-5 flex flex-col bg-white relative">
                {/* Header Info */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-4xl font-black italic text-popBlack leading-none tracking-tighter uppercase">{leader.name}</h1>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 w-fit rounded mt-1">{leader.title}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-xl font-black text-popBlue">CP {(stats.atk + stats.hp/10 + stats.speed).toFixed(0)}</div>
                        <div className="flex text-popYellow">
                            {Array.from({length: leader.rarity}).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                    </div>
                </div>

                {/* Level Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                        <span>LVL {leader.level}</span>
                        <span>{leader.xp}/{leader.maxXp} XP</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-popGreen" style={{ width: `${xpPercent}%` }}></div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4 bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="text-center">
                        <div className="text-[9px] font-black text-gray-400">ATK</div>
                        <div className="text-sm font-bold text-popBlack">{stats.atk}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] font-black text-gray-400">DEF</div>
                        <div className="text-sm font-bold text-popBlack">{stats.def}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] font-black text-gray-400">SPD</div>
                        <div className="text-sm font-bold text-popBlack">{stats.speed}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] font-black text-gray-400">CRIT</div>
                        <div className="text-sm font-bold text-popBlack">{stats.critRate}%</div>
                    </div>
                </div>

                {/* Loadout & Skills Split */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                    {/* Loadout */}
                    <div className="flex flex-col gap-2">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loadout</div>
                        <div className="flex gap-2">
                            <div className={`w-10 h-10 border-2 rounded flex items-center justify-center ${weapon ? 'border-popRed bg-red-50 text-popRed' : 'border-dashed border-gray-300 text-gray-300'}`}>
                                <Sword size={20} />
                            </div>
                            <div className={`w-10 h-10 border-2 rounded flex items-center justify-center ${chip ? 'border-popGreen bg-green-50 text-popGreen' : 'border-dashed border-gray-300 text-gray-300'}`}>
                                <Cpu size={20} />
                            </div>
                        </div>
                    </div>
                    {/* Active Skills */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abilities</div>
                        <div className="text-[10px] font-bold text-popBlack truncate flex items-center gap-1"><div className="w-1 h-1 bg-black rounded-full"></div> {leader.skills.skill.name} <span className="text-gray-400 text-[9px]">{leader.skills.skill.cooldown}T</span></div>
                        <div className="text-[10px] font-bold text-popBlack truncate flex items-center gap-1"><div className="w-1 h-1 bg-popPink rounded-full"></div> {leader.skills.ultimate.name} <span className="text-gray-400 text-[9px]">{leader.skills.ultimate.cooldown}T</span></div>
                    </div>
                </div>
            </div>
        </div>

        {/* MOBILE SHOWCASE (Enhanced Status Bar) */}
        <div className="md:hidden w-full bg-white border-b-4 border-popBlack shadow-lg overflow-hidden shrink-0 flex flex-col">
            <div className={`h-1 w-full bg-gradient-to-r ${getElementColor(leader.element)}`}></div>
            <div className="p-3 flex items-center gap-3 relative">
                <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none"></div>
                
                {/* Avatar */}
                <div className={`relative w-16 h-16 shrink-0 border-2 ${leader.rarity >= 5 ? 'border-popYellow' : 'border-gray-300'} bg-gray-100 rounded overflow-hidden`}>
                    <img src={leader.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold">R{leader.rank || 1}</div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-baseline justify-between mb-1">
                        <h2 className="text-xl font-black italic uppercase leading-none truncate pr-2">{leader.name}</h2>
                        <div className="text-lg font-black text-popBlue leading-none">{stats.atk + stats.hp/10 + stats.speed} <span className="text-[8px] text-gray-400">CP</span></div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold bg-popBlack text-white px-1.5 rounded">{leader.role}</span>
                        <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 rounded uppercase">{leader.element}</span>
                        <div className="flex">{Array.from({length: leader.rarity}).map((_,i)=><Star key={i} size={8} className="fill-popYellow text-popYellow"/>)}</div>
                    </div>
                    {/* Mini Stats */}
                    <div className="flex gap-4 text-[10px] font-mono font-bold text-gray-500">
                        <span className="flex items-center gap-1"><Heart size={10} className="text-popRed"/> {stats.maxHp}</span>
                        <span className="flex items-center gap-1"><Sword size={10} className="text-popBlue"/> {stats.atk}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-fr pb-20 md:pb-0">
            {/* Campaign */}
            <div onClick={() => setView(ViewState.CAMPAIGN)} className="col-span-2 row-span-2 bg-popBlack text-white border-4 border-popBlack shadow-brutal hover:-translate-y-1 hover:shadow-[6px_6px_0px_#ff90e8] transition-all cursor-pointer relative overflow-hidden group p-6 flex flex-col justify-end min-h-[140px] md:min-h-[160px]">
                <div className="absolute inset-0 bg-popBlue opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="absolute right-4 top-4 text-gray-800 opacity-20">
                     <Play size={120} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl md:text-4xl font-black italic uppercase text-popYellow drop-shadow-md">CAMPAIGN</h3>
                    <p className="font-bold text-gray-400 mt-1 text-sm md:text-base">Operation: Stage {gameState.maxStageUnlocked}</p>
                </div>
            </div>

            {/* Summon */}
            <div onClick={() => setView(ViewState.GACHA)} className="col-span-1 bg-popPink border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-3 md:p-4 flex flex-col justify-between group overflow-hidden relative min-h-[100px] md:min-h-[120px]">
                <div className="absolute right-2 bottom-2 text-white/20">
                    <Hexagon size={48} className="md:w-16 md:h-16" />
                </div>
                <div className="font-black text-white text-lg md:text-xl uppercase italic drop-shadow-sm relative z-10">SUMMON</div>
                <div className="text-[10px] md:text-xs font-bold bg-white/20 px-2 py-1 rounded w-fit text-white relative z-10">New Banner</div>
            </div>

            {/* Roster */}
            <div onClick={() => setView(ViewState.ROSTER)} className="col-span-1 bg-white border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-3 md:p-4 flex flex-col justify-between group relative overflow-hidden min-h-[100px] md:min-h-[120px]">
                <div className="absolute right-2 bottom-2 text-popBlack/5">
                    <User size={48} className="md:w-16 md:h-16" />
                </div>
                <div className="font-black text-popBlack text-lg md:text-xl uppercase italic relative z-10">AGENTS</div>
                <div className="text-[10px] md:text-xs font-bold text-gray-500 relative z-10">{gameState.inventory.filter(i => i.type === 'character').length} Active</div>
            </div>

            {/* Shop */}
            <div onClick={() => setView(ViewState.SHOP)} className="col-span-1 bg-popYellow border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-3 md:p-4 flex flex-col justify-between group relative overflow-hidden min-h-[100px] md:min-h-[120px]">
                 <div className="absolute right-2 bottom-2 text-popBlack/10">
                     <ShoppingBag size={48} className="md:w-16 md:h-16" />
                 </div>
                 <div className="font-black text-popBlack text-lg md:text-xl uppercase italic relative z-10">SHOP</div>
            </div>

            {/* Quests */}
            <div onClick={() => setView(ViewState.QUESTS)} className="col-span-1 bg-popBlue border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-3 md:p-4 flex flex-col justify-between group relative overflow-hidden min-h-[100px] md:min-h-[120px]">
                 <div className="absolute right-2 bottom-2 text-white/20">
                     <ShieldCheck size={48} className="md:w-16 md:h-16" />
                 </div>
                 <div className="font-black text-white text-lg md:text-xl uppercase italic relative z-10">BOUNTIES</div>
                 {gameState.quests.filter(q => q.status === 'completed').length > 0 && (
                     <div className="absolute top-2 right-2 w-3 h-3 bg-popRed rounded-full border border-white animate-pulse" />
                 )}
            </div>
        </div>
      </div>
      
      {/* Footer Ticker */}
      <div className="bg-popBlack text-white py-2 overflow-hidden border-t-4 border-popBlack whitespace-nowrap shrink-0">
          <div className="animate-float flex gap-8 font-mono text-xs md:text-sm font-bold opacity-80">
              <span>+++ SYSTEM ONLINE +++</span>
              <span className="text-popGreen">MARKET UPDATE: CHIPS UP 15%</span>
              <span className="text-popPink">NEW BOUNTIES AVAILABLE IN SECTOR 4</span>
              <span className="text-popYellow">REMINDER: DAILY RESET IN 12H</span>
              <span>+++ WELCOME AGENT {gameState.username.toUpperCase()} +++</span>
          </div>
      </div>
    </div>
    );
  };

  const renderRoster = () => {
    let items = gameState.inventory.filter(i => {
        if (rosterTypeFilter === 'character') return i.type === 'character';
        if (rosterTypeFilter === 'weapon') return i.type === 'weapon';
        if (rosterTypeFilter === 'chip') return i.type === 'chip';
        return false;
    });

    if (rosterTypeFilter === 'character' && rosterFilter !== 'ALL') {
        items = items.filter(i => (i as Character).element === rosterFilter);
    }

    // Sort
    items.sort((a, b) => {
        if (rosterSort === 'RARITY') return b.rarity - a.rarity;
        if (rosterSort === 'RANK') return (b.rank || 1) - (a.rank || 1);
        return b.level - a.level; // Level default
    });

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            <div className="bg-popBlack text-white p-4 border-b-4 border-popBlack flex flex-col md:flex-row justify-between items-center gap-4 z-10 shadow-lg shrink-0">
                <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto">
                    {(['character', 'weapon', 'chip'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setRosterTypeFilter(t)}
                            className={`px-4 py-2 font-black uppercase tracking-widest text-sm transition-all ${rosterTypeFilter === t ? 'bg-popBlue text-white -translate-y-1 shadow-brutal-sm border border-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            {t}s
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                    {/* Element Filter (Only for Characters) */}
                    {rosterTypeFilter === 'character' && (
                        <select 
                            value={rosterFilter} 
                            onChange={(e) => setRosterFilter(e.target.value as any)}
                            className="bg-gray-800 text-white font-bold px-3 py-2 rounded border border-gray-600 text-xs md:text-sm"
                        >
                            <option value="ALL">ALL ELEMENTS</option>
                            <option value={ElementType.PYRO}>PYRO</option>
                            <option value={ElementType.HYDRO}>HYDRO</option>
                            <option value={ElementType.DENDRO}>DENDRO</option>
                            <option value={ElementType.ELECTRO}>ELECTRO</option>
                            <option value={ElementType.CRYO}>CRYO</option>
                        </select>
                    )}
                    
                    <select 
                        value={rosterSort} 
                        onChange={(e) => setRosterSort(e.target.value as any)}
                        className="bg-gray-800 text-white font-bold px-3 py-2 rounded border border-gray-600 text-xs md:text-sm"
                    >
                        <option value="LEVEL">SORT: LEVEL</option>
                        <option value="RARITY">SORT: RARITY</option>
                        <option value="RANK">SORT: RANK</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {items.map(item => {
                        const isEquipped = gameState.team.includes(item.id);
                        const owner = findItemOwner(item.id);
                        
                        return (
                            <div key={item.id} className="relative group">
                                {isEquipped && rosterTypeFilter === 'character' && (
                                    <div className="absolute top-2 right-2 z-20 bg-popGreen text-popBlack text-[10px] font-black px-2 py-1 border border-popBlack shadow-brutal-sm rounded-full">
                                        TEAM
                                    </div>
                                )}
                                <Card 
                                    character={item} 
                                    onClick={() => handleItemClick(item)} 
                                    selected={gameState.team.includes(item.id)}
                                    showStats
                                    equippedBy={owner?.name}
                                />
                                {rosterTypeFilter === 'character' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleTeamMember(item.id); }}
                                        className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-[90%] py-1 font-bold text-[10px] uppercase shadow-md transition-all z-30
                                            ${gameState.team.includes(item.id) ? 'bg-popRed text-white hover:bg-red-600' : 'bg-popBlue text-white hover:bg-blue-600'}
                                        `}
                                    >
                                        {gameState.team.includes(item.id) ? 'REMOVE' : 'DEPLOY'}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderGuideModal = () => {
    if (!showGuide) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
            <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-3xl w-full h-[80vh] flex flex-col animate-pop-in overflow-hidden">
                <div className="bg-popBlack text-white p-4 flex justify-between items-center shrink-0">
                     <h2 className="text-2xl font-black italic flex items-center gap-2"><HelpCircle size={24}/> FIELD MANUAL</h2>
                     <button onClick={() => setShowGuide(false)}><X /></button>
                </div>
                <div className="flex border-b-2 border-gray-200 overflow-x-auto shrink-0">
                    {(['basics', 'classes', 'stats', 'combat', 'upgrades', 'credits'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setGuideTab(t)}
                            className={`px-4 py-3 font-bold uppercase text-sm whitespace-nowrap ${guideTab === t ? 'bg-popBlue text-white' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 prose prose-sm max-w-none">
                    {guideTab === 'basics' && (
                        <div>
                            <h3 className="text-xl font-black uppercase mb-4">Core Concepts</h3>
                            <p>Welcome to Aether Chronicles. Your goal is to assemble a squad of elite agents, clear campaign stages, and collect powerful gear.</p>
                            <ul className="list-disc pl-5 space-y-2 mt-4 font-bold text-gray-600">
                                <li><strong>Gold:</strong> Basic currency for upgrades and common goods.</li>
                                <li><strong>Ether Crystals (Gems):</strong> Premium currency for Summoning (Gacha) and rare shop items.</li>
                                <li><strong>Agents:</strong> Your characters. You can have up to 3 in a team.</li>
                                <li><strong>Stamina:</strong> There is no stamina system. Play at your own pace.</li>
                            </ul>
                        </div>
                    )}
                    {guideTab === 'classes' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black uppercase mb-4">Agent Roles</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 border-l-4 border-blue-500 shadow-sm">
                                    <div className="font-black text-blue-500 mb-1">VANGUARD (Tank)</div>
                                    <p className="text-xs">High HP and Defense. Protects the team. Often has shields or taunts.</p>
                                </div>
                                <div className="bg-white p-4 border-l-4 border-red-500 shadow-sm">
                                    <div className="font-black text-red-500 mb-1">DUELIST (Striker)</div>
                                    <p className="text-xs">Balanced attacker. Good speed and single target damage. High Crit Damage.</p>
                                </div>
                                <div className="bg-white p-4 border-l-4 border-green-500 shadow-sm">
                                    <div className="font-black text-green-500 mb-1">OPERATOR (Support)</div>
                                    <p className="text-xs">Healers and buffers. Vital for long battles. Skills often target allies.</p>
                                </div>
                                <div className="bg-white p-4 border-l-4 border-yellow-500 shadow-sm">
                                    <div className="font-black text-yellow-500 mb-1">DEADEYE (Sniper/AOE)</div>
                                    <p className="text-xs">High Attack and Accuracy. Often possesses AOE (Area of Effect) skills to clear waves.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* ... (Implementation for other tabs can be simple text) ... */}
                    {guideTab === 'combat' && (
                         <div>
                            <h3 className="text-xl font-black uppercase mb-4">Battle Mechanics</h3>
                            <p>Battles are turn-based. Speed determines turn order.</p>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <h4 className="font-bold">Stability & Stun</h4>
                                    <p className="text-sm text-gray-600">Every unit has a Stability meter (Cyan bar). Taking damage reduces stability. When it hits 0, the unit is <strong>STUNNED</strong> for a turn and takes 50% more damage.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold">Elements</h4>
                                    <p className="text-sm text-gray-600">
                                        Pyro {'>'} Dendro {'>'} Hydro {'>'} Pyro.<br/>
                                        Electro {'<->'} Cryo deal bonus damage to each other.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-popGreen">Healing</h4>
                                    <p className="text-sm text-gray-600">
                                        Support units (Operators) can heal. Select a healing skill (marked GREEN), then tap an <strong>Ally Unit</strong> (or the caster themselves) to restore HP.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {guideTab === 'stats' && (
                         <div>
                            <h3 className="text-xl font-black uppercase mb-4">Stats Explained</h3>
                            <ul className="space-y-2 text-sm">
                                <li><strong className="text-popBlue">ATK:</strong> Base damage calculation.</li>
                                <li><strong className="text-popGreen">DEF:</strong> Reduces incoming damage. Armor Pen counters this.</li>
                                <li><strong className="text-popYellow">SPD:</strong> Determines turn frequency.</li>
                                <li><strong>CRIT RATE:</strong> Chance to deal 150% damage.</li>
                                <li><strong>ACCURACY vs EVASION:</strong> Hit chance = (Acc - Eva)%.</li>
                            </ul>
                        </div>
                    )}
                    {guideTab === 'upgrades' && (
                         <div>
                            <h3 className="text-xl font-black uppercase mb-4">Progression</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Level Up:</strong> Consume other items (fodder) to gain XP.</li>
                                <li><strong>Refine (Rank Up):</strong> Combine duplicates of the same item to increase Rank. This boosts ALL stats by 5% per rank.</li>
                                <li><strong>Equip:</strong> Characters can equip 1 Weapon, 1 Mod Chip, and 1 Style (Background).</li>
                            </ul>
                        </div>
                    )}
                    {guideTab === 'credits' && (
                         <div>
                            <h3 className="text-xl font-black uppercase mb-4">Tech & Resources</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-bold">Procedural Avatars</h4>
                                    <p>Character sprites generated via <a href="https://dicebear.com" target="_blank" className="text-popBlue underline">DiceBear API</a> (Adventurer & Bottts styles).</p>
                                    <div className="bg-gray-100 p-2 mt-2 rounded border border-gray-300">
                                        <div className="font-bold text-xs text-gray-500 mb-1">Alternatives:</div>
                                        <ul className="list-disc pl-4 text-xs text-gray-600">
                                            <li>Robohash.org</li>
                                            <li>Multiavatar.com</li>
                                            <li>BigHeads.io</li>
                                            <li>OpenPeeps.com</li>
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold">AI Content</h4>
                                    <p>Lore and descriptions powered by Google Gemini.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold">Icons</h4>
                                    <p>Lucide React</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderCreditCardDeclined = () => {
      if (!creditCardDeclined) return null;
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
              <div className="bg-white border-4 border-popRed p-8 max-w-md w-full text-center animate-shake">
                  <AlertTriangle size={64} className="text-popRed mx-auto mb-4" />
                  <h2 className="text-3xl font-black uppercase text-popRed mb-2">TRANSACTION DECLINED</h2>
                  <p className="font-bold text-gray-800 mb-6">"Nice try, high roller. Your card was declined by the galactic bank."</p>
                  <button onClick={() => setCreditCardDeclined(false)} className="bg-popBlack text-white px-8 py-3 font-black uppercase hover:bg-gray-800">OKAY...</button>
              </div>
          </div>
      )
  };

  const renderBankModal = () => {
    if (!showBank) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBank(false)} />
            <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-4xl w-full animate-pop-in flex flex-col md:flex-row overflow-hidden">
                <button onClick={() => setShowBank(false)} className="absolute top-4 right-4 z-10 hover:scale-110 transition-transform"><X size={24}/></button>
                
                {/* Left: Premium Banner */}
                <div className="w-full md:w-1/3 bg-popBlack text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-popBlue/20 to-transparent"></div>
                    <div>
                        <div className="text-popBlue font-black uppercase tracking-widest text-sm mb-2">The Bank</div>
                        <h2 className="text-4xl font-black italic mb-4">ETHER<br/>CRYSTALS</h2>
                        <p className="text-gray-400 text-sm font-bold">Premium currency used for summoning agents and high-end black market deals.</p>
                    </div>
                    <div className="mt-8">
                        <div className="flex items-center gap-2 text-popYellow font-black text-2xl">
                            <Diamond size={32} fill="currentColor"/> {gameState.gems.toLocaleString()}
                        </div>
                        <div className="text-gray-500 text-xs font-mono mt-1">CURRENT BALANCE</div>
                    </div>
                </div>

                {/* Right: Packs */}
                <div className="w-full md:w-2/3 p-6 md:p-8 bg-gray-50 grid grid-cols-2 gap-4 content-start overflow-y-auto max-h-[60vh] md:max-h-auto">
                    {[
                        { id: 'gem_1', amount: 160, bonus: 0, price: 0.99 },
                        { id: 'gem_2', amount: 320, bonus: 30, price: 4.99 },
                        { id: 'gem_3', amount: 1600, bonus: 200, price: 19.99 },
                        { id: 'gem_4', amount: 3200, bonus: 600, price: 49.99, featured: true },
                        { id: 'gem_5', amount: 6400, bonus: 1600, price: 99.99 },
                        { id: 'whale_pack', amount: 99999, bonus: 0, price: 9999.99, whale: true },
                    ].map(pack => (
                        <div key={pack.id} className={`relative bg-white border-2 ${pack.featured ? 'border-popBlue ring-2 ring-popBlue' : 'border-gray-200'} p-4 flex flex-col items-center justify-between gap-4 hover:shadow-lg transition-shadow group cursor-pointer ${pack.whale ? 'col-span-2 bg-gradient-to-r from-gray-900 to-black border-black text-white' : ''}`}
                             onClick={() => handleBuyGems(pack.id, pack.amount + (pack.bonus || 0), pack.price, pack.whale)}
                        >
                            {pack.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-popBlue text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">BEST VALUE</div>}
                            {gameState.bankStock[pack.id] && !pack.whale && <div className="absolute top-2 right-2 text-[10px] font-black text-green-500 flex items-center gap-1"><CheckCircle size={10}/> PURCHASED</div>}
                            
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center ${pack.whale ? 'bg-popYellow text-black' : 'bg-blue-50 text-popBlue'}`}>
                                <Diamond size={pack.whale ? 32 : 24} fill="currentColor" />
                            </div>
                            
                            <div className="text-center">
                                <div className={`font-black text-lg md:text-xl ${pack.whale ? 'text-popYellow' : 'text-gray-800'}`}>{pack.amount}</div>
                                {pack.bonus > 0 && <div className="text-xs font-bold text-green-500">+{pack.bonus} Bonus</div>}
                            </div>

                            <button className={`w-full py-2 font-black text-sm border-2 rounded transition-colors ${pack.whale ? 'bg-popYellow text-black border-popYellow hover:bg-white' : 'bg-gray-100 border-gray-200 text-gray-800 group-hover:bg-popBlack group-hover:text-white group-hover:border-popBlack'}`}>
                                ${pack.price}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderProfileModal = () => {
    if (!showProfile) return null;
    const stats = calculateComputedStats(getShowcaseCharacter(), gameState.inventory);
    
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
            <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-2xl w-full animate-pop-in flex flex-col overflow-hidden max-h-[90vh]">
                 <div className="bg-popBlack text-white p-4 flex justify-between items-center shrink-0">
                     <h2 className="text-2xl font-black italic flex items-center gap-2"><User size={24}/> AGENT PROFILE</h2>
                     <button onClick={() => setShowProfile(false)}><X /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                     {/* Stats Summary */}
                     <div className="flex items-center gap-6">
                         <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-popBlack overflow-hidden shrink-0">
                             <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${gameState.username}`} className="w-full h-full object-cover" />
                         </div>
                         <div>
                             <h3 className="text-3xl font-black uppercase">{gameState.username}</h3>
                             <div className="flex gap-4 mt-2 text-sm font-bold text-gray-500">
                                 <div className="flex items-center gap-1"><Star size={14} className="text-popYellow fill-current"/> Lvl {gameState.level}</div>
                                 <div className="flex items-center gap-1"><ShieldCheck size={14}/> Stage {gameState.maxStageUnlocked}</div>
                                 <div className="flex items-center gap-1"><Trophy size={14}/> {Object.keys(gameState.clearedStages).length} Clears</div>
                             </div>
                         </div>
                     </div>

                     <hr className="border-gray-200" />

                     {/* Promo Code */}
                     <div>
                         <h4 className="font-bold text-popBlack uppercase tracking-widest mb-2 flex items-center gap-2"><Keyboard size={16}/> Redeem Code</h4>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={promoCodeInput}
                                onChange={(e) => setPromoCodeInput(e.target.value)}
                                placeholder="ENTER CODE..."
                                className="flex-1 bg-gray-100 border-2 border-gray-300 px-4 py-2 font-mono font-bold uppercase focus:border-popBlack outline-none"
                             />
                             <button onClick={handleRedeemCode} className="bg-popBlack text-white font-black px-6 hover:bg-popBlue transition-colors">SUBMIT</button>
                         </div>
                         <p className="text-xs text-gray-400 mt-1 font-bold">Hint: Try 'etovo'</p>
                     </div>

                     <hr className="border-gray-200" />

                     {/* Save Management */}
                     <div>
                        <h4 className="font-bold text-popBlack uppercase tracking-widest mb-2 flex items-center gap-2"><Save size={16}/> Data Management</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 border-2 border-dashed border-gray-300">
                                <h5 className="font-black text-sm mb-2">EXPORT SAVE</h5>
                                <p className="text-xs text-gray-500 mb-3">Copy this string to transfer your progress.</p>
                                <div className="flex gap-2">
                                    <input readOnly value={btoa(JSON.stringify(gameState))} className="flex-1 bg-white border border-gray-300 px-2 py-1 text-[10px] font-mono truncate" />
                                    <button onClick={() => navigator.clipboard.writeText(btoa(JSON.stringify(gameState)))} className="bg-gray-200 px-3 font-bold text-xs hover:bg-gray-300">COPY</button>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 border-2 border-dashed border-gray-300">
                                <h5 className="font-black text-sm mb-2">IMPORT SAVE</h5>
                                <p className="text-xs text-gray-500 mb-3">Paste save string here.</p>
                                <div className="flex gap-2">
                                    <input value={importString} onChange={(e) => setImportString(e.target.value)} className="flex-1 bg-white border border-gray-300 px-2 py-1 text-[10px] font-mono" placeholder="Paste string..." />
                                    <button onClick={handleImportSave} className="bg-popRed text-white px-3 font-bold text-xs hover:bg-red-600">LOAD</button>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>
            </div>
        </div>
    );
  };

  const renderPurchaseSuccess = () => {
      if (!purchaseSuccess) return null;
      return (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-popGreen text-popBlack border-2 border-popBlack shadow-brutal px-6 py-3 flex items-center gap-3 animate-slide-up rounded-full">
              <CheckCircle size={24} className="fill-white text-popGreen" />
              <div>
                  <div className="font-black text-sm uppercase">Purchase Successful!</div>
                  <div className="text-xs font-bold opacity-80">Thank you for your support.</div>
              </div>
          </div>
      )
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      
      {renderGuideModal()}
      {renderRedemptionOverlay()}
      {renderCreditCardDeclined()}

      {/* Top Bar */}
      <div className="bg-white border-b-2 border-popBlack p-2 md:px-6 flex justify-between items-center z-50 shadow-sm shrink-0 h-16">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(ViewState.HOME)}>
           <div className="w-8 h-8 bg-popBlack rounded-full"></div>
           <h1 className="font-black italic text-lg md:text-2xl tracking-tighter">AETHER<span className="text-popPink">CHRONICLES</span></h1>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
            <button onClick={() => setShowGuide(true)} className="p-1 hover:text-popBlue"><HelpCircle /></button>
            <div className="flex items-center gap-4 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                <div className="flex items-center gap-1 group relative cursor-help">
                    <Coins size={16} className="text-popYellow fill-popYellow" />
                    <span className="font-bold font-mono text-sm">{gameState.gold.toLocaleString()}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-1 cursor-pointer hover:bg-white px-1 rounded transition-colors" onClick={() => setShowBank(true)}>
                    <Diamond size={16} className="text-popBlue fill-popBlue" />
                    <span className="font-bold font-mono text-sm">{gameState.gems.toLocaleString()}</span>
                    <div className="bg-popBlue text-white text-[10px] px-1 rounded-full ml-1">+</div>
                </div>
            </div>
            
            <button onClick={() => setShowProfile(true)} className="p-2 hover:bg-gray-100 rounded-full border border-transparent hover:border-gray-300 transition-all">
                <Menu size={24} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {view === ViewState.HOME && renderHome()}
        
        {view === ViewState.GACHA && (
            <GachaScene 
                gems={gameState.gems} 
                pityCounter={gameState.pityCounter} 
                onPullComplete={handlePullComplete}
                onClose={() => setView(ViewState.HOME)}
            />
        )}

        {view === ViewState.ROSTER && renderRoster()}

        {view === ViewState.CAMPAIGN && (
            <CampaignMap 
                unlockedStage={gameState.maxStageUnlocked}
                clearedStages={gameState.clearedStages}
                onSelectStage={startBattle}
                onClose={() => setView(ViewState.HOME)}
                teamCP={calculateTeamPower()}
            />
        )}

        {view === ViewState.BATTLE && (
            <BattleArena 
                myTeam={gameState.team.map(id => gameState.inventory.find(i => i.id === id) as Character).filter(Boolean)}
                inventory={gameState.inventory}
                campaignStage={activeStageId}
                onBattleEnd={handleBattleEnd}
            />
        )}
        
        {view === ViewState.SHOP && (
            <Shop 
                gold={gameState.gold}
                gems={gameState.gems}
                stock={gameState.shopStock}
                lastRefreshTime={gameState.lastFreeShopRefresh}
                onPurchase={handleShopPurchase}
                onRefresh={handleShopRefresh}
                onClose={() => setView(ViewState.HOME)}
            />
        )}

        {view === ViewState.QUESTS && (
            <QuestBoard 
                quests={gameState.quests}
                roster={gameState.inventory}
                busyCharacterIds={gameState.quests.flatMap(q => q.status === 'active' ? q.assignedCharacterIds : [])}
                onStartQuest={handleStartQuest}
                onClaimQuest={handleClaimQuest}
                onCancelQuest={handleCancelQuest}
                onClose={() => setView(ViewState.HOME)}
            />
        )}

        {view === ViewState.EVENT && (
            <AlienEvent 
                onClose={() => setView(ViewState.HOME)}
                character={getShowcaseCharacter()}
                stats={calculateComputedStats(getShowcaseCharacter(), gameState.inventory)}
                onVictory={handleEventVictory}
            />
        )}
      </div>

      {/* Global Modals */}
      {selectedItemDetail && (
          <CharacterDetail 
            item={selectedItemDetail}
            inventory={gameState.inventory}
            team={gameState.team}
            onEquip={handleEquip}
            onUpgrade={handleUpgrade}
            onClose={() => setSelectedItemDetail(null)} 
          />
      )}
      
      {renderBankModal()}
      {renderProfileModal()}
      {renderPurchaseSuccess()}
    </div>
  );
}
