
import React, { useState } from 'react';
import { InventoryItem, Rarity } from '../types';
import Card from './Card';
import { performPull, PULL_COST } from '../services/gameLogic';
import { Sparkles, Package, Gift, X, Star } from 'lucide-react';

interface GachaSceneProps {
  gems: number;
  pityCounter: number;
  onPullComplete: (items: InventoryItem[], gemsSpent: number) => void;
  onClose: () => void;
}

const GachaScene: React.FC<GachaSceneProps> = ({ gems, pityCounter, onPullComplete, onClose }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'reveal'>('idle');
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [currentPity, setCurrentPity] = useState(pityCounter);
  const [inspectItem, setInspectItem] = useState<InventoryItem | null>(null);
  
  const handlePull = async (amount: number) => {
    if (gems < amount * PULL_COST) {
      alert("Not enough Ether Crystals!");
      return;
    }

    setIsPulling(true);
    setPhase('opening');

    const newItems: InventoryItem[] = [];
    let tempPity = currentPity;

    for (let i = 0; i < amount; i++) {
      const { item, pityReset } = await performPull(tempPity);
      newItems.push(item);
      if (pityReset) tempPity = 0;
      else tempPity++;
    }

    setResults(newItems);
    setCurrentPity(tempPity);

    setTimeout(() => {
        setPhase('reveal');
    }, 2500); 
  };

  const finish = () => {
    onPullComplete(results, results.length * PULL_COST);
    setIsPulling(false);
    setPhase('idle');
    setResults([]);
  };

  const renderInspectModal = () => {
      if (!inspectItem) return null;

      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInspectItem(null)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-sm w-full animate-pop-in p-6">
                   <button onClick={() => setInspectItem(null)} className="absolute top-2 right-2 bg-popRed text-white p-1 border-2 border-popBlack hover:scale-110"><X size={16}/></button>
                   <h3 className="text-2xl font-black italic mb-4 uppercase text-center">{inspectItem.rarity === Rarity.LEGENDARY ? 'LEGENDARY FIND!' : 'ITEM DETAILS'}</h3>
                   
                   <div className="flex justify-center mb-6">
                       <div className="w-48">
                           <Card character={inspectItem} showStats />
                       </div>
                   </div>

                   <div className="space-y-4 mb-6 text-sm text-gray-600 font-bold bg-gray-50 p-4 border-2 border-gray-100 rounded">
                       <div>
                           <span className="text-popBlue uppercase text-xs tracking-widest">Description</span>
                           <p className="text-popBlack leading-tight">{inspectItem.description}</p>
                       </div>
                       
                       {inspectItem.type === 'character' && (
                           <div className="grid grid-cols-2 gap-2 text-xs">
                               <div>HP: {inspectItem.stats.maxHp}</div>
                               <div>ATK: {inspectItem.stats.atk}</div>
                               <div>SPD: {inspectItem.stats.speed}</div>
                               <div>DEF: {inspectItem.stats.def}</div>
                           </div>
                       )}

                       {inspectItem.type === 'weapon' && inspectItem.stats && (
                           <div className="text-popBlue">Stats: +{inspectItem.stats.atk} ATK, +{inspectItem.stats.critRate}% CRIT</div>
                       )}
                        {inspectItem.type === 'chip' && inspectItem.mainStat && (
                           <div className="text-popGreen">Main: {inspectItem.mainStat.type.toUpperCase()} +{inspectItem.mainStat.value}</div>
                       )}
                   </div>
              </div>
          </div>
      )
  };

  if (phase === 'opening') {
    return (
      <div className="absolute inset-0 z-50 bg-popYellow flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20"></div>
        <div className="relative animate-shake">
            <div className="w-48 h-64 md:w-64 md:h-80 bg-popPink border-4 border-popBlack shadow-brutal-lg rotate-3 flex flex-col items-center justify-center">
                <Gift size={80} className="text-white mb-4 animate-bounce" />
                <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase">RIPPING...</h2>
            </div>
        </div>
      </div>
    );
  }

  if (phase === 'reveal') {
    return (
      <div className="absolute inset-0 z-50 bg-popWhite flex flex-col items-center overflow-hidden">
        {renderInspectModal()}
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>
        
        {/* Header */}
        <div className="w-full bg-white border-b-4 border-popBlack p-4 z-10 shrink-0 shadow-lg">
            <h2 className="text-2xl md:text-5xl font-black text-popBlack text-center italic animate-slide-up">
                SUPPLY DROP
            </h2>
            <p className="text-center text-gray-500 text-xs md:text-sm font-bold mt-1">Tap items to inspect</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 w-full overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6 pb-24">
            {results.map((item, idx) => (
                <div 
                    key={item.id} 
                    className="animate-pop-in cursor-pointer hover:scale-105 transition-transform" 
                    style={{ animationDelay: `${idx * 150}ms` }}
                    onClick={() => setInspectItem(item)}
                >
                    {item.rarity === Rarity.LEGENDARY && (
                        <div className="absolute -top-2 -right-2 z-20 animate-spin-slow">
                            <Star className="text-popYellow fill-popYellow drop-shadow-md" size={32} />
                        </div>
                    )}
                    <Card character={item} showStats small />
                </div>
            ))}
            </div>
        </div>

        {/* Footer */}
        <div className="w-full p-4 md:p-6 bg-white border-t-2 border-popBlack flex justify-center shadow-[0_-4px_0px_rgba(0,0,0,0.05)] z-20 shrink-0">
            <button 
            onClick={finish}
            className="w-full md:w-auto px-8 md:px-12 py-3 md:py-4 bg-popBlack text-white font-bold text-lg md:text-xl uppercase tracking-wider rounded shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-gray-800"
            >
            Confirm & Collect
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-popWhite relative overflow-y-auto">
       <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none min-h-screen"></div>
       
       <div className="sticky top-0 z-30 p-4 w-full flex justify-between items-center bg-white/80 backdrop-blur-sm border-b-2 border-popBlack md:bg-transparent md:border-none">
           <button onClick={onClose} className="font-bold underline hover:text-popBlue decoration-4 flex items-center gap-1">
             <X size={20} /> EXIT
           </button>
           <div className="font-mono text-xs bg-white border-2 border-popBlack px-3 py-1 shadow-brutal-sm md:hidden">
             Pity: <span className="font-bold text-popPink">{currentPity}</span>/{90}
           </div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-start md:justify-center z-10 p-4 pb-20">
         <div className="mb-8 md:mb-12 text-center mt-4 md:mt-0">
             <div className="inline-block bg-popBlack text-popYellow px-4 py-1 font-bold text-sm mb-4 transform -rotate-2 shadow-brutal-sm">
                 SEASON 1: NEON DAWN
             </div>
             <h1 className="text-5xl md:text-8xl font-black text-popBlack leading-none mb-2 tracking-tighter drop-shadow-sm">
                 MYSTIC <span className="text-popPink">DROP</span>
             </h1>
             <p className="text-sm md:text-xl font-medium text-gray-500 max-w-md mx-auto">
                 Spend Gems to acquire Agents, Weapons, and Style. High rates for Legendary gear!
             </p>
         </div>
         
         <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-stretch w-full max-w-4xl px-2">
            {/* Single Pull */}
            <button 
              onClick={() => handlePull(1)}
              className="group relative flex-1 bg-white border-4 border-popBlack shadow-brutal-lg hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#1a1a1a] transition-all active:translate-y-1 active:shadow-none"
            >
               <div className="flex flex-row md:flex-col items-center justify-between md:justify-center p-4 md:p-8 gap-4 h-full">
                   <div className="w-16 h-16 md:w-32 md:h-32 bg-popBlue/10 flex items-center justify-center border-2 border-dashed border-popBlue/30 rounded-full shrink-0 group-hover:bg-popBlue/20 transition-colors">
                       <Sparkles className="text-popBlue group-hover:scale-110 transition-transform" size={32} />
                   </div>
                   <div className="text-left md:text-center flex-1">
                       <div className="text-xl md:text-3xl font-black uppercase italic">Single Pull</div>
                       <div className="text-xs md:text-sm font-bold text-gray-500 mt-1 md:mt-2 bg-gray-100 inline-block px-2 py-1 rounded border border-gray-300">
                           {PULL_COST} Gems
                       </div>
                   </div>
               </div>
            </button>

            {/* 10x Pull */}
            <button 
              onClick={() => handlePull(10)}
              className="group relative flex-1 bg-popYellow border-4 border-popBlack shadow-brutal-lg hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#1a1a1a] transition-all active:translate-y-1 active:shadow-none"
            >
               <div className="absolute -top-3 -right-3 md:-top-5 md:-right-5 bg-popPink text-white font-black text-xs md:text-lg px-3 py-1 md:px-6 md:py-2 border-2 border-popBlack shadow-brutal rotate-12 z-20 animate-bounce-small">
                   GUARANTEED 4★+
               </div>
               <div className="flex flex-row md:flex-col items-center justify-between md:justify-center p-4 md:p-8 gap-4 h-full">
                   <div className="w-16 h-16 md:w-32 md:h-32 bg-white/50 flex items-center justify-center border-2 border-popBlack rounded-full shrink-0 group-hover:bg-white transition-colors">
                       <Package size={40} className="text-popBlack group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="text-left md:text-center flex-1">
                       <div className="text-xl md:text-3xl font-black uppercase italic">10x Bundle</div>
                       <div className="text-xs md:text-sm font-bold text-popBlack mt-1 md:mt-2 bg-white/60 inline-block px-2 py-1 rounded border border-popBlack/20">
                           {PULL_COST * 10} Gems
                       </div>
                   </div>
               </div>
            </button>
         </div>
         
         <div className="mt-8 md:mt-12 font-mono text-sm bg-white border-2 border-popBlack px-6 py-3 shadow-brutal-sm hidden md:block">
           Legendary Pity: <span className="font-bold text-popPink">{currentPity}</span> / 90
         </div>
       </div>
    </div>
  );
};

export default GachaScene;
