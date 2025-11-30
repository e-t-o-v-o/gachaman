
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
import { generateQuests, refreshShop, calculateComputedStats, simulateUpgrade, calculateBaseStats, calculateWeaponStats, ETOVO_CHAR } from './services/gameLogic';
import { Coins, Hexagon, ShieldCheck, User, Play, Menu, ShoppingBag, CreditCard, X, Info, Settings, Save, Download, Upload, Diamond, CheckCircle, HelpCircle, Shield, Sword, Cross, Crosshair, Zap, Eye, Gauge, Keyboard, Star } from 'lucide-react';

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
  redeemedCodes: []
};

const STARTER_CHAR: Character = {
  id: 'starter-1',
  type: 'character',
  name: 'Nova',
  title: 'Star Walker',
  role: 'DUELIST',
  description: 'A journey beginning from the stars.',
  rarity: Rarity.COMMON,
  element: ElementType.PYRO,
  level: 1,
  xp: 0,
  maxXp: 100,
  rank: 1,
  stats: { 
      hp: 1200, maxHp: 1200, atk: 110, def: 60, speed: 105, 
      critRate: 5, critDmg: 150, evasion: 0, accuracy: 100, armorPen: 0 
  },
  imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Nova&backgroundColor=ffd5dc',
  skills: { 
      normal: { name: 'Slash', description: 'Basic melee attack.', multiplier: 1.0, cooldown: 0 }, 
      skill: { name: 'Spark', description: 'A quick burst of flame.', multiplier: 1.5, cooldown: 3 }, 
      ultimate: { name: 'Stardust', description: 'Shoots burning stardust at the enemy.', multiplier: 2.5, cooldown: 5 } 
  },
  value: 0
};

const SAVE_KEY = 'aether_chronicles_save_v1';

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
  const [guideTab, setGuideTab] = useState<'basics' | 'classes' | 'stats' | 'combat' | 'upgrades'>('basics');

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
          
          // Refinement Logic (Same name/rarity = Rank Up)
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
              // XP Logic
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

  // ... (Other handlers like handleShopPurchase, handleShopRefresh, handleStartQuest, handleCancelQuest, handleClaimQuest, handleBuyGems, handleImportSave remain unchanged)
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

  const handleBuyGems = (totalAmount: number, cost: number) => {
      setGameState(prev => ({ ...prev, gems: prev.gems + totalAmount }));
      setShowBank(false);
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
          setGameState(prev => ({
              ...prev,
              inventory: [...prev.inventory, { ...ETOVO_CHAR, id: `etovo-${Date.now()}`, isNew: true }],
              redeemedCodes: [...(prev.redeemedCodes || []), code]
          }));
          setPromoCodeInput("");
          alert("Code Redeemed! Etovo has joined your roster.");
          setShowProfile(false);
      } else {
          alert("Invalid Code");
      }
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

  const calculateTeamPower = () => {
      const teamChars = gameState.team.map(id => gameState.inventory.find(i => i.id === id) as Character).filter(Boolean);
      let power = 0;
      teamChars.forEach(c => {
          const stats = calculateComputedStats(c, gameState.inventory);
          power += stats.atk + stats.hp / 10 + stats.def + stats.speed;
      });
      return Math.floor(power);
  };

  const renderGuideModal = () => {
      if (!showGuide) return null;
      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-popBlack/90 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-4xl w-full h-[80vh] flex flex-col animate-pop-in">
                  <div className="flex justify-between items-center p-4 border-b-4 border-popBlack bg-popBlue text-white shrink-0">
                      <h2 className="text-3xl font-black italic flex items-center gap-2"><HelpCircle /> AETHER GUIDE</h2>
                      <button onClick={() => setShowGuide(false)}><X size={28} /></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b-2 border-popBlack overflow-x-auto shrink-0">
                      {['basics', 'classes', 'stats', 'combat', 'upgrades'].map((t: any) => (
                          <button 
                            key={t}
                            onClick={() => setGuideTab(t)}
                            className={`flex-1 py-3 px-4 font-black uppercase text-sm md:text-base ${guideTab === t ? 'bg-popYellow text-popBlack' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          >
                              {t}
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                      {guideTab === 'basics' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <h3 className="text-2xl font-black bg-popYellow text-black inline-block px-2 mb-4 -rotate-1 shadow-brutal-sm">MISSION</h3>
                                  <p className="mb-4 text-gray-700 font-medium">Build your squad of Agents, equip them with powerful weapons, and fight through the Campaign to reclaim the city.</p>
                                  <ul className="list-disc pl-5 space-y-2 text-sm font-bold text-gray-600">
                                      <li>Use <span className="text-popBlue">Gems</span> to Summon new Agents.</li>
                                      <li>Use <span className="text-popYellow">Gold</span> to upgrade gear.</li>
                                      <li>Complete Bounties for passive income.</li>
                                  </ul>
                              </div>
                          </div>
                      )}

                      {guideTab === 'classes' && (
                          <div className="grid grid-cols-1 gap-4">
                              <div className="p-4 border-l-8 border-gray-600 bg-gray-50">
                                  <h3 className="text-xl font-black text-popBlack flex items-center gap-2"><Shield/> VANGUARD (Tank)</h3>
                                  <p className="text-sm text-gray-600">High HP and DEF. They protect the team and have high Stability.</p>
                              </div>
                              <div className="p-4 border-l-8 border-popRed bg-red-50">
                                  <h3 className="text-xl font-black text-popRed flex items-center gap-2"><Sword/> DUELIST (Attacker)</h3>
                                  <p className="text-sm text-gray-600">Balanced Speed and ATK. Great for single-target damage.</p>
                              </div>
                              <div className="p-4 border-l-8 border-popGreen bg-green-50">
                                  <h3 className="text-xl font-black text-popGreen flex items-center gap-2"><Cross/> OPERATOR (Healer)</h3>
                                  <p className="text-sm text-gray-600">Can restore HP. High Speed. <span className="font-bold">Required to use Medical gear.</span></p>
                              </div>
                              <div className="p-4 border-l-8 border-popYellow bg-yellow-50">
                                  <h3 className="text-xl font-black text-popYellow flex items-center gap-2"><Crosshair/> DEADEYE (Sniper)</h3>
                                  <p className="text-sm text-gray-600">High Accuracy and AOE damage. Low HP.</p>
                              </div>
                          </div>
                      )}
                      
                      {guideTab === 'combat' && (
                          <div className="space-y-6">
                               <div>
                                  <h3 className="text-2xl font-black bg-popPink text-white inline-block px-2 mb-4 rotate-1">ELEMENTS</h3>
                                  <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                                      <div className="bg-red-100 p-2 border border-red-300 text-red-800">PYRO > DENDRO (2.0x Dmg)</div>
                                      <div className="bg-green-100 p-2 border border-green-300 text-green-800">DENDRO > HYDRO (2.0x Dmg)</div>
                                      <div className="bg-blue-100 p-2 border border-blue-300 text-blue-800">HYDRO > PYRO (2.0x Dmg)</div>
                                      <div className="bg-yellow-100 p-2 border border-yellow-300 text-yellow-800">ELECTRO / CRYO Mutual</div>
                                  </div>
                              </div>
                              <div className="bg-gray-100 p-4 border-2 border-gray-300 rounded">
                                  <h3 className="text-xl font-black bg-cyan-400 text-black inline-block px-2 mb-2">STABILITY BREAK</h3>
                                  <p className="text-sm text-gray-600 mb-2">Enemies have a <span className="text-cyan-600 font-bold">Cyan Stability Bar</span>.</p>
                                  <ul className="list-disc pl-5 text-sm font-bold space-y-1">
                                      <li>Hitting enemies reduces Stability.</li>
                                      <li><span className="text-popRed">Weakness hits deal 2x Break damage.</span></li>
                                      <li>At 0 Stability, enemy is <span className="bg-popRed text-white px-1">STUNNED</span>.</li>
                                      <li>Stunned enemies skip turn and take <span className="text-popRed">+50% DAMAGE</span>.</li>
                                  </ul>
                              </div>
                          </div>
                      )}

                      {guideTab === 'stats' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="p-3 border border-gray-300 rounded">
                                   <div className="font-black text-popBlue flex items-center gap-2"><Eye size={16}/> ACCURACY</div>
                                   <p className="text-xs text-gray-500">Chance to hit. Counters Evasion.</p>
                               </div>
                               <div className="p-3 border border-gray-300 rounded">
                                   <div className="font-black text-popGreen flex items-center gap-2"><Gauge size={16}/> EVASION</div>
                                   <p className="text-xs text-gray-500">Chance to dodge attacks completely.</p>
                               </div>
                               <div className="p-3 border border-gray-300 rounded">
                                   <div className="font-black text-popRed flex items-center gap-2"><Crosshair size={16}/> CRIT RATE/DMG</div>
                                   <p className="text-xs text-gray-500">Chance to deal extra damage (Base 150%).</p>
                               </div>
                               <div className="p-3 border border-gray-300 rounded">
                                   <div className="font-black text-popYellow flex items-center gap-2"><Zap size={16}/> ARMOR PEN</div>
                                   <p className="text-xs text-gray-500">Ignores a percentage of enemy DEF.</p>
                               </div>
                          </div>
                      )}

                      {guideTab === 'upgrades' && (
                          <div>
                              <h3 className="text-2xl font-black bg-popBlack text-white inline-block px-2 mb-4">POWER UP</h3>
                              <div className="space-y-4">
                                  <div className="border-l-4 border-popGreen pl-4">
                                      <div className="font-black uppercase">Level Up</div>
                                      <div className="text-sm text-gray-500">Consume unused items to gain XP. Increases base stats.</div>
                                  </div>
                                  <div className="border-l-4 border-popPink pl-4">
                                      <div className="font-black uppercase">Refine (Rank Up)</div>
                                      <div className="text-sm text-gray-500">Combine duplicates to increase Rank. +5% Stats per Rank.</div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )
  };

  const renderRoster = () => {
    let items = gameState.inventory;

    if (rosterTypeFilter !== 'character') {
        items = items.filter(i => i.type === rosterTypeFilter);
    } else {
        items = items.filter(i => i.type === 'character');
        if (rosterFilter !== 'ALL') {
             items = items.filter(i => (i as Character).element === rosterFilter);
        }
    }
    
    items.sort((a, b) => {
        if (rosterSort === 'LEVEL') return b.level - a.level;
        if (rosterSort === 'RARITY') return b.rarity - a.rarity;
        if (rosterSort === 'RANK') return (b.rank || 1) - (a.rank || 1);
        return 0;
    });

    const teamCP = calculateTeamPower();

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dots pointer-events-none" />
        
        <div className="bg-popWhite border-b-4 border-popBlack p-4 md:p-6 flex justify-between items-center z-10 shrink-0">
            <div className="flex flex-col">
                <h2 className="text-2xl md:text-4xl font-black text-popBlack italic flex items-center gap-4">
                <div className="bg-popBlue text-white p-2 border-2 border-popBlack shadow-brutal-sm"><User size={24} /></div>
                INVENTORY
                </h2>
                <div className="text-xs font-bold font-mono text-gray-500 mt-1 md:ml-16">
                    Total Items: {gameState.inventory.length}
                </div>
            </div>
            <button onClick={() => setView(ViewState.HOME)} className="font-bold underline hover:text-popPink">CLOSE X</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mb-6 md:mb-12 shrink-0">
                <div className="flex justify-between items-end mb-2 md:mb-4">
                     <h3 className="text-sm md:text-xl font-bold bg-popBlack text-white inline-block px-3 py-1 -rotate-1 shadow-brutal-sm">ACTIVE SQUAD</h3>
                     <div className="font-black text-popBlue italic text-lg md:text-2xl drop-shadow-sm">
                         CP: {teamCP.toLocaleString()}
                     </div>
                </div>

                <div className="flex gap-2 md:gap-8 items-center min-h-[120px] md:min-h-[160px] p-2 md:p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 overflow-x-auto no-scrollbar">
                    {gameState.team.map(id => {
                        const char = gameState.inventory.find(i => i.id === id) as Character;
                        if(!char) return null;
                        const equippedBg = gameState.inventory.find(i => i.id === char.equippedBackgroundId) as any;
                        const bgStyle = equippedBg ? equippedBg.style : undefined;
                        const busy = isCharacterBusy(id);

                        return (
                            <div key={id} onClick={() => setSelectedItemDetail(char)} className="cursor-pointer hover:scale-105 transition-transform relative group shrink-0 w-20 md:w-28">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleTeamMember(id); }}
                                    className="absolute -top-3 -right-3 bg-popRed text-white rounded-full w-6 h-6 flex items-center justify-center z-10 border-2 border-popBlack shadow-brutal-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold hover:scale-110"
                                >
                                    ✕
                                </button>
                                {busy && <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center text-white font-black rotate-12 border-2 border-white m-2 text-xs">BUSY</div>}
                                <Card character={char} small bgOverride={bgStyle} />
                            </div>
                        )
                    })}
                    {gameState.team.length < 3 && (
                        <div className="w-20 h-28 md:w-28 md:h-40 border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 font-bold text-center p-2 select-none shrink-0 text-[10px] md:text-sm">
                            SELECT FROM BELOW
                        </div>
                    )}
                </div>
            </div>

            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-y-2 border-popBlack py-2 mb-4 -mx-4 px-4 md:-mx-8 md:px-8 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Type Filter */}
                <div className="flex gap-2">
                    <button onClick={() => setRosterTypeFilter('character')} className={`px-4 py-1 font-black uppercase text-xs md:text-sm border-2 border-popBlack ${rosterTypeFilter === 'character' ? 'bg-popBlack text-white' : 'bg-white hover:bg-gray-100'}`}>AGENTS</button>
                    <button onClick={() => setRosterTypeFilter('weapon')} className={`px-4 py-1 font-black uppercase text-xs md:text-sm border-2 border-popBlack ${rosterTypeFilter === 'weapon' ? 'bg-popBlack text-white' : 'bg-white hover:bg-gray-100'}`}>GEAR</button>
                    <button onClick={() => setRosterTypeFilter('chip')} className={`px-4 py-1 font-black uppercase text-xs md:text-sm border-2 border-popBlack ${rosterTypeFilter === 'chip' ? 'bg-popBlack text-white' : 'bg-white hover:bg-gray-100'}`}>CHIPS</button>
                </div>

                {rosterTypeFilter === 'character' && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                        <button onClick={() => setRosterFilter('ALL')} className={`px-3 py-1 text-xs font-bold border border-popBlack rounded-full whitespace-nowrap ${rosterFilter === 'ALL' ? 'bg-popBlack text-white' : 'bg-white'}`}>ALL</button>
                        {[ElementType.PYRO, ElementType.HYDRO, ElementType.DENDRO, ElementType.ELECTRO, ElementType.CRYO].map(el => (
                            <button 
                                key={el}
                                onClick={() => setRosterFilter(el)}
                                className={`px-3 py-1 text-xs font-bold border border-popBlack rounded-full whitespace-nowrap transition-colors
                                    ${rosterFilter === el ? 'text-white' : 'bg-white'}
                                    ${rosterFilter === el && el === ElementType.PYRO ? 'bg-popRed' : ''}
                                    ${rosterFilter === el && el === ElementType.HYDRO ? 'bg-popBlue' : ''}
                                    ${rosterFilter === el && el === ElementType.DENDRO ? 'bg-popGreen' : ''}
                                    ${rosterFilter === el && el === ElementType.ELECTRO ? 'bg-popYellow text-black' : ''}
                                    ${rosterFilter === el && el === ElementType.CRYO ? 'bg-cyan-300 text-black' : ''}
                                `}
                            >
                                {el}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2 text-xs font-bold items-center shrink-0">
                    <span className="text-gray-400">SORT:</span>
                    {(['LEVEL', 'RARITY', 'RANK'] as const).map(sort => (
                        <button key={sort} onClick={() => setRosterSort(sort)} className={`hover:text-popBlue ${rosterSort === sort ? 'text-popBlack underline decoration-2' : 'text-gray-500'}`}>{sort}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pb-20">
                {items.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 font-bold italic">
                        No items found matching criteria.
                    </div>
                )}
                {items.map(item => {
                    const isSelected = gameState.team.includes(item.id);
                    const isChar = item.type === 'character';
                    const equippedBg = isChar ? gameState.inventory.find(i => i.id === (item as Character).equippedBackgroundId) as any : undefined;
                    const bgStyle = equippedBg ? equippedBg.style : undefined;
                    const busy = isChar ? isCharacterBusy(item.id) : false;
                    
                    return (
                        <div key={item.id} className="relative group cursor-pointer" onClick={() => setSelectedItemDetail(item)}>
                            {isSelected && (
                                <div className="absolute inset-0 bg-popBlue/20 z-20 rounded-lg pointer-events-none border-4 border-popBlue flex items-center justify-center">
                                    <span className="bg-popBlue text-white font-bold px-2 py-1 rotate-12 border border-popBlack shadow-brutal-sm text-xs">EQUIPPED</span>
                                </div>
                            )}
                             {busy && (
                                <div className="absolute inset-0 bg-black/40 z-20 rounded-lg pointer-events-none flex items-center justify-center">
                                    <span className="bg-popRed text-white font-black rotate-12 border-2 border-white m-2 text-xs">ON MISSION</span>
                                </div>
                            )}
                            <Card character={item} bgOverride={bgStyle} />
                            
                            {isChar && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleTeamMember(item.id); }}
                                        className={`pointer-events-auto w-full mx-2 py-2 font-black text-[10px] md:text-xs uppercase border border-popBlack shadow-brutal-sm ${isSelected ? 'bg-popRed text-white' : 'bg-popGreen text-popBlack'}`}
                                    >
                                        {isSelected ? 'UNEQUIP' : 'EQUIP'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
        </div>
    );
  };

  const renderHome = () => {
    const leaderId = gameState.team[0];
    const leader = (leaderId ? gameState.inventory.find(i => i.id === leaderId) : null) as Character || STARTER_CHAR;

    // Element Accents
    let accentColor = 'bg-popBlack';
    let textColor = 'text-popBlack';
    if(leader.element === ElementType.PYRO) { accentColor = 'bg-popRed'; textColor = 'text-popRed'; }
    if(leader.element === ElementType.HYDRO) { accentColor = 'bg-popBlue'; textColor = 'text-popBlue'; }
    if(leader.element === ElementType.DENDRO) { accentColor = 'bg-popGreen'; textColor = 'text-popGreen'; }
    if(leader.element === ElementType.ELECTRO) { accentColor = 'bg-popYellow'; textColor = 'text-popYellow'; }
    
    // Stats for Live Data
    const stats = calculateComputedStats(leader, gameState.inventory);
    const cosmetic = gameState.inventory.find(i => i.id === leader.equippedBackgroundId) as Cosmetic | undefined;
    
    // Stat Ratios for Radar
    const maxStat = 1500;
    const hpPct = Math.min(100, (stats.hp / (maxStat * 2)) * 100);
    const atkPct = Math.min(100, (stats.atk / maxStat) * 100);
    const spdPct = Math.min(100, (stats.speed / 200) * 100);

    return (
    <div className="flex flex-col h-full bg-gray-100 relative overflow-y-auto">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 min-h-0">
        
        {/* Holographic ID Card Showcase */}
        <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col relative h-[50vh] md:h-auto min-h-[500px] rounded-xl overflow-hidden shadow-2xl group perspective-[1000px]">
            {/* Hologram Container */}
            <div className={`
                absolute inset-0 bg-gradient-to-br from-gray-900 to-black p-1
                group-hover:rotate-y-2 transition-transform duration-500 ease-out preserve-3d
            `}>
                <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-white/10">
                    
                    {/* Animated Grid Background */}
                    <div className="absolute inset-0 opacity-30 animate-pulse-fast">
                        <div className={`absolute inset-0 bg-[linear-gradient(to_right,${leader.element === 'Pyro' ? '#ff4d4d' : leader.element === 'Hydro' ? '#23a6d5' : '#00e054'}_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[length:20px_20px]`}></div>
                    </div>

                    {/* Character Art */}
                    <div className="absolute inset-0 flex items-end justify-center z-10">
                        <img 
                            src={leader.imageUrl} 
                            className="h-[90%] object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            alt={leader.name}
                        />
                    </div>

                    {/* Holographic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(0,0,0,0.5)_100%)] z-30 pointer-events-none"></div>

                    {/* Data Overlay */}
                    <div className="absolute top-4 left-4 z-40">
                         <div className="text-[10px] font-mono text-gray-400 mb-1">ID_CARD_V8.2</div>
                         <h1 className="text-4xl font-black italic text-white leading-none tracking-tighter uppercase">{leader.name}</h1>
                         <div className={`text-sm font-bold uppercase tracking-widest ${textColor}`}>{leader.title}</div>
                    </div>

                    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
                        <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded border border-white/20">
                             <div className="text-[9px] font-mono text-gray-400 uppercase text-right">Combat Efficacy</div>
                             <div className="flex gap-1 items-end h-8 w-16 justify-between mt-1">
                                 <div className="w-1 bg-popRed h-full transition-all" style={{ height: `${atkPct}%` }}></div>
                                 <div className="w-1 bg-popGreen h-full transition-all" style={{ height: `${hpPct}%` }}></div>
                                 <div className="w-1 bg-popBlue h-full transition-all" style={{ height: `${spdPct}%` }}></div>
                                 <div className="w-1 bg-popYellow h-full transition-all" style={{ height: '60%' }}></div>
                             </div>
                        </div>
                        {leader.equippedWeaponId && <div className="bg-popGreen text-popBlack text-[10px] font-black px-2 py-0.5 rounded">SYNCHRONIZED</div>}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 z-40 flex justify-between items-end">
                        <div className="flex gap-2">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur border border-white/20 rounded flex items-center justify-center text-white">
                                {leader.role === 'VANGUARD' && <Shield />}
                                {leader.role === 'DUELIST' && <Sword />}
                                {leader.role === 'OPERATOR' && <Cross />}
                                {leader.role === 'DEADEYE' && <Crosshair />}
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="flex gap-1">
                                    {Array.from({ length: leader.rarity === Rarity.PROMO ? 1 : leader.rarity }).map((_, i) => (
                                        <Star key={i} size={10} className={leader.rarity === Rarity.PROMO ? "text-purple-400 animate-pulse" : "text-popYellow fill-popYellow"} />
                                    ))}
                                    {leader.rarity === Rarity.PROMO && <span className="text-[10px] text-purple-400 font-bold">PROMO</span>}
                                </div>
                                <div className="text-xs font-mono text-gray-400">Lv.{leader.level} {leader.role}</div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                             <div className="flex gap-1">
                                 <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-600">{leader.skills.skill.name}</span>
                                 <span className="bg-popYellow text-popBlack px-1.5 py-0.5 rounded text-[9px] font-bold border border-popBlack">ULT</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-fr pb-20">
            {/* Campaign */}
            <div onClick={() => setView(ViewState.CAMPAIGN)} className="col-span-2 row-span-2 bg-popBlack text-white border-4 border-popBlack shadow-brutal hover:-translate-y-1 hover:shadow-[6px_6px_0px_#ff90e8] transition-all cursor-pointer relative overflow-hidden group p-6 flex flex-col justify-end min-h-[160px]">
                <div className="absolute inset-0 bg-popBlue opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="absolute right-4 top-4 text-gray-800 opacity-20">
                     <Play size={120} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-4xl font-black italic uppercase text-popYellow drop-shadow-md">CAMPAIGN</h3>
                    <p className="font-bold text-gray-400 mt-1">Operation: Stage {gameState.maxStageUnlocked}</p>
                </div>
            </div>

            {/* Summon */}
            <div onClick={() => setView(ViewState.GACHA)} className="col-span-1 bg-popPink border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-4 flex flex-col justify-between group overflow-hidden relative min-h-[120px]">
                <div className="absolute right-2 bottom-2 text-white/20">
                    <Hexagon size={64} />
                </div>
                <div className="font-black text-white text-xl uppercase italic drop-shadow-sm relative z-10">SUMMON</div>
                <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded w-fit text-white relative z-10">New Banner</div>
            </div>

            {/* Roster */}
            <div onClick={() => setView(ViewState.ROSTER)} className="col-span-1 bg-white border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-4 flex flex-col justify-between group relative overflow-hidden min-h-[120px]">
                <div className="absolute right-2 bottom-2 text-popBlack/5">
                    <User size={64} />
                </div>
                <div className="font-black text-popBlack text-xl uppercase italic relative z-10">AGENTS</div>
                <div className="text-xs font-bold text-gray-500 relative z-10">{gameState.inventory.filter(i => i.type === 'character').length} Active</div>
            </div>

            {/* Shop */}
            <div onClick={() => setView(ViewState.SHOP)} className="col-span-1 bg-popYellow border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-4 flex flex-col justify-between group relative overflow-hidden min-h-[120px]">
                 <div className="absolute right-2 bottom-2 text-popBlack/10">
                     <ShoppingBag size={64} />
                 </div>
                 <div className="font-black text-popBlack text-xl uppercase italic relative z-10">SHOP</div>
            </div>

            {/* Quests */}
            <div onClick={() => setView(ViewState.QUESTS)} className="col-span-1 bg-popBlue border-4 border-popBlack shadow-brutal hover:-translate-y-1 cursor-pointer p-4 flex flex-col justify-between group relative overflow-hidden min-h-[120px]">
                 <div className="absolute right-2 bottom-2 text-white/20">
                     <ShieldCheck size={64} />
                 </div>
                 <div className="font-black text-white text-xl uppercase italic relative z-10">BOUNTIES</div>
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

  // ... (renderBankModal, renderProfileModal, renderPurchaseSuccess remain unchanged)
  const renderBankModal = () => {
      if (!showBank) return null;
      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-popBlack/90 backdrop-blur-sm" onClick={() => setShowBank(false)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-lg w-full p-8 animate-pop-in">
                  <button onClick={() => setShowBank(false)} className="absolute top-2 right-2 hover:bg-gray-200 p-1 rounded"><X /></button>
                  <h2 className="text-3xl font-black italic uppercase text-center mb-6">ETHER BANK</h2>
                  
                  <div className="grid gap-4">
                      {[
                          { amt: 100, cost: 0.99, bonus: 0 },
                          { amt: 500, cost: 4.99, bonus: 50 },
                          { amt: 1200, cost: 9.99, bonus: 200 },
                          { amt: 6500, cost: 49.99, bonus: 1500, popular: true },
                      ].map((pack, i) => (
                          <div key={i} onClick={() => handleBuyGems(pack.amt + pack.bonus, pack.cost)} className={`flex justify-between items-center p-4 border-2 border-popBlack hover:bg-gray-50 cursor-pointer ${pack.popular ? 'bg-popYellow/10 ring-2 ring-popYellow' : ''}`}>
                              <div className="flex items-center gap-3">
                                  <Diamond className="text-popBlue fill-popBlue" size={32} />
                                  <div>
                                      <div className="font-black text-xl">{pack.amt} <span className="text-sm font-bold text-gray-500">GEMS</span></div>
                                      {pack.bonus > 0 && <div className="text-xs font-bold text-popGreen">+{pack.bonus} BONUS</div>}
                                  </div>
                              </div>
                              <button className="bg-popBlack text-white font-bold px-4 py-2 hover:bg-gray-800 rounded">
                                  ${pack.cost}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )
  };

  const renderProfileModal = () => {
      if (!showProfile) return null;
      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-popBlack/90 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-md w-full p-6 animate-pop-in">
                  <button onClick={() => setShowProfile(false)} className="absolute top-2 right-2 hover:bg-gray-200 p-1 rounded"><X /></button>
                  <h2 className="text-2xl font-black italic uppercase mb-6 flex items-center gap-2"><Settings /> PROFILE</h2>
                  
                  <div className="mb-6 bg-gray-100 p-4 border-2 border-gray-200 rounded">
                      <div className="text-sm font-bold text-gray-500 uppercase">Agent Name</div>
                      <div className="text-2xl font-black">{gameState.username}</div>
                      <div className="text-sm font-bold text-popBlue mt-1">Level {gameState.level}</div>
                  </div>

                  <div className="space-y-4">
                      {/* Promo Code Section */}
                      <div className="bg-popYellow/10 p-4 border border-popYellow rounded">
                          <h4 className="font-bold text-sm uppercase mb-2 flex items-center gap-2"><Keyboard size={14} /> Redeem Code</h4>
                          <div className="flex gap-2">
                              <input 
                                value={promoCodeInput} 
                                onChange={(e) => setPromoCodeInput(e.target.value)}
                                placeholder="Enter code..."
                                className="flex-1 bg-white border-2 border-popBlack p-2 text-xs font-mono uppercase" 
                              />
                              <button 
                                onClick={handleRedeemCode}
                                className="bg-popBlack text-white p-2 font-bold text-xs hover:bg-gray-800"
                              >
                                  REDEEM
                              </button>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-sm uppercase mb-2">Export Save Data</h4>
                          <div className="flex gap-2">
                              <input readOnly value={btoa(JSON.stringify(gameState))} className="flex-1 bg-gray-50 border-2 border-gray-300 p-2 text-xs truncate font-mono" />
                              <button 
                                onClick={() => navigator.clipboard.writeText(btoa(JSON.stringify(gameState)))}
                                className="bg-popBlack text-white p-2 rounded hover:bg-gray-700"
                              >
                                  <Download size={16}/>
                              </button>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-sm uppercase mb-2">Import Save Data</h4>
                          <div className="flex gap-2">
                              <input 
                                value={importString} 
                                onChange={(e) => setImportString(e.target.value)}
                                placeholder="Paste save string..."
                                className="flex-1 bg-white border-2 border-popBlack p-2 text-xs font-mono" 
                              />
                              <button 
                                onClick={handleImportSave}
                                className="bg-popYellow text-popBlack p-2 border-2 border-popBlack hover:bg-yellow-400"
                              >
                                  <Upload size={16}/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )
  };

  const renderPurchaseSuccess = () => {
      if (!purchaseSuccess) return null;
      return (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-popGreen border-2 border-popBlack text-popBlack px-6 py-3 shadow-brutal-lg flex items-center gap-2 animate-bounce-small">
              <CheckCircle size={24} />
              <span className="font-black uppercase">Purchase Successful!</span>
          </div>
      )
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      
      {renderGuideModal()}

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
