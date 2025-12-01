
import React, { useState, useEffect, useRef } from 'react';
import { CharacterStats, Character } from '../types';
import { Shield, Sword, Zap, AlertTriangle, Crosshair, X, Heart, Flame, Terminal } from 'lucide-react';

interface AlienEventProps {
  onClose: () => void;
  character: Character;
  stats: CharacterStats;
  onVictory?: () => void;
}

const AlienEvent: React.FC<AlienEventProps> = ({ onClose, character, stats, onVictory }) => {
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(stats.maxHp);
  const [syncMeter, setSyncMeter] = useState(0); // 0-100
  
  const [enemyHp, setEnemyHp] = useState(100);
  const [maxEnemyHp, setMaxEnemyHp] = useState(100);
  const [enemyState, setEnemyState] = useState<'IDLE' | 'CHARGING' | 'ATTACKING' | 'DEFENDING'>('IDLE');
  
  const [dialogue, setDialogue] = useState<string[]>(["SYSTEM: ENEMY ENCOUNTER DETECTED.", "SCANNING HOSTILE..."]);
  const [animating, setAnimating] = useState(false);
  const [flash, setFlash] = useState<'none' | 'white' | 'red' | 'green'>('none');
  const [shake, setShake] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Scaling
  const dmg = stats.atk;

  // Setup Wave
  useEffect(() => {
      initWave(wave);
  }, [wave]);

  useEffect(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  const addLog = (text: string) => {
      setDialogue(prev => [...prev.slice(-3), text]);
  };

  const initWave = (w: number) => {
      setPlayerHp(stats.maxHp); 
      setSyncMeter(0);
      setAnimating(false);
      
      if (w === 1) {
          const hp = dmg * 6;
          setMaxEnemyHp(hp);
          setEnemyHp(hp);
          addLog("WAVE 1: GLITCH SWARM. They charge up unstable energy.");
          setEnemyState('CHARGING');
      } else if (w === 2) {
          const hp = dmg * 10;
          setMaxEnemyHp(hp);
          setEnemyHp(hp);
          addLog("WAVE 2: FIREWALL SENTINEL. High Defense shielding.");
          setEnemyState('DEFENDING');
      } else {
          const hp = dmg * 18;
          setMaxEnemyHp(hp);
          setEnemyHp(hp);
          addLog("FINAL BOSS: ALIEN ETOVO. THE HOST BODY.");
          setEnemyState('IDLE');
          setTimeout(() => setEnemyState('ATTACKING'), 1000);
      }
  };

  const triggerShake = () => {
      setShake(true);
      setTimeout(() => setShake(false), 500);
  }

  const triggerFlash = (color: 'white' | 'red' | 'green') => {
      setFlash(color);
      setTimeout(() => setFlash('none'), 200);
  }

  const handleAction = (action: 'ASSAULT' | 'SHIELD' | 'BREACH' | 'ULTIMATE') => {
      if (animating) return;
      setAnimating(true);

      let playerDmg = 0;
      let selfDmg = 0;
      let syncGain = 0;
      let healAmount = 0;
      let isCounter = false;

      // --- PLAYER PHASE ---
      if (action === 'ULTIMATE') {
          playerDmg = Math.floor(dmg * 6.0);
          healAmount = Math.floor(stats.maxHp * 0.3);
          addLog(`LIMIT BREAK! ${character.skills.ultimate.name.toUpperCase()}!`);
          triggerFlash('white');
          triggerShake();
          setSyncMeter(0);
          isCounter = true; // Ultimate overrides everything
      } else if (action === 'ASSAULT') {
          // Counters CHARGING
          if (enemyState === 'CHARGING') {
              playerDmg = Math.floor(dmg * 2.5);
              addLog(">> COUNTER! CHARGE INTERRUPTED!");
              triggerFlash('white');
              isCounter = true;
          } else if (enemyState === 'DEFENDING') {
              playerDmg = 0;
              selfDmg = Math.floor(dmg * 0.5);
              addLog(">> BLOCKED! SHIELD REFLECTED DAMAGE!");
              triggerShake();
              triggerFlash('red');
              syncGain = -10;
          } else {
              playerDmg = dmg;
              addLog(">> Standard attack.");
              syncGain = 5;
          }
      } else if (action === 'SHIELD') {
          // Counters ATTACKING
          if (enemyState === 'ATTACKING') {
              playerDmg = Math.floor(dmg * 1.5); // Reflect
              healAmount = Math.floor(stats.maxHp * 0.05); // Heal on perfect guard
              addLog(">> PERFECT GUARD! DAMAGE REFLECTED + HEAL!");
              triggerFlash('green');
              isCounter = true;
          } else if (enemyState === 'CHARGING') {
              addLog(">> Energy beam blocked safely.");
              syncGain = 5;
          } else {
              addLog(">> Defensive stance held.");
          }
      } else if (action === 'BREACH') {
          // Counters DEFENDING
          if (enemyState === 'DEFENDING') {
              playerDmg = Math.floor(dmg * 2.0);
              addLog(">> SHATTER! DEFENSE BROKEN!");
              triggerFlash('white');
              triggerShake();
              isCounter = true;
          } else if (enemyState === 'ATTACKING') {
              selfDmg = Math.floor(dmg * 0.8);
              addLog(">> OPEN! HIT WHILE BREACHING!");
              triggerShake();
              triggerFlash('red');
              syncGain = -10;
          } else {
              playerDmg = Math.floor(dmg * 0.5);
              addLog(">> Breach hit exposed target.");
              syncGain = 5;
          }
      }

      if (isCounter) syncGain = 20;

      // Apply changes
      setEnemyHp(prev => Math.max(0, prev - playerDmg));
      if (selfDmg > 0) setPlayerHp(prev => Math.max(0, prev - selfDmg));
      if (healAmount > 0) setPlayerHp(prev => Math.min(stats.maxHp, prev + healAmount));
      
      setSyncMeter(prev => Math.min(100, Math.max(0, prev + syncGain)));

      // --- CHECK WIN ---
      if (enemyHp - playerDmg <= 0) {
          addLog("TARGET NEUTRALIZED. WAVE COMPLETE.");
          setTimeout(() => {
              if (wave < 3) {
                  setWave(w => w + 1);
              } else {
                  if (onVictory) onVictory();
              }
          }, 2000);
          return;
      }

      // --- CHECK LOSS (Self Dmg) ---
      if (playerHp - selfDmg <= 0) {
          addLog("CRITICAL FAILURE.");
          setTimeout(onClose, 2000);
          return;
      }

      // --- ENEMY PHASE (If not dead/interrupted) ---
      setTimeout(() => {
          let enemyDmg = 0;
          
          if (!isCounter && action !== 'ULTIMATE') {
              // Enemy hits back if not countered
              // Fixed damage: 8% of Max HP (Fair scaling)
              const baseEnemyDmg = Math.floor(stats.maxHp * 0.08); 
              
              if (enemyState === 'ATTACKING') {
                  if (action !== 'SHIELD') {
                      enemyDmg = baseEnemyDmg;
                      addLog(">> ENEMY HIT! TAKE COVER!");
                      triggerFlash('red');
                  }
              } else if (enemyState === 'CHARGING') {
                  if (action !== 'ASSAULT' && action !== 'SHIELD') {
                      enemyDmg = baseEnemyDmg * 2.5; // Big punishment for ignoring charge
                      addLog(">> BEAM FIRED! CRITICAL HIT!");
                      triggerShake();
                      triggerFlash('red');
                  }
              }
          }

          if (enemyDmg > 0) {
              setPlayerHp(prev => Math.max(0, prev - enemyDmg));
          }

          if (playerHp - enemyDmg <= 0) {
              addLog("CRITICAL FAILURE.");
              setTimeout(onClose, 2000);
              return;
          }

          // --- NEXT TURN PREP ---
          setTimeout(() => {
              // Boss AI Logic
              const roll = Math.random();
              let nextState: typeof enemyState = 'IDLE';
              
              // Simple AI Pattern: Never Idle too long
              if (enemyState === 'IDLE') nextState = roll > 0.5 ? 'ATTACKING' : 'DEFENDING';
              else if (enemyState === 'CHARGING') nextState = 'ATTACKING';
              else if (enemyState === 'ATTACKING') nextState = roll > 0.6 ? 'DEFENDING' : 'CHARGING';
              else nextState = roll > 0.4 ? 'ATTACKING' : 'CHARGING';

              // Hint Text
              if (nextState === 'CHARGING') addLog("WARNING: ENEMY CHARGING...");
              if (nextState === 'ATTACKING') addLog("WARNING: ENEMY AGGRESSIVE...");
              if (nextState === 'DEFENDING') addLog("WARNING: SHIELDS UP...");

              setEnemyState(nextState);
              setAnimating(false);
          }, 800);

      }, 800);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black font-mono overflow-hidden flex flex-col ${shake ? 'animate-shake-hard' : ''}`}>
        {/* CRT Overlay */}
        <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
        {flash !== 'none' && <div className={`absolute inset-0 z-40 opacity-30 ${flash === 'white' ? 'bg-white' : flash === 'red' ? 'bg-red-500' : 'bg-green-500'}`}></div>}

        {/* Header */}
        <div className="bg-gray-900 border-b border-green-500/50 p-4 flex justify-between items-center z-10">
            <div className="flex flex-col">
                <h2 className="text-green-400 font-black text-xl flex items-center gap-2">
                    <AlertTriangle size={20}/> COSMIC GAUNTLET
                </h2>
                <span className="text-xs text-green-600 font-bold">WAVE {wave} // THREAT DETECTED</span>
            </div>
            <button onClick={onClose} className="border border-green-500 text-green-500 px-3 py-1 hover:bg-green-500 hover:text-black text-xs font-bold uppercase">Emergency Eject</button>
        </div>

        {/* BATTLE VIEW */}
        <div className="flex-1 relative flex bg-black overflow-hidden">
            
            {/* Player Side (Left) */}
            <div className="w-1/2 relative flex items-end justify-center pb-12 pl-4">
                <div className="relative z-20">
                    <img src={character.imageUrl} className="h-48 md:h-64 object-contain filter drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]" />
                    <div className="bg-black/80 border border-green-500 p-2 mt-2 text-green-400 text-xs font-bold text-center">
                        {character.name} <br/>
                        <div className="w-full bg-gray-800 h-2 mt-1">
                            <div className="bg-green-500 h-full transition-all" style={{width: `${(playerHp/stats.maxHp)*100}%`}}></div>
                        </div>
                        <span className="text-[10px]">{playerHp}/{stats.maxHp}</span>
                    </div>
                </div>
            </div>

            {/* Enemy Side (Right) */}
            <div className="w-1/2 relative flex items-center justify-center bg-green-900/10 border-l border-green-500/20">
                <div className="relative z-20 flex flex-col items-center">
                    <div className={`
                        mb-4 text-xs font-black px-2 py-1 border 
                        ${enemyState === 'CHARGING' ? 'text-red-500 border-red-500 bg-red-900/20 animate-pulse' : ''}
                        ${enemyState === 'DEFENDING' ? 'text-blue-400 border-blue-400 bg-blue-900/20' : ''}
                        ${enemyState === 'ATTACKING' ? 'text-yellow-400 border-yellow-400 bg-yellow-900/20' : ''}
                        ${enemyState === 'IDLE' ? 'text-gray-400 border-gray-400' : ''}
                    `}>
                        {enemyState}
                    </div>

                    {wave === 3 ? (
                        <img 
                            src="https://i.imgur.com/TDEHUTq.png" 
                            className={`w-48 md:w-64 object-contain animate-float transition-all duration-300 ${enemyState === 'DEFENDING' ? 'opacity-50' : 'opacity-100'} ${enemyState === 'CHARGING' ? 'scale-110 drop-shadow-[0_0_20px_red]' : ''}`}
                        />
                    ) : (
                        <div className={`w-32 h-32 bg-green-500/10 border-4 border-green-500 flex items-center justify-center transition-all ${enemyState === 'CHARGING' ? 'animate-shake bg-red-500/20 border-red-500' : ''}`}>
                            <AlertTriangle size={48} className={enemyState === 'CHARGING' ? 'text-red-500' : 'text-green-500'}/>
                        </div>
                    )}

                    <div className="w-32 h-3 bg-gray-800 border border-gray-600 mt-4 relative">
                        <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(enemyHp / maxEnemyHp) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Log Overlay */}
            <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none gap-1">
                {dialogue.map((line, i) => (
                    <span key={i} className={`bg-black/90 text-green-400 font-mono text-xs md:text-sm px-4 py-1 border border-green-500/50 ${i === dialogue.length-1 ? 'opacity-100 scale-105 font-bold border-green-400' : 'opacity-60 scale-95'}`}>
                        {line}
                    </span>
                ))}
            </div>
        </div>

        {/* CONTROL DECK */}
        <div className="bg-gray-900 border-t-4 border-green-600 p-2 md:p-4 grid grid-cols-4 gap-2 z-20 shrink-0 h-1/3 max-h-[220px]">
            
            {/* Sync Meter */}
            <div className="col-span-1 flex flex-col justify-center items-center bg-black border border-green-500/30 p-2">
                <div className="text-green-500 font-black text-[10px] uppercase mb-1 tracking-widest">SYNC RATE</div>
                <div className="relative w-6 md:w-10 h-24 md:h-32 bg-gray-800 border border-gray-600 rounded-full overflow-hidden">
                    <div className={`absolute bottom-0 inset-x-0 transition-all duration-500 ${syncMeter >= 100 ? 'bg-white animate-pulse' : 'bg-green-500'}`} style={{ height: `${syncMeter}%` }}></div>
                </div>
                <div className="text-white font-mono font-bold mt-1">{syncMeter}%</div>
            </div>

            {/* Actions */}
            <div className="col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <button 
                    onClick={() => handleAction('ASSAULT')}
                    disabled={animating}
                    className="bg-red-900/20 border-2 border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white flex flex-col items-center justify-center p-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <Crosshair size={24} className="group-hover:scale-110 transition-transform mb-1" />
                    <span className="font-black text-sm">ASSAULT</span>
                    <span className="text-[9px] uppercase opacity-70">Beats Charging</span>
                </button>
                
                <button 
                    onClick={() => handleAction('SHIELD')}
                    disabled={animating}
                    className="bg-blue-900/20 border-2 border-blue-600/50 text-blue-500 hover:bg-blue-600 hover:text-white flex flex-col items-center justify-center p-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <Shield size={24} className="group-hover:scale-110 transition-transform mb-1" />
                    <span className="font-black text-sm">SHIELD</span>
                    <span className="text-[9px] uppercase opacity-70">Beats Attack (+Heal)</span>
                </button>

                <button 
                    onClick={() => handleAction('BREACH')}
                    disabled={animating}
                    className="bg-yellow-900/20 border-2 border-yellow-600/50 text-yellow-500 hover:bg-yellow-600 hover:text-black flex flex-col items-center justify-center p-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <Zap size={24} className="group-hover:scale-110 transition-transform mb-1" />
                    <span className="font-black text-sm">BREACH</span>
                    <span className="text-[9px] uppercase opacity-70">Beats Defend</span>
                </button>

                {/* ULTIMATE BUTTON */}
                <button 
                    onClick={() => handleAction('ULTIMATE')}
                    disabled={animating || syncMeter < 100}
                    className={`
                        border-2 flex flex-col items-center justify-center p-2 transition-all group overflow-hidden relative
                        ${syncMeter >= 100 
                            ? 'bg-white text-black border-white animate-pulse cursor-pointer hover:scale-105' 
                            : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'}
                    `}
                >
                    {syncMeter >= 100 && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-holo-sheen"></div>}
                    <Flame size={24} className={syncMeter >= 100 ? 'animate-bounce' : ''} />
                    <span className="font-black text-sm z-10 text-center leading-none mt-1">LIMIT BREAK</span>
                    <span className="text-[8px] uppercase z-10 mt-1">{syncMeter >= 100 ? 'READY!' : `${syncMeter}%`}</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default AlienEvent;
