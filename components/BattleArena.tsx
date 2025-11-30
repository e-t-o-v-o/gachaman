
// ... existing imports ...
import React, { useState, useEffect, useRef } from 'react';
import { Character, BattleUnit, BattleLog, DamagePopup, InventoryItem, Weapon, Skill, Rarity, BattleRewards, CharacterRole } from '../types';
import { calculateDamage, createEnemy, calculateBattleRewards, calculateComputedStats } from '../services/gameLogic';
import { Sword, Zap, Skull, ShieldAlert, Scan, X, Crosshair, Shield, Clock, Star, ArrowRight, Coins, Diamond, ArrowUpCircle, Gift, Cross, Cpu } from 'lucide-react';
import Card from './Card';

interface BattleArenaProps {
  myTeam: Character[];
  inventory: InventoryItem[];
  campaignStage: number;
  onBattleEnd: (result: { win: boolean, rewards?: BattleRewards }) => void;
}

type VisualEffectType = 'spark' | 'explosion' | 'heal' | 'buff';

const BattleArena: React.FC<BattleArenaProps> = ({ myTeam, inventory, campaignStage, onBattleEnd }) => {
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<'normal' | 'skill' | 'ultimate' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeAttackerId, setActiveAttackerId] = useState<string | null>(null);
  const [shake, setShake] = useState<'none' | 'small' | 'hard'>('none');
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [rewards, setRewards] = useState<BattleRewards | null>(null);
  const [battleStarted, setBattleStarted] = useState(false);
  const [visualEffects, setVisualEffects] = useState<Record<string, VisualEffectType | null>>({});
  
  const [inspectUnit, setInspectUnit] = useState<BattleUnit | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<BattleUnit[]>([]); // To keep track of latest units state in async calls

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // Initialize Battle
  useEffect(() => {
    if (battleStarted) return;
    
    const isBossStage = campaignStage === 3 || campaignStage === 5 || campaignStage === 7 || campaignStage === 10; 

    const enemies = [createEnemy(campaignStage, isBossStage && Math.random() < 0.33), createEnemy(campaignStage), createEnemy(campaignStage)];
    if (isBossStage) {
        enemies[1] = createEnemy(campaignStage, true);
    }

    const friendlyUnits = myTeam.map(c => ({ 
        ...c, 
        currentTurnMeter: 0, 
        effects: [], 
        isEnemy: false, 
        stats: { ...c.stats, hp: c.stats.maxHp },
        computedStats: calculateComputedStats(c, inventory),
        cooldowns: { skill: 0, ultimate: 0 },
        stability: 2, // Base stability
        maxStability: 2,
        isStunned: false
    }));
    const enemyUnits = enemies.map(c => ({ 
        ...c, 
        currentTurnMeter: 0, 
        effects: [], 
        isEnemy: true, 
        stats: { ...c.stats, hp: c.stats.maxHp },
        computedStats: { ...c.stats, critRate: 5 },
        cooldowns: { skill: 0, ultimate: 0 }
    }));
    
    // Sort by Speed
    const all = [...friendlyUnits, ...enemyUnits].sort((a, b) => b.stats.speed - a.stats.speed);
    
    setUnits(all);
    setTurnQueue(all.map(u => u.id));
    addLog(`Battle Start! Stage ${campaignStage}`, 'info');
    setBattleStarted(true);
  }, [myTeam, campaignStage, battleStarted, inventory]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Turn Logic
  useEffect(() => {
    if (!battleStarted || turnQueue.length === 0 || isAnimating || battleResult) return;

    const currentUnitId = turnQueue[0];
    const currentUnit = unitsRef.current.find(u => u.id === currentUnitId);

    // Filter out dead units from queue dynamically if they persist
    if (!currentUnit || currentUnit.stats.hp <= 0) {
      nextTurn();
      return;
    }

    // Handle Stun
    if (currentUnit.isStunned) {
        addPopup(currentUnit.id, "STUNNED!", 0, 0, 'normal');
        setTimeout(() => {
            // Recover from stun and regenerate stability
            setUnits(prev => prev.map(u => u.id === currentUnit.id ? { ...u, isStunned: false, stability: Math.floor(u.maxStability / 2) || 1 } : u));
            nextTurn();
        }, 800);
        return;
    }

    if (currentUnit.isEnemy) {
      const alivePlayers = unitsRef.current.filter(u => !u.isEnemy && u.stats.hp > 0);
      if (alivePlayers.length === 0) { handleEndGame(false); return; }
      
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      setTimeout(() => executeMove(currentUnit, target, 'normal'), 800);
    }
  }, [turnQueue, isAnimating, battleResult, battleStarted]);

  const addLog = (message: string, type: BattleLog['type']) => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  };

  const addPopup = (targetId: string, value: string | number, x: number, y: number, type: DamagePopup['type']) => {
      const id = crypto.randomUUID();
      setPopups(prev => [...prev, { id, targetId, value, x, y, type }]);
      setTimeout(() => {
          setPopups(prev => prev.filter(p => p.id !== id));
      }, 1000);
  };

  const triggerVisualEffect = (targetId: string, type: VisualEffectType) => {
      setVisualEffects(prev => ({ ...prev, [targetId]: type }));
      setTimeout(() => {
          setVisualEffects(prev => ({ ...prev, [targetId]: null }));
      }, 600);
  };

  const nextTurn = () => {
    const currentUnits = unitsRef.current;
    const alivePlayers = currentUnits.filter(u => !u.isEnemy && u.stats.hp > 0);
    const aliveEnemies = currentUnits.filter(u => u.isEnemy && u.stats.hp > 0);

    if (alivePlayers.length === 0) { handleEndGame(false); return; }
    if (aliveEnemies.length === 0) { handleEndGame(true); return; }

    setTurnQueue(prev => {
      const remaining = prev.slice(1);
      
      // Filter dead units from the remaining queue to prevent dead turns
      const validRemaining = remaining.filter(uid => {
          const u = currentUnits.find(unit => unit.id === uid);
          return u && u.stats.hp > 0;
      });

      if (validRemaining.length > 0) return validRemaining;

      // New Round Generation
      const nextRound = currentUnits
        .filter(u => u.stats.hp > 0)
        .sort((a, b) => {
             // If speeds are equal, Player goes first
             if (b.stats.speed === a.stats.speed) return a.isEnemy ? 1 : -1;
             return b.stats.speed - a.stats.speed;
        })
        .map(u => u.id);
      
      // Cooldown Reduction
      setUnits(curr => curr.map(u => {
          if (u.stats.hp <= 0) return u;
          return { 
              ...u, 
              cooldowns: { 
                  skill: Math.max(0, u.cooldowns.skill - 1), 
                  ultimate: Math.max(0, u.cooldowns.ultimate - 1) 
              }
          };
      }));

      return nextRound;
    });
  };

  const handleEndGame = (win: boolean) => {
      if (battleResult) return;
      
      let calcRewards: BattleRewards | undefined = undefined;
      if (win) {
          calcRewards = calculateBattleRewards(campaignStage);
          setRewards(calcRewards);
      }

      setBattleResult(win ? 'victory' : 'defeat');
  };

  const executeMove = (attacker: BattleUnit, target: BattleUnit, actionType: 'normal' | 'skill' | 'ultimate') => {
    setIsAnimating(true);
    setActiveAttackerId(attacker.id);
    
    let skill: Skill = attacker.skills.normal;
    if (actionType === 'skill') skill = attacker.skills.skill;
    if (actionType === 'ultimate') skill = attacker.skills.ultimate;

    // Apply Cooldown (Self)
    if (!attacker.isEnemy) {
        setUnits(prev => prev.map(u => {
            if (u.id === attacker.id) {
                return {
                    ...u,
                    cooldowns: {
                        skill: actionType === 'skill' ? skill.cooldown : u.cooldowns.skill,
                        ultimate: actionType === 'ultimate' ? skill.cooldown : u.cooldowns.ultimate
                    }
                };
            }
            return u;
        }));
    }

    addLog(`${attacker.name} uses ${skill.name}`, 'info');

    let weapon: Weapon | undefined = undefined;
    if (!attacker.isEnemy) {
         weapon = inventory.find(i => i.id === attacker.equippedWeaponId) as Weapon;
    }

    setTimeout(() => {
      const currentUnits = unitsRef.current;
      let targets: BattleUnit[] = [target];
      if (skill.isAOE) {
          targets = currentUnits.filter(u => u.isEnemy !== attacker.isEnemy && u.stats.hp > 0);
          addLog("Massive AOE Attack!", 'info');
      } else if (skill.isHeal) {
          if (skill.isAOE) {
               targets = currentUnits.filter(u => u.isEnemy === attacker.isEnemy && u.stats.hp > 0);
               addLog("Team Heal!", 'heal');
          } else {
               targets = [target]; // Heal targeted ally (or self)
          }
      }

      let shakeLevel: 'none' | 'small' | 'hard' = 'none';

      targets.forEach(t => {
          const { damage, isCrit, type, stabilityDamage } = calculateDamage(attacker, t, skill, weapon);
          
          if (type === 'heal') {
              triggerVisualEffect(t.id, 'heal');
          } else if (type === 'miss') {
              // No effect
          } else {
              if (isCrit || actionType === 'ultimate') {
                  triggerVisualEffect(t.id, 'explosion');
                  shakeLevel = 'hard';
              } else {
                  triggerVisualEffect(t.id, 'spark');
                  if (shakeLevel !== 'hard') shakeLevel = 'small';
              }
          }

          if (type !== 'heal') addPopup(t.id, type === 'miss' ? 'MISS' : damage, 0, 0, type); 
          else addPopup(t.id, damage, 0, 0, 'heal');

          setUnits(prev => prev.map(u => {
            if (u.id === t.id) {
                if (type === 'heal') {
                    return { ...u, stats: { ...u.stats, hp: Math.min(u.stats.maxHp, u.stats.hp + damage) } };
                } else {
                    // Reduce Stability
                    let newStability = u.stability - stabilityDamage;
                    let justStunned = false;

                    if (!u.isStunned && newStability <= 0) {
                        newStability = 0;
                        justStunned = true;
                    } else if (newStability < 0) {
                        newStability = 0;
                    }

                    if (justStunned) {
                        addPopup(u.id, "BREAK!", 0, -20, 'crit');
                        addLog(`${u.name} Stance Broken!`, 'info');
                    }

                    return { 
                        ...u, 
                        stability: newStability,
                        isStunned: u.isStunned || justStunned,
                        stats: { ...u.stats, hp: Math.max(0, u.stats.hp - damage) } 
                    };
                }
            }
            return u;
          }));

          if (type === 'heal') addLog(`${attacker.name} healed ${t.name} for ${damage}!`, 'heal');
          else if (type === 'miss') addLog(`${attacker.name} missed ${t.name}!`, 'miss');
          else addLog(`${t.name} takes ${damage} damage!`, 'damage');
          
          if (type !== 'heal' && t.stats.hp - damage <= 0) addLog(`${t.name} defeated!`, 'kill');
      });

      if (shakeLevel !== 'none') {
          setShake(shakeLevel);
          setTimeout(() => setShake('none'), 400);
      }

      setTimeout(() => {
        setIsAnimating(false);
        setActiveAttackerId(null);
        setSelectedAction(null);
        nextTurn();
      }, 600);
    }, 400); 
  };

  const currentUnitId = turnQueue[0];
  const currentUnit = units.find(u => u.id === currentUnitId);
  const isPlayerTurn = currentUnit && !currentUnit.isEnemy && !isAnimating && !battleResult;

  const handleTargetClick = (target: BattleUnit) => {
    if (!selectedAction) {
        setInspectUnit(target);
        return;
    }
    if (!isPlayerTurn || !currentUnit) return;
    
    const isHeal = (selectedAction === 'skill' && currentUnit.skills.skill.isHeal) || 
                   (selectedAction === 'ultimate' && currentUnit.skills.ultimate.isHeal);

    // If healing, ensure we can target allies (including self)
    if (isHeal) {
        if (target.isEnemy) return; // Cannot heal enemies
        executeMove(currentUnit, target, selectedAction); 
        return;
    }

    // Offensive move: must target enemy
    if (!target.isEnemy) return;
    executeMove(currentUnit, target, selectedAction);
  };

  const renderInspectModal = () => {
      if (!inspectUnit) return null;
      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInspectUnit(null)} />
              <div className="relative bg-[#1a1a1a] border-4 border-popBlue shadow-[0_0_30px_rgba(35,166,213,0.3)] w-full max-w-sm p-6 animate-pop-in">
                  <button onClick={() => setInspectUnit(null)} className="absolute top-2 right-2 text-white hover:text-popRed"><X /></button>
                  <div className="flex gap-4 mb-4">
                      <img src={inspectUnit.imageUrl} className="w-20 h-20 bg-gray-800 border-2 border-white rounded" />
                      <div>
                          <h3 className="text-2xl font-black text-white italic uppercase">{inspectUnit.name}</h3>
                          <div className="text-popBlue font-bold">Lvl {inspectUnit.level} {inspectUnit.element}</div>
                          <div className="text-sm text-gray-400 font-mono mt-1">{inspectUnit.role}</div>
                      </div>
                  </div>
                  
                  <div className="space-y-2 bg-black/50 p-4 border border-gray-700 font-mono text-sm text-gray-300">
                      <div className="flex justify-between"><span>HP</span> <span className="text-white">{inspectUnit.stats.hp}/{inspectUnit.stats.maxHp}</span></div>
                      <div className="flex justify-between"><span>STABILITY</span> <span className="text-cyan-400">{inspectUnit.stability}/{inspectUnit.maxStability}</span></div>
                      <div className="h-px bg-gray-700 my-2"></div>
                      <div className="flex justify-between"><span>ATK</span> <span className="text-white">{inspectUnit.computedStats?.atk || inspectUnit.stats.atk}</span></div>
                      <div className="flex justify-between"><span>DEF</span> <span className="text-white">{inspectUnit.computedStats?.def || inspectUnit.stats.def}</span></div>
                      <div className="flex justify-between"><span>SPD</span> <span className="text-white">{inspectUnit.computedStats?.speed || inspectUnit.stats.speed}</span></div>
                  </div>
              </div>
          </div>
      )
  };

  const getRoleIcon = (role?: string) => {
    switch(role) {
        case 'VANGUARD': return <Shield size={14} fill="currentColor" />;
        case 'DUELIST': return <Sword size={14} fill="currentColor" />;
        case 'OPERATOR': return <Cross size={14} fill="currentColor" />;
        case 'DEADEYE': return <Crosshair size={14} fill="currentColor" />;
        default: return <Sword size={14} fill="currentColor" />;
    }
  }

  return (
    <div className={`flex flex-col h-full bg-[#050505] relative overflow-hidden font-sans 
        ${shake === 'small' ? 'animate-shake' : ''} 
        ${shake === 'hard' ? 'animate-shake-hard' : ''}
    `}>
      {renderInspectModal()}
      
      {/* Environment */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050505] to-[#050505] animate-pulse-fast"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-end justify-center perspective-[500px]">
          <div className="w-[200%] h-[100%] bg-[linear-gradient(to_bottom,transparent_0%,rgba(35,166,213,0.1)_100%),linear-gradient(to_right,rgba(35,166,213,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(35,166,213,0.1)_1px,transparent_1px)] bg-[length:40px_40px] transform rotate-x-[60deg] origin-bottom opacity-40 animate-grid-scroll"></div>
      </div>

      {/* Turn Timeline */}
      <div className="h-16 md:h-20 w-full relative z-30 flex items-center justify-center pt-2 shrink-0">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 shadow-lg overflow-hidden">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">TURN ORDER</span>
             {turnQueue.slice(0, 6).map((uid, idx) => {
                 const u = units.find(unit => unit.id === uid);
                 if (!u) return null;
                 return (
                     <div key={`${uid}-${idx}`} className={`relative transition-all ${idx === 0 ? 'scale-125 mx-2 ring-2 ring-popYellow rounded' : 'opacity-60 scale-90'}`}>
                         <img src={u.imageUrl} className="w-8 h-8 md:w-10 md:h-10 bg-gray-800 object-cover rounded" />
                         {u.isEnemy && <div className="absolute -top-1 -right-1 w-3 h-3 bg-popRed rounded-full border border-black"></div>}
                     </div>
                 )
             })}
          </div>
      </div>

      {/* Battle Stage */}
      <div className="flex-1 flex flex-col md:flex-row justify-between items-center px-4 md:px-20 relative z-20 w-full max-w-7xl mx-auto py-4 gap-4 md:gap-0 perspective-[1000px]">
        {/* Allies */}
        <div className="flex flex-col gap-2 md:gap-4 w-full md:w-1/3 order-2 md:order-1 transform md:rotate-y-[10deg] mb-20 md:mb-0">
          {units.filter(u => !u.isEnemy).map(u => (
             <div key={u.id} onClick={() => setInspectUnit(u)} className={`transition-all duration-500 cursor-pointer ${u.id === currentUnitId ? 'scale-105 z-30' : 'opacity-90 grayscale-[0.3] hover:opacity-100'}`}>
                <Platform>
                    <UnitCard 
                        unit={u} 
                        isActive={u.id === currentUnitId}
                        isAttacking={u.id === activeAttackerId}
                        popups={popups}
                        effect={visualEffects[u.id] || null}
                        roleIcon={getRoleIcon(u.role)}
                    />
                </Platform>
             </div>
          ))}
        </div>

        {/* Enemies */}
        <div className="flex flex-col gap-2 md:gap-4 w-full md:w-1/3 items-end order-1 md:order-2 transform md:rotate-y-[-10deg]">
          {units.filter(u => u.isEnemy).map(u => {
             const isHeal = selectedAction && currentUnit && (currentUnit.skills[selectedAction].isHeal);
             const isAOETarget = selectedAction && isPlayerTurn && currentUnit?.skills[selectedAction].isAOE;
             
             // Targetable logic: If Heal, target Allies. If Attack, target Enemies.
             // Since we render enemies here, we only target if it's an ATTACK
             const isTargetable = selectedAction && isPlayerTurn && !isHeal && u.stats.hp > 0;
             
             return (
             <div key={u.id} onClick={() => handleTargetClick(u)} className={`w-full transition-all duration-500 ${isTargetable ? "cursor-crosshair scale-105" : "cursor-help"} ${u.id === currentUnitId ? 'z-30' : ''}`}>
                 <Platform isEnemy>
                     <UnitCard 
                        unit={u} 
                        isActive={u.id === currentUnitId}
                        isAttacking={u.id === activeAttackerId}
                        isTargetable={!!isTargetable}
                        isAOETarget={!!isAOETarget}
                        popups={popups}
                        effect={visualEffects[u.id] || null}
                        roleIcon={getRoleIcon(u.role)}
                     />
                 </Platform>
             </div>
          )})}
        </div>
      </div>

      {/* Victory/Defeat */}
      {battleResult && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
              <div className="text-center p-8 border-4 border-popYellow shadow-[0_0_50px_rgba(255,201,0,0.2)] bg-black max-w-lg w-full">
                  <h1 className={`text-6xl md:text-8xl font-black italic mb-4 animate-pop-in ${battleResult === 'victory' ? 'text-popYellow drop-shadow-[0_0_20px_rgba(255,201,0,0.5)]' : 'text-popRed'}`}>
                      {battleResult.toUpperCase()}!
                  </h1>
                  {battleResult === 'victory' && rewards && (
                      <div className="space-y-6 animate-slide-up mb-8">
                          <div className="flex gap-8 justify-center">
                              <div className="flex flex-col items-center gap-2">
                                  <div className="text-popYellow font-black text-4xl flex items-center gap-2"><Coins size={36} fill="currentColor" /> +{rewards.gold}</div>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                  <div className="text-popBlue font-black text-4xl flex items-center gap-2"><ArrowUpCircle size={36} /> +{rewards.xp}</div>
                              </div>
                          </div>
                          {rewards.items && rewards.items.length > 0 && (
                              <div className="bg-white/10 p-4 rounded border border-white/20">
                                  <h4 className="text-popPink font-black uppercase tracking-widest mb-3 flex items-center justify-center gap-2"><Gift size={16} /> Loot Dropped</h4>
                                  <div className="flex justify-center gap-2">
                                      {rewards.items.map((item, idx) => (
                                          <div key={idx} className="w-16 h-16 transform hover:scale-110 transition-transform"><Card character={item} small /></div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
                  <button onClick={() => onBattleEnd({ win: battleResult === 'victory', rewards })} className="w-full py-4 bg-white text-popBlack font-black text-xl uppercase tracking-widest hover:bg-popBlue hover:text-white transition-colors">Click to Continue</button>
              </div>
          </div>
      )}

      {/* Controls */}
      <div className="bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-gray-800 p-2 md:p-4 z-40 flex flex-col md:flex-row gap-2 md:gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 right-0 md:relative">
         <div className="flex-1 flex items-center justify-center gap-2 md:gap-8">
            {isPlayerTurn ? (
                <>
                    {selectedAction && (
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popYellow text-black px-4 py-1 font-black uppercase text-sm animate-bounce">
                             {currentUnit.skills[selectedAction].isHeal ? "SELECT ALLY TO HEAL" : "SELECT TARGET"}
                         </div>
                    )}
                    <ActionButton icon={<Sword size={24}/>} label="ATTACK" color="bg-popBlue" onClick={() => setSelectedAction('normal')} selected={selectedAction === 'normal'} />
                     <ActionButton icon={<Zap size={24}/>} label="SKILL" color="bg-popPink" onClick={() => setSelectedAction('skill')} selected={selectedAction === 'skill'} cooldown={currentUnit?.cooldowns.skill} isHeal={currentUnit?.skills.skill.isHeal} />
                     <ActionButton icon={<Skull size={24}/>} label="ULTIMATE" color="bg-popYellow" textColor="text-black" onClick={() => setSelectedAction('ultimate')} selected={selectedAction === 'ultimate'} isAOE={currentUnit?.skills.ultimate.isAOE} isHeal={currentUnit?.skills.ultimate.isHeal} cooldown={currentUnit?.cooldowns.ultimate} />
                </>
            ) : (
                <div className="text-xl md:text-2xl font-black text-gray-500 animate-pulse italic tracking-widest h-14 flex items-center">
                    {currentUnit?.stats.hp! > 0 ? 'OPPONENT THINKING...' : '...'}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

// ... Platform and ParticleBurst components ...
const Platform = ({ children, isEnemy }: any) => (
    <div className="relative group">
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/50 blur-md rounded-[100%] transform translate-y-2 group-hover:scale-110 transition-transform`}></div>
        <div className={`absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-full h-8 opacity-20 border-2 ${isEnemy ? 'border-popRed bg-popRed/20' : 'border-popBlue bg-popBlue/20'} transform skew-x-[-20deg]`}></div>
        {children}
    </div>
);

const ParticleBurst: React.FC<{ type: VisualEffectType }> = ({ type }) => {
    // Generate random particles
    const particles = Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360;
        const dist = 30 + Math.random() * 20;
        const tx = Math.cos(angle * Math.PI / 180) * dist;
        const ty = Math.sin(angle * Math.PI / 180) * dist;
        return { id: i, tx, ty };
    });

    let colorClass = 'bg-white';
    if (type === 'explosion') colorClass = 'bg-popRed';
    if (type === 'heal') colorClass = 'bg-popGreen';
    if (type === 'spark') colorClass = 'bg-popYellow';

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            {type === 'explosion' && (
                <div className="absolute w-20 h-20 border-4 border-popRed rounded-full animate-ping opacity-50"></div>
            )}
            {type === 'heal' && (
                <div className="absolute inset-0 bg-popGreen/20 animate-pulse rounded-full blur-xl"></div>
            )}
            {particles.map(p => (
                <div 
                    key={p.id}
                    className={`absolute w-2 h-2 rounded-full ${colorClass} animate-particle-out`}
                    style={{ 
                        '--tx': `${p.tx}px`, 
                        '--ty': `${p.ty}px` 
                    } as React.CSSProperties}
                ></div>
            ))}
        </div>
    );
};

const ActionButton: React.FC<{ 
    icon: any, label: string, color: string, textColor?: string, 
    onClick: () => void, selected: boolean, isAOE?: boolean, isHeal?: boolean, cooldown?: number 
}> = ({ 
    icon, label, color, textColor = 'text-white', onClick, selected, isAOE, isHeal, cooldown 
}) => {
    const disabled = (cooldown || 0) > 0;

    return (
    <button 
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`
        relative group flex-1 md:w-40 h-14 md:h-24 border-b-4 border-black/50 transition-all duration-200 rounded-t-lg overflow-hidden
        ${color} ${textColor}
        ${selected ? 'translate-y-2 border-b-0 brightness-110' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:brightness-110'}
      `}
    >
        {isAOE && <div className="absolute top-1 right-1 bg-black text-white text-[8px] font-bold px-1 rounded">ALL</div>}
        {isHeal && <div className="absolute top-1 right-1 bg-white text-green-600 text-[8px] font-bold px-1 rounded">HEAL</div>}
        
        {disabled && (
             <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center text-white">
                 <div className="font-black text-xl">{cooldown}</div>
             </div>
        )}

        <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-1">{icon}</div>
            <div className="text-xs md:text-sm font-black italic tracking-widest">{label}</div>
        </div>
    </button>
)};

const UnitCard: React.FC<{ 
    unit: BattleUnit, isActive: boolean, isAttacking: boolean, 
    isTargetable?: boolean, isAOETarget?: boolean, popups: DamagePopup[], effect: VisualEffectType | null, roleIcon?: any
}> = ({ unit, isActive, isAttacking, isTargetable, isAOETarget, popups, effect, roleIcon }) => {
    const isDead = unit.stats.hp <= 0;
    const hpPercent = (unit.stats.hp / unit.stats.maxHp) * 100;
    const stabilityPercent = (unit.stability / unit.maxStability) * 100;
    const myPopups = popups.filter(p => p.targetId === unit.id);

    // Dynamic Rarity Colors for Nameplate
    const getRarityGradient = () => {
        if (unit.rarity === Rarity.PROMO) return 'from-purple-500 via-pink-500 to-yellow-500 animate-pulse text-white';
        if (unit.rarity === Rarity.LEGENDARY) return 'from-popYellow to-orange-400 text-black';
        if (unit.rarity === Rarity.RARE) return 'from-popPink to-purple-500 text-white';
        return 'from-gray-700 to-gray-800 text-gray-200';
    };

    return (
        <div className={`
            relative transition-all duration-300 w-full
            ${isDead ? 'opacity-20 grayscale blur-[1px]' : ''}
            ${isActive ? 'scale-105 z-20 brightness-110' : ''}
            ${isAttacking ? 'translate-x-6' : ''}
            ${unit.isStunned ? 'grayscale animate-shake' : ''}
        `}>
            {effect && <ParticleBurst type={effect} />}
            {isActive && !isDead && <div className="absolute -inset-4 bg-white/10 blur-xl rounded-full z-0 pointer-events-none animate-pulse"></div>}
            {(isTargetable || isAOETarget) && <div className="absolute -inset-2 border-2 border-popRed rounded-lg animate-pulse z-30 flex items-center justify-center pointer-events-none"><Crosshair className="text-popRed animate-spin" /></div>}
            
            {/* Popups */}
            {myPopups.map(p => (
                 <div key={p.id} className={`absolute -top-10 left-1/2 -translate-x-1/2 z-50 font-black text-2xl md:text-4xl animate-slide-up drop-shadow-md whitespace-nowrap ${p.type === 'crit' ? 'text-popYellow scale-125' : p.type === 'heal' ? 'text-popGreen' : 'text-white'}`}>
                     {p.value}
                 </div>
            ))}

            {/* CARD */}
            <div className={`relative bg-[#1a1a1a] shadow-lg flex flex-col overflow-hidden border-2 ${unit.rarity === Rarity.LEGENDARY ? 'border-popYellow' : 'border-gray-700'} ${unit.rarity === Rarity.PROMO ? 'border-transparent animate-gradient bg-origin-border' : ''} ${unit.isStunned ? 'border-cyan-400 border-4' : ''}`}>
                
                {/* Header / Nameplate */}
                <div className={`flex items-center justify-between px-2 py-0.5 bg-gradient-to-r ${getRarityGradient()}`}>
                    <div className="flex items-center gap-1">
                        <div className="bg-black/20 p-0.5 rounded">{roleIcon}</div>
                        <span className="font-black text-[10px] md:text-xs uppercase truncate max-w-[80px]">{unit.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Equipped Icons (Only for Allies) */}
                        {!unit.isEnemy && (
                            <div className="flex gap-0.5 opacity-80">
                                {unit.equippedWeaponId && <Sword size={8} />}
                                {unit.equippedChipId && <Cpu size={8} />}
                            </div>
                        )}
                        <span className="text-[9px] font-mono font-bold opacity-80">Lv.{unit.level}</span>
                    </div>
                </div>

                {/* Body */}
                <div className={`flex p-1 gap-2 ${unit.isEnemy ? 'flex-row-reverse' : ''}`}>
                    <img src={unit.imageUrl} alt={unit.name} className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 object-cover rounded-sm border border-gray-600" />
                    
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                         {/* HP Bar */}
                        <div className="h-1.5 md:h-2 w-full bg-gray-800 rounded-full overflow-hidden relative border border-gray-700 mb-1">
                             <div className={`h-full transition-all duration-300 ${unit.isEnemy ? 'bg-popRed' : 'bg-popGreen'}`} style={{ width: `${hpPercent}%` }}></div>
                        </div>
                        {/* Stability Bar */}
                        <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden relative border border-gray-800 mb-0.5">
                             <div className={`h-full transition-all duration-300 bg-cyan-400 shadow-[0_0_5px_cyan]`} style={{ width: `${stabilityPercent}%` }}></div>
                        </div>
                        
                        <div className={`text-[8px] font-mono text-gray-400 flex justify-between ${unit.isEnemy ? 'flex-row-reverse' : ''}`}>
                             <span>{unit.stats.hp}/{unit.stats.maxHp}</span>
                             <span className="text-gray-600">{unit.element.substring(0,3).toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BattleArena;