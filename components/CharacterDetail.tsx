
import React, { useState, useMemo } from 'react';
import { Character, InventoryItem, Weapon, Cosmetic, ModChip, Skill, UpgradeResult } from '../types';
import { Star, X, Sword, Shield, Heart, Zap, Palette, ArrowLeft, Cpu, Crosshair, Eye, Gauge, User, Clock, ArrowUpCircle, CheckCircle, Hammer, Lock } from 'lucide-react';
import Card from './Card';
import { calculateComputedStats, simulateUpgrade, getFodderXp, calculateBaseStats } from '../services/gameLogic';

interface ItemDetailProps {
  item: InventoryItem;
  inventory: InventoryItem[];
  team?: string[];
  onEquip?: (charId: string, itemId: string, slot: 'weapon' | 'background' | 'chip') => void;
  onUpgrade?: (targetId: string, materialIds: string[]) => void;
  onClose: () => void;
}

const CharacterDetail: React.FC<ItemDetailProps> = ({ item, inventory, team, onEquip, onUpgrade, onClose }) => {
  const [tab, setTab] = useState<'info' | 'upgrade' | 'refine'>('info');
  const [selectingSlot, setSelectingSlot] = useState<'weapon' | 'background' | 'chip' | null>(null);
  
  // Upgrade State
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  
  // Refine State
  const [refineMaterial, setRefineMaterial] = useState<string | null>(null);

  // Casts for Character view
  const character = item.type === 'character' ? (item as Character) : null;
  const equippedWeapon = character ? inventory.find(i => i.id === character.equippedWeaponId) as Weapon | undefined : undefined;
  const equippedBg = character ? inventory.find(i => i.id === character.equippedBackgroundId) as Cosmetic | undefined : undefined;
  const equippedChip = character ? inventory.find(i => i.id === character.equippedChipId) as ModChip | undefined : undefined;
  const bgStyle = equippedBg ? equippedBg.style : undefined;
  const finalStats = character ? calculateComputedStats(character, inventory) : null;

  // Upgrade Calculations
  const upgradePreview: UpgradeResult | null = useMemo(() => {
      if (selectedMaterials.length === 0) return null;
      const materials = inventory.filter(i => selectedMaterials.includes(i.id));
      return simulateUpgrade(item, materials);
  }, [item, selectedMaterials, inventory]);

  const toggleMaterial = (id: string) => {
      if (selectedMaterials.includes(id)) {
          setSelectedMaterials(prev => prev.filter(m => m !== id));
      } else {
          setSelectedMaterials(prev => [...prev, id]);
      }
  };

  const handleConfirmUpgrade = () => {
      if (onUpgrade && selectedMaterials.length > 0) {
          onUpgrade(item.id, selectedMaterials);
          setSelectedMaterials([]);
      }
  };
  
  const handleConfirmRefine = () => {
      if (onUpgrade && refineMaterial) {
          onUpgrade(item.id, [refineMaterial]); 
          setRefineMaterial(null);
      }
  };

  const handleSelect = (selectedItem: InventoryItem) => {
      if (character && onEquip) {
        if (selectingSlot === 'weapon' && selectedItem.type === 'weapon') {
            onEquip(character.id, selectedItem.id, 'weapon');
        } else if (selectingSlot === 'background' && selectedItem.type === 'cosmetic') {
            onEquip(character.id, selectedItem.id, 'background');
        } else if (selectingSlot === 'chip' && selectedItem.type === 'chip') {
            onEquip(character.id, selectedItem.id, 'chip');
        }
      }
      setSelectingSlot(null);
  };

  const findItemOwner = (itemId: string): Character | undefined => {
      return inventory.find(i => 
          i.type === 'character' && 
          ((i as Character).equippedWeaponId === itemId || 
           (i as Character).equippedBackgroundId === itemId || 
           (i as Character).equippedChipId === itemId)
      ) as Character | undefined;
  }

  const renderInventorySelector = () => {
      const items = inventory.filter(i => {
          if (selectingSlot === 'weapon') return i.type === 'weapon';
          if (selectingSlot === 'background') return i.type === 'cosmetic';
          if (selectingSlot === 'chip') return i.type === 'chip';
          return false;
      });

      return (
          <div className="absolute inset-0 z-50 bg-white flex flex-col animate-slide-up">
              <div className="p-4 border-b-2 border-popBlack flex items-center gap-4 bg-gray-50">
                  <button onClick={() => setSelectingSlot(null)} className="p-2 hover:bg-gray-200 rounded">
                      <ArrowLeft />
                  </button>
                  <h3 className="font-black text-xl uppercase">Select {selectingSlot}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start">
                  {items.map(i => {
                      const owner = findItemOwner(i.id);
                      const isEquippedByCurrent = character && owner?.id === character.id;
                      const isEquippedByOther = owner && !isEquippedByCurrent;

                      return (
                      <div key={i.id} onClick={() => handleSelect(i)} className="relative group cursor-pointer">
                          {isEquippedByCurrent && (
                              <div className="absolute top-2 right-2 z-20 bg-popGreen text-popBlack text-[10px] font-black px-2 py-1 border border-popBlack shadow-brutal-sm rounded-full">
                                  EQUIPPED
                              </div>
                          )}
                          {isEquippedByOther && (
                              <div className="absolute top-2 right-2 z-20 bg-popYellow text-popBlack text-[10px] font-black px-2 py-1 border border-popBlack shadow-brutal-sm rounded-full max-w-[90%] truncate">
                                  ON {owner.name.toUpperCase()}
                              </div>
                          )}
                          <div className={`transition-transform ${isEquippedByCurrent ? 'ring-4 ring-popGreen ring-offset-2' : ''} ${isEquippedByOther ? 'opacity-90' : ''}`}>
                             <Card character={i} showStats small />
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      );
  };

  const renderUpgradeTab = () => {
      // Filter potential fodder: Same Type, Not Self, Not Equipped, Not in Team
      const fodder = inventory.filter(i => 
          i.id !== item.id && 
          i.type === item.type && 
          !findItemOwner(i.id) &&
          !(team && team.includes(i.id))
      );

      return (
          <div className="flex flex-col h-full animate-slide-up">
               <div className="flex-1 overflow-y-auto p-1">
                   {/* Progress Preview */}
                   <div className="bg-popBlack text-white p-4 mb-4 border-2 border-popBlack shadow-brutal-sm">
                       <div className="flex justify-between items-end mb-2">
                           <div>
                               <div className="text-gray-400 font-bold text-xs uppercase tracking-widest">Current Level</div>
                               <div className="text-4xl font-black italic flex items-baseline gap-2">
                                   {item.level}
                                   {upgradePreview && upgradePreview.newLevel > item.level && (
                                       <span className="text-popGreen animate-pulse">
                                           <ArrowUpCircle className="inline w-6 h-6 mx-1"/> 
                                           {upgradePreview.newLevel}
                                       </span>
                                   )}
                               </div>
                           </div>
                           <div className="text-right">
                               <div className="text-popYellow font-bold text-xl">
                                   XP {upgradePreview ? upgradePreview.newXp : item.xp} / {upgradePreview ? upgradePreview.newMaxXp : item.maxXp}
                               </div>
                           </div>
                       </div>
                       {/* XP Bar */}
                       <div className="h-4 bg-gray-700 w-full rounded-full overflow-hidden border border-gray-500 relative">
                           <div 
                                className="h-full bg-popBlue transition-all duration-300"
                                style={{ width: `${(item.xp / item.maxXp) * 100}%` }}
                           />
                           {upgradePreview && (
                               <div 
                                    className="absolute top-0 left-0 h-full bg-popGreen/50 transition-all duration-300 animate-pulse"
                                    style={{ width: `${(upgradePreview.newXp / upgradePreview.newMaxXp) * 100}%`, minWidth: '2%' }}
                               />
                           )}
                       </div>
                   </div>

                   {/* Stat Changes */}
                   <div className="grid grid-cols-2 gap-4 mb-6 bg-green-50 p-4 border-2 border-popGreen border-dashed">
                        {character && upgradePreview?.newStats && (
                           <>
                                <StatChange label="HP" oldVal={character.stats.maxHp} newVal={upgradePreview.newStats.maxHp} />
                                <StatChange label="ATK" oldVal={character.stats.atk} newVal={upgradePreview.newStats.atk} />
                           </>
                        )}
                        {item.type === 'weapon' && upgradePreview?.weaponStats && (
                           <>
                                <StatChange label="ATK" oldVal={(item as Weapon).stats.atk} newVal={upgradePreview.weaponStats.atk} />
                                <StatChange label="CRIT" oldVal={(item as Weapon).stats.critRate} newVal={upgradePreview.weaponStats.critRate} suffix="%" />
                           </>
                        )}
                   </div>

                   <h4 className="font-bold text-gray-500 uppercase tracking-widest mb-2">Select Materials</h4>
                   <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                       {fodder.map(mat => {
                           const isSelected = selectedMaterials.includes(mat.id);
                           return (
                               <div key={mat.id} onClick={() => toggleMaterial(mat.id)} className={`relative cursor-pointer transition-transform active:scale-95 ${isSelected ? 'opacity-50 ring-4 ring-popRed' : ''}`}>
                                   {isSelected && <div className="absolute inset-0 z-20 flex items-center justify-center"><CheckCircle className="text-popRed w-8 h-8 bg-white rounded-full"/></div>}
                                   <div className="absolute top-1 right-1 z-10 bg-black text-white text-[10px] px-1 font-bold">+{getFodderXp(mat)} XP</div>
                                   <Card character={mat} small />
                               </div>
                           )
                       })}
                       {fodder.length === 0 && (
                           <div className="col-span-full text-center text-gray-400 py-8 font-bold">No upgrade materials available.</div>
                       )}
                   </div>
               </div>

               <div className="border-t-2 border-popBlack p-4 bg-white z-10">
                   <button 
                       onClick={handleConfirmUpgrade}
                       disabled={selectedMaterials.length === 0}
                       className={`w-full py-4 text-xl font-black uppercase tracking-widest border-2 border-popBlack shadow-brutal flex items-center justify-center gap-2
                           ${selectedMaterials.length > 0 ? 'bg-popGreen hover:bg-green-400 hover:-translate-y-1' : 'bg-gray-300 cursor-not-allowed'}
                       `}
                   >
                       UPGRADE <ArrowUpCircle size={24} />
                   </button>
               </div>
          </div>
      )
  };

  const renderRefineTab = () => {
      const duplicates = inventory.filter(i => 
          i.id !== item.id && 
          i.name === item.name &&
          i.rarity === item.rarity &&
          !findItemOwner(i.id) &&
          !(team && team.includes(i.id))
      );

      const currentRank = item.rank || 1;
      const isMaxRank = currentRank >= 5;

      return (
          <div className="flex flex-col h-full animate-slide-up">
              <div className="flex-1 p-6 text-center overflow-y-auto">
                  <div className="mb-8">
                      <div className="text-gray-400 font-bold uppercase tracking-widest mb-2">Current Rank</div>
                      <div className="text-6xl font-black text-popBlue drop-shadow-md">{currentRank}</div>
                      <div className="text-sm font-bold text-gray-500 mt-2">Rank Up Bonus: <span className="text-popGreen">+5% Stats per Rank</span></div>
                  </div>

                  {!isMaxRank ? (
                      <>
                        <h4 className="font-bold text-gray-500 uppercase tracking-widest mb-4">Select Duplicate to Refine</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-center">
                            {duplicates.map(d => (
                                <div key={d.id} onClick={() => setRefineMaterial(refineMaterial === d.id ? null : d.id)} className={`relative cursor-pointer ${refineMaterial === d.id ? 'ring-4 ring-popPink scale-105' : ''}`}>
                                     {refineMaterial === d.id && <div className="absolute inset-0 z-20 flex items-center justify-center"><CheckCircle className="text-popPink w-8 h-8 bg-white rounded-full"/></div>}
                                     <Card character={d} small />
                                </div>
                            ))}
                        </div>
                        {duplicates.length === 0 && (
                            <div className="bg-gray-100 p-8 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="font-bold text-gray-400">No duplicate items found.</p>
                                <p className="text-xs text-gray-400 mt-2">Pull more copies from the Summon portal.</p>
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="bg-popYellow/20 p-8 border-4 border-popYellow rounded-lg">
                          <h3 className="text-2xl font-black text-popYellow uppercase">MAX RANK ACHIEVED</h3>
                      </div>
                  )}
              </div>

              {!isMaxRank && (
                  <div className="border-t-2 border-popBlack p-4 bg-white z-10 shrink-0">
                   <button 
                       onClick={handleConfirmRefine}
                       disabled={!refineMaterial}
                       className={`w-full py-4 text-xl font-black uppercase tracking-widest border-2 border-popBlack shadow-brutal flex items-center justify-center gap-2
                           ${refineMaterial ? 'bg-popPink text-white hover:bg-pink-400 hover:-translate-y-1' : 'bg-gray-300 cursor-not-allowed'}
                       `}
                   >
                       REFINE <Hammer size={24} />
                   </button>
                  </div>
              )}
          </div>
      )
  };

  const StatChange = ({ label, oldVal, newVal, suffix = '' }: { label: string, oldVal: number, newVal: number, suffix?: string }) => (
      <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-gray-500">{label}</span>
          <div className="flex items-center gap-2">
              <span className="text-gray-800">{oldVal}{suffix}</span>
              <span className="text-gray-400">→</span>
              <span className="text-popGreen text-lg">{newVal}{suffix}</span>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-popBlack/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl bg-white md:border-4 border-popBlack md:shadow-brutal-lg flex flex-col lg:flex-row overflow-hidden animate-pop-in h-full md:h-[90vh]">
        
        {selectingSlot && renderInventorySelector()}

        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-popRed text-white p-2 border-2 border-popBlack shadow-brutal hover:scale-110 transition-transform rounded-full lg:rounded-none">
          <X size={24} />
        </button>

        {/* Left: Image Preview */}
        <div className={`w-full lg:w-5/12 h-[30vh] lg:h-full relative overflow-hidden flex items-center justify-center p-8 lg:border-r-4 border-b-4 lg:border-b-0 border-popBlack ${bgStyle || 'bg-gray-100'}`}>
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 flex gap-1 z-10">
                {Array.from({ length: item.rarity }).map((_, i) => (
                    <Star key={i} className="fill-popYellow text-popBlack" size={24} />
                ))}
            </div>
            {item.type === 'character' ? (
                <img src={(item as Character).imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-xl z-10" />
            ) : (
                <div className="flex items-center justify-center w-full h-full text-9xl text-gray-400">
                    {item.type === 'weapon' && <Sword size={128} />}
                    {item.type === 'chip' && <Cpu size={128} />}
                    {item.type === 'cosmetic' && <Palette size={128} />}
                </div>
            )}
            <div className="absolute bottom-4 left-4 bg-white border-2 border-popBlack px-3 py-1 font-bold text-sm shadow-brutal-sm z-10 flex gap-2">
                <span>LVL {item.level}</span>
                <span className="text-popBlue">R{item.rank || 1}</span>
            </div>
        </div>

        {/* Right: Info & Config */}
        <div className="w-full lg:w-7/12 flex flex-col overflow-hidden bg-white flex-1">
            
            {/* Tab Header */}
            <div className="flex border-b-4 border-popBlack overflow-x-auto shrink-0">
                <button 
                    onClick={() => setTab('info')}
                    className={`flex-1 py-4 px-2 font-black uppercase tracking-widest text-sm md:text-lg transition-colors ${tab === 'info' ? 'bg-popBlue text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                    DETAILS
                </button>
                <button 
                    onClick={() => setTab('upgrade')}
                    className={`flex-1 py-4 px-2 font-black uppercase tracking-widest text-sm md:text-lg transition-colors ${tab === 'upgrade' ? 'bg-popGreen text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                    UPGRADE
                </button>
                <button 
                    onClick={() => setTab('refine')}
                    className={`flex-1 py-4 px-2 font-black uppercase tracking-widest text-sm md:text-lg transition-colors ${tab === 'refine' ? 'bg-popPink text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                    REFINE
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {tab === 'info' && (
                   <>
                        <div className="mb-6">
                            {character && (
                                <div className={`text-sm font-black uppercase tracking-widest text-popBlack mb-1`}>{character.element} Class</div>
                            )}
                            {item.restrictedRole && (
                                 <div className={`text-xs font-bold uppercase tracking-widest text-popRed mb-1 flex items-center gap-1`}><Lock size={12}/> {item.restrictedRole} ONLY</div>
                            )}
                            <h2 className="text-4xl md:text-5xl font-black text-popBlack italic leading-none mb-2">{item.name}</h2>
                            <div className="text-lg md:text-xl font-medium text-gray-500 italic">"{item.description}"</div>
                        </div>

                        {/* Equipment Slots (Only for Characters) */}
                        {character && (
                            <div className="flex flex-wrap gap-2 md:gap-4 mb-8">
                                <EquipmentSlot label="WEAPON" icon={<Sword size={14}/>} item={equippedWeapon} onClick={() => setSelectingSlot('weapon')} />
                                <EquipmentSlot label="MOD CHIP" icon={<Cpu size={14}/>} item={equippedChip} onClick={() => setSelectingSlot('chip')} />
                                <EquipmentSlot label="STYLE" icon={<Palette size={14}/>} item={equippedBg} onClick={() => setSelectingSlot('background')} />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Detailed Stats */}
                            <div className="flex-1">
                                <h3 className="text-lg font-black bg-popBlack text-white inline-block px-2 py-1 mb-4 -rotate-1 shadow-brutal-sm">STATS</h3>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-6 bg-gray-50 p-4 border-2 border-gray-100 rounded">
                                    {character && finalStats ? (
                                        <>
                                            <StatRow icon={<Heart size={14} />} label="Health" value={finalStats.maxHp} base={character.stats.maxHp} />
                                            <StatRow icon={<Sword size={14} />} label="Attack" value={finalStats.atk} base={character.stats.atk} />
                                            <StatRow icon={<Shield size={14} />} label="Defense" value={finalStats.def} base={character.stats.def} />
                                            <StatRow icon={<Zap size={14} />} label="Speed" value={finalStats.speed} base={character.stats.speed} />
                                            <div className="col-span-2 h-px bg-gray-200 my-2"></div>
                                            <StatRow icon={<Crosshair size={14} />} label="Crit Rate" value={finalStats.critRate} suffix="%" />
                                            <StatRow icon={<Sword size={14} className="text-popRed" />} label="Crit Dmg" value={finalStats.critDmg} suffix="%" />
                                            <StatRow icon={<Eye size={14} />} label="Accuracy" value={finalStats.accuracy} suffix="%" />
                                            <StatRow icon={<Gauge size={14} />} label="Evasion" value={finalStats.evasion} suffix="%" />
                                        </>
                                    ) : item.type === 'weapon' ? (
                                        <>
                                            <StatRow icon={<Sword size={14} />} label="Attack" value={(item as Weapon).stats.atk} />
                                            <StatRow icon={<Crosshair size={14} />} label="Crit Rate" value={(item as Weapon).stats.critRate} suffix="%" />
                                            <StatRow icon={<Zap size={14} />} label="Armor Pen" value={(item as Weapon).stats.armorPen} suffix="%" />
                                            {(item as Weapon).bonusStat && (
                                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                                                    <div className="flex justify-between items-center text-popGreen font-bold text-sm">
                                                        <span>BONUS: {(item as Weapon).bonusStat!.type.toUpperCase()}</span>
                                                        <span>+{(item as Weapon).bonusStat!.value}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : item.type === 'chip' ? (
                                         <StatRow icon={<Cpu size={14} />} label={(item as ModChip).mainStat.type} value={(item as ModChip).mainStat.value} />
                                    ) : null}
                                </div>
                            </div>
                            {/* Skills (Only for Characters) */}
                            {character && (
                                <div className="flex-1">
                                    <h3 className="text-lg font-black bg-popBlue text-white inline-block px-2 py-1 mb-4 rotate-1 shadow-brutal-sm">SKILLS</h3>
                                    <div className="space-y-3">
                                        <SkillRow label="Normal" skill={character.skills.normal} />
                                        <SkillRow label="Skill" skill={character.skills.skill} />
                                        <SkillRow label="Ultimate" skill={character.skills.ultimate} isUlt />
                                    </div>
                                </div>
                            )}
                        </div>
                   </>
                )}
                {tab === 'upgrade' && renderUpgradeTab()}
                {tab === 'refine' && renderRefineTab()}
            </div>
        </div>
      </div>
    </div>
  );
};

const EquipmentSlot = ({ label, icon, item, onClick }: any) => (
    <div onClick={onClick} className="flex-1 min-w-[100px] border-2 border-dashed border-gray-400 rounded-lg p-2 cursor-pointer hover:bg-gray-50 hover:border-popBlack transition-all group active:scale-95">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mb-1 group-hover:text-popBlack">
            {icon} {label}
        </div>
        {item ? (
             <div className="flex items-center gap-2 overflow-hidden">
                 <div className={`w-8 h-8 ${item.type === 'cosmetic' ? item.style : 'bg-gray-800'} border border-black rounded flex items-center justify-center text-white shrink-0 shadow-sm`}>
                     {item.type === 'weapon' && <Sword size={16} />}
                     {item.type === 'chip' && <Cpu size={16} />}
                     {item.type === 'cosmetic' && <Palette size={16} className="text-popBlack"/>}
                 </div>
                 <div className="flex-1 min-w-0">
                     <div className="font-bold text-xs truncate">{item.name}</div>
                     {item.type === 'weapon' && <div className="text-[9px] text-gray-500 font-mono">ATK+{item.stats.atk}</div>}
                 </div>
             </div>
        ) : (
            <div className="h-8 flex items-center text-gray-300 font-bold text-xs">
                Select...
            </div>
        )}
    </div>
);

const StatRow = ({ icon, label, value, base, suffix = '' }: any) => {
    const bonus = base !== undefined ? value - base : 0;
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                {icon} {label}
            </div>
            <div className="font-mono font-bold text-sm flex items-baseline gap-1">
                {value}{suffix}
                {bonus > 0 && <span className="text-popBlue text-[10px]">(+{bonus})</span>}
            </div>
        </div>
    )
};

const SkillRow = ({ label, skill, isUlt }: { label: string, skill: Skill, isUlt?: boolean }) => (
    <div className={`p-3 border-2 border-popBlack flex flex-col shadow-brutal-sm ${isUlt ? 'bg-popPink text-white' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-1">
             <div className="font-bold text-[10px] uppercase tracking-widest opacity-70 flex items-center gap-2">
                 {label}
                 {skill.cooldown > 0 && (
                     <span className="flex items-center gap-1 bg-black/20 px-1 rounded text-[9px] font-mono border border-white/20">
                         <Clock size={8}/> {skill.cooldown}T
                     </span>
                 )}
             </div>
             <div className="flex gap-1">
                {skill.isAOE && <span className="text-[9px] bg-black text-white px-1 font-bold rounded-sm border border-white">AOE</span>}
                {skill.isHeal && <span className="text-[9px] bg-popGreen text-black px-1 font-bold rounded-sm border border-black">HEAL</span>}
             </div>
        </div>
        <div className="font-black text-sm italic">{skill.name}</div>
        <div className="text-xs opacity-80 mt-1 font-medium leading-tight">{skill.description}</div>
    </div>
);

export default CharacterDetail;
