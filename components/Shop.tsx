
import React, { useEffect, useState } from 'react';
import { ShopItem, InventoryItem, Rarity } from '../types';
import Card from './Card';
import { ShoppingBag, Coins, Diamond, RefreshCw, X, Info, Star } from 'lucide-react';
import CharacterDetail from './CharacterDetail';

interface ShopProps {
  gold: number;
  gems: number;
  stock: ShopItem[];
  lastRefreshTime: number;
  onPurchase: (item: ShopItem) => void;
  onRefresh: (paid: boolean) => void;
  onClose: () => void;
}

const REFRESH_COST = 200; 
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; 

const Shop: React.FC<ShopProps> = ({ gold, gems, stock, lastRefreshTime, onPurchase, onRefresh, onClose }) => {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<string>('');
  const [inspectItem, setInspectItem] = useState<ShopItem | null>(null);
  
  // Calculate time remaining
  useEffect(() => {
    const updateTimer = () => {
        const now = Date.now();
        const nextRefresh = lastRefreshTime + REFRESH_INTERVAL_MS;
        const diff = nextRefresh - now;

        if (diff <= 0) {
            onRefresh(false); // Free refresh
        } else {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeUntilRefresh(`${h}h ${m}m ${s}s`);
        }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshTime, onRefresh]);

  const handleBuy = (shopItem: ShopItem) => {
    if (shopItem.soldOut) return;
    
    if (shopItem.currency === 'gold' && gold < shopItem.cost) {
      alert("Not enough Gold!");
      return;
    }
    if (shopItem.currency === 'gems' && gems < shopItem.cost) {
      alert("Not enough Gems!");
      return;
    }
    
    onPurchase(shopItem);
    if(inspectItem?.id === shopItem.id) setInspectItem(null);
  };

  const handlePaidRefresh = () => {
      if (gems < REFRESH_COST) {
          alert("Not enough Gems to restock!");
          return;
      }
      onRefresh(true);
  };

  const renderInspectModal = () => {
      if (!inspectItem) return null;
      
      const itemContent = inspectItem.item;
      // If it's a resource, we don't usually inspect, but if we did:
      if ('type' in itemContent && itemContent.type === 'resource') return null;

      const inventoryItem = itemContent as InventoryItem;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInspectItem(null)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-sm w-full animate-pop-in p-6">
                   <button onClick={() => setInspectItem(null)} className="absolute top-2 right-2 hover:text-popRed"><X /></button>
                   <h3 className="text-2xl font-black italic mb-4 uppercase">ITEM DETAILS</h3>
                   
                   <div className="flex justify-center mb-6">
                       <Card character={inventoryItem} showStats />
                   </div>

                   <div className="space-y-2 mb-6 text-sm text-gray-600 font-bold">
                       <p>{inventoryItem.description}</p>
                       {inventoryItem.type === 'weapon' && inventoryItem.stats && (
                           <div className="text-popBlue">Stats: +{inventoryItem.stats.atk} ATK, +{inventoryItem.stats.critRate}% CRIT</div>
                       )}
                        {inventoryItem.type === 'chip' && inventoryItem.mainStat && (
                           <div className="text-popGreen">Main: {inventoryItem.mainStat.type.toUpperCase()} +{inventoryItem.mainStat.value}</div>
                       )}
                   </div>

                   <button 
                        onClick={() => handleBuy(inspectItem)}
                        disabled={inspectItem.soldOut}
                        className={`w-full py-3 font-black text-lg uppercase flex items-center justify-center gap-2 border-2 border-popBlack shadow-brutal-sm transition-all
                            ${inspectItem.currency === 'gold' ? 'bg-popYellow' : 'bg-popBlue text-white'}
                        `}
                    >
                       {inspectItem.soldOut ? 'SOLD OUT' : `BUY FOR ${inspectItem.cost}`} {inspectItem.currency === 'gold' ? <Coins size={20}/> : <Diamond size={20}/>}
                    </button>
              </div>
          </div>
      )
  };

  const sortedStock = [...stock].sort((a, b) => b.cost - a.cost);
  const featuredItem = sortedStock[0];
  const regularStock = sortedStock.slice(1);

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {renderInspectModal()}

      {/* Header */}
      <div className="bg-popYellow border-b-4 border-popBlack p-4 md:p-6 flex flex-col md:flex-row justify-between items-center z-10 gap-4 shrink-0">
        <div>
            <h2 className="text-3xl md:text-5xl font-black text-popBlack italic flex items-center gap-2 md:gap-4 drop-shadow-sm">
            <ShoppingBag size={48} className="stroke-[1.5]" />
            NAKAMOTO'S
            </h2>
            <div className="flex items-center gap-2 mt-1">
                 <div className="text-xs font-bold font-mono text-popBlack bg-white px-2 py-1 rounded border border-popBlack">
                     REFRESH: {timeUntilRefresh}
                 </div>
                 <div className="bg-popBlack h-px w-8"></div>
                 <div className="text-[10px] font-black uppercase text-popBlack tracking-widest">Cyber-Implants & Gear</div>
            </div>
        </div>

        <div className="flex gap-4">
             <button 
                onClick={handlePaidRefresh} 
                className="font-bold bg-white px-3 py-2 border-2 border-popBlack shadow-brutal hover:shadow-none hover:translate-y-1 transition-all flex items-center gap-2 text-xs md:text-sm"
             >
               <RefreshCw size={14} /> RESTOCK ({REFRESH_COST} <Diamond size={10} className="fill-popBlue text-popBlue" />)
             </button>
             <button onClick={onClose} className="font-bold bg-popBlack text-white px-6 py-2 border-2 border-transparent shadow-brutal hover:bg-gray-800 transition-all text-sm">
                EXIT
             </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
         <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Featured Section */}
            <div className="bg-popBlack p-1">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-gray-700 p-6 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="absolute -right-10 -top-10 text-9xl text-white opacity-5 rotate-12 font-black italic">DEAL</div>
                    
                    <div className="relative z-10 text-center md:text-left">
                        <div className="bg-popRed text-white px-3 py-1 font-black text-xs inline-block mb-2 rotate-2 shadow-brutal-sm">FEATURED</div>
                        <h3 className="text-3xl md:text-5xl font-black text-white italic uppercase leading-none">
                            {'name' in featuredItem.item ? featuredItem.item.name : 'Heavy Resource Pack'}
                        </h3>
                        <p className="text-gray-400 mt-2 max-w-md">Limited time offer. High quality gear guaranteed to improve survival rates in the lower sectors.</p>
                        <button 
                            onClick={() => handleBuy(featuredItem)}
                            disabled={featuredItem.soldOut}
                            className="mt-6 bg-popYellow text-popBlack font-black text-xl px-8 py-3 border-2 border-white shadow-[4px_4px_0px_white] hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            {featuredItem.soldOut ? 'SOLD OUT' : `BUY NOW - ${featuredItem.cost}`} {featuredItem.currency === 'gems' ? '💎' : '🪙'}
                        </button>
                    </div>

                    <div className="relative z-10 flex-1 flex justify-center">
                        <div className="w-40 h-40 md:w-56 md:h-56 bg-white/10 rounded-full border-4 border-white/20 flex items-center justify-center animate-float">
                             {'type' in featuredItem.item && featuredItem.item.type === 'resource' ? (
                                 <Coins size={80} className="text-popYellow" />
                             ) : (
                                 <div className="scale-125"><Card character={featuredItem.item as InventoryItem} small /></div>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Grid */}
            <div>
                <h3 className="font-black text-2xl text-popBlack mb-4 flex items-center gap-2">
                    <span className="w-4 h-4 bg-popBlue rounded-full"></span> DAILY STOCK
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {regularStock.map(shopItem => {
                        const isPremium = shopItem.currency === 'gems';
                        const isResource = 'type' in shopItem.item && shopItem.item.type === 'resource';
                        
                        return (
                        <div key={shopItem.id} className={`
                            relative bg-white border-4 border-popBlack shadow-brutal flex flex-col transition-all hover:-translate-y-1
                            ${shopItem.soldOut ? 'opacity-60 grayscale' : ''}
                        `}>
                            {shopItem.soldOut && (
                                <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                                    <span className="text-2xl font-black text-white -rotate-12 border-4 border-white px-4 py-1">SOLD</span>
                                </div>
                            )}

                            <div className="p-2 border-b-2 border-popBlack flex justify-between items-center bg-gray-50">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    {isResource ? 'RESOURCE' : (shopItem.item as InventoryItem).type}
                                </div>
                                {isPremium && <Star size={12} className="fill-popYellow text-popYellow" />}
                            </div>
                            
                            {/* Item Preview */}
                            <div 
                                onClick={() => !isResource && !shopItem.soldOut && setInspectItem(shopItem)}
                                className={`flex-1 p-4 flex items-center justify-center bg-white min-h-[160px] ${!isResource ? 'cursor-pointer group' : ''}`}
                            >
                                {!isResource ? (
                                    <div className="transform group-hover:scale-105 transition-transform">
                                        <Card character={shopItem.item as InventoryItem} showStats small />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 bg-popYellow rounded-full border-2 border-popBlack flex items-center justify-center shadow-brutal-sm">
                                            <Coins size={32} className="text-popBlack" />
                                        </div>
                                        <div className="font-black text-xl">x{(shopItem.item as any).amount}</div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => handleBuy(shopItem)}
                                disabled={shopItem.soldOut}
                                className={`w-full py-3 font-black text-sm uppercase flex items-center justify-center gap-2 border-t-2 border-popBlack transition-all
                                    ${shopItem.currency === 'gold' ? 'bg-gray-100 hover:bg-popYellow' : 'bg-popBlue text-white hover:bg-blue-600'}
                                `}
                            >
                                {shopItem.cost} {shopItem.currency === 'gold' ? <Coins size={14}/> : <Diamond size={14} className="fill-current"/>}
                            </button>
                        </div>
                    )})}
                </div>
            </div>

         </div>
      </div>
    </div>
  );
};

export default Shop;
