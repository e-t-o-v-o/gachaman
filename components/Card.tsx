
import React from 'react';
import { InventoryItem, Rarity, ElementType } from '../types';
import { Star, Heart, Sword, Shield, Zap, Palette, Crosshair, Cpu, Cross } from 'lucide-react';

interface CardProps {
  character: InventoryItem;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  showStats?: boolean;
  bgOverride?: string;
}

const getRarityColor = (rarity: Rarity) => {
  switch (rarity) {
    case Rarity.PROMO: return 'bg-[linear-gradient(45deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)] bg-[length:400%_400%] animate-gradient text-white';
    case Rarity.LEGENDARY: return 'bg-popYellow text-popBlack';
    case Rarity.RARE: return 'bg-popPink text-white';
    default: return 'bg-popBlue text-white';
  }
};

const getElementIcon = (el: ElementType) => {
  switch(el) {
    case ElementType.PYRO: return '🔥';
    case ElementType.HYDRO: return '💧';
    case ElementType.DENDRO: return '🌿';
    case ElementType.ELECTRO: return '⚡';
    case ElementType.CRYO: return '❄️';
  }
};

const getRoleIcon = (role?: string) => {
    switch(role) {
        case 'VANGUARD': return <Shield size={12} fill="currentColor" />;
        case 'DUELIST': return <Sword size={12} fill="currentColor" />;
        case 'OPERATOR': return <Cross size={12} fill="currentColor" />;
        case 'DEADEYE': return <Crosshair size={12} fill="currentColor" />;
        default: return <Sword size={12} fill="currentColor" />;
    }
}

const Card: React.FC<CardProps> = ({ character: item, onClick, selected, small, showStats, bgOverride }) => {
  const headerColor = getRarityColor(item.rarity);
  const isPromo = item.rarity === Rarity.PROMO;
  
  // Render based on Type
  const renderContent = () => {
      if (item.type === 'character') {
          return (
             <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-10 grayscale pointer-events-none select-none">
                    {getElementIcon(item.element)}
                </div>
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ${isPromo ? 'filter contrast-125 saturate-150' : ''}`}
                    onError={(e) => {
                        // Fallback for broken images (e.g. broken Imgur link)
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${item.name}&backgroundColor=000000`;
                    }}
                />
                {isPromo && <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity mix-blend-overlay animate-pulse"></div>}
             </>
          );
      } else if (item.type === 'weapon') {
          return (
             <div className="w-full h-full bg-gray-800 flex items-center justify-center relative overflow-hidden group-hover:bg-gray-700 transition-colors">
                 <div className="absolute inset-0 bg-grid opacity-10"></div>
                 <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                     <Sword size={small ? 32 : 64} strokeWidth={1.5} />
                 </div>
                 <div className="absolute bottom-2 right-2 text-xs font-mono text-gray-400">
                     ATK+{item.stats?.atk}
                 </div>
             </div>
          );
      } else if (item.type === 'chip') {
        return (
           <div className="w-full h-full bg-gray-900 flex items-center justify-center relative overflow-hidden group-hover:bg-gray-800 transition-colors">
               <div className="absolute inset-0 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-green-900/40 to-transparent"></div>
               <div className="text-popGreen transform group-hover:scale-110 transition-transform duration-300">
                   <Cpu size={small ? 32 : 64} strokeWidth={1.5} />
               </div>
               <div className="absolute bottom-2 right-2 text-xs font-mono text-popGreen font-bold">
                   MOD
               </div>
           </div>
        );
      } else if (item.type === 'cosmetic') {
          return (
              <div className={`w-full h-full ${item.style} flex items-center justify-center shadow-inner relative`}>
                  <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                  <div className="bg-white/90 p-2 rounded-full shadow-lg z-10">
                      <Palette size={small ? 20 : 32} className="text-popBlack" />
                  </div>
              </div>
          );
      }
  };

  const renderStats = () => {
      if (item.type === 'character' && showStats && !small) {
           return (
            <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 p-1 rounded border border-gray-200">
                <div className="flex items-center gap-1"><Heart size={10} className="text-popRed" fill="currentColor"/> {item.stats.maxHp}</div>
                <div className="flex items-center gap-1"><Sword size={10} className="text-popBlue" fill="currentColor"/> {item.stats.atk}</div>
                <div className="flex items-center gap-1"><Shield size={10} className="text-popGreen" fill="currentColor"/> {item.stats.def}</div>
                <div className="flex items-center gap-1"><Zap size={10} className="text-popYellow" fill="currentColor"/> {item.stats.speed}</div>
            </div>
           );
      }
      if (item.type === 'weapon' && showStats && !small && item.stats) {
          return (
            <div className="mt-3 flex gap-2 text-[10px] font-bold text-gray-600 bg-gray-100 p-1 rounded border border-gray-200">
                <div className="flex items-center gap-1"><Sword size={10} className="text-popRed"/> +{item.stats.atk}</div>
                <div className="flex items-center gap-1"><Crosshair size={10} className="text-popBlue"/> +{item.stats.critRate}%</div>
            </div>
          );
      }
      if (item.type === 'chip' && showStats && !small && item.mainStat) {
          return (
            <div className="mt-3 flex flex-col gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 p-1 rounded border border-gray-200">
                <div className="flex items-center gap-1 text-popGreen truncate"><Cpu size={10}/> {item.mainStat.type.substring(0,3).toUpperCase()} +{item.mainStat.value}</div>
            </div>
          );
      }
      return null;
  };

  // If item is character and has bgOverride, use it. But handle Tailwind class overrides correctly.
  const containerStyle: React.CSSProperties = {};
  let backgroundClass = 'bg-gray-50';
  
  if (bgOverride) {
      if (bgOverride.startsWith('bg-')) {
          backgroundClass = bgOverride;
      } else {
          containerStyle.background = bgOverride;
      }
  } else if (item.type === 'character' && item.equippedBackgroundId) {
      // The parent usually passes bgOverride, but fallback just in case
      backgroundClass = 'bg-transparent'; 
  }

  return (
    <div 
      onClick={onClick}
      className={`
        relative group cursor-pointer transition-all duration-300
        ${small ? 'aspect-[3/4] min-w-[80px]' : 'aspect-[3/5] w-full max-w-[208px]'} 
        bg-white border-2 
        ${isPromo ? 'border-transparent shadow-[0_0_15px_rgba(0,255,255,0.5)] ring-2 ring-transparent bg-origin-border' : 'border-popBlack'}
        ${selected ? 'shadow-brutal-lg -translate-y-2 ring-2 ring-offset-2 ring-popBlack' : 'shadow-brutal hover:-translate-y-1 hover:shadow-brutal-lg'}
        flex flex-col overflow-hidden rounded-lg
      `}
      style={isPromo ? { backgroundImage: 'linear-gradient(white, white), linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000)', backgroundClip: 'padding-box, border-box' } : {}}
    >
      {/* Header / Rarity Strip */}
      <div className={`h-6 md:h-8 ${headerColor} border-b-2 border-popBlack flex items-center justify-between px-2`}>
        <div className="flex gap-0.5">
          {Array.from({ length: item.rarity === Rarity.PROMO ? 1 : item.rarity }).map((_, i) => (
            <Star key={i} size={small ? 8 : 10} fill="currentColor" strokeWidth={1} />
          ))}
          {isPromo && <span className="text-[10px] font-black italic">PROMO</span>}
        </div>
        <div className="font-bold text-[8px] md:text-[10px] uppercase tracking-widest">{item.type.substring(0, 3)}</div>
      </div>

      {/* Image Container */}
      <div className={`relative flex-1 overflow-hidden ${backgroundClass}`} style={containerStyle}>
         {/* Background Fallback for Equipped items if no override provided */}
         {item.type === 'character' && item.equippedBackgroundId && !bgOverride && (
             <div className="absolute inset-0 bg-gray-100" /> 
         )}
         
         {renderContent()}
         
         {/* Level Badge */}
         {item.level && (
             <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm font-mono border border-white/20">
                 Lv.{item.level}
             </div>
         )}
         
         {/* Role Icon */}
         {item.type === 'character' && (
             <div className="absolute top-1 left-1 bg-black/60 text-white p-1 rounded-full border border-white/20">
                 {getRoleIcon(item.role)}
             </div>
         )}
      </div>

      {/* Info Section */}
      <div className="border-t-2 border-popBlack bg-white p-2 relative z-10">
        <div className="flex justify-between items-start">
            <h3 className={`font-black ${small ? 'text-[10px]' : 'text-sm md:text-lg'} leading-tight truncate w-full ${isPromo ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600' : ''}`}>
            {item.name}
            </h3>
        </div>
        
        {!small && (
          <p className="text-xs text-gray-500 truncate font-medium mt-1 uppercase tracking-wide">
             {item.type === 'character' ? item.title : item.description}
          </p>
        )}

        {renderStats()}
      </div>

      {/* New Badge */}
      {item.isNew && (
        <div className="absolute top-8 right-2 bg-popRed text-white text-[9px] px-2 py-0.5 border border-popBlack shadow-brutal-sm font-bold rotate-12 z-20">
          NEW!
        </div>
      )}
    </div>
  );
};

export default Card;