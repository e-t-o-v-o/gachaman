
import React, { useEffect, useState } from 'react';
import { Quest, Character, InventoryItem, ElementType } from '../types';
import { Timer, CheckCircle, Map, Coins, Diamond, Skull, Users, ArrowRight, X, ListChecks } from 'lucide-react';

interface QuestBoardProps {
  quests: Quest[];
  roster: InventoryItem[];
  busyCharacterIds: string[];
  onStartQuest: (questId: string, characterIds: string[]) => void;
  onClaimQuest: (questId: string) => void;
  onCancelQuest: (questId: string) => void;
  onClose: () => void;
}

const QuestBoard: React.FC<QuestBoardProps> = ({ quests, roster, busyCharacterIds, onStartQuest, onClaimQuest, onCancelQuest, onClose }) => {
  const [now, setNow] = useState(Date.now());
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatchClick = (quest: Quest) => {
      setSelectedQuest(quest);
      setSelectedAgents([]);
  };

  const toggleAgent = (id: string) => {
      if (selectedAgents.includes(id)) {
          setSelectedAgents(prev => prev.filter(a => a !== id));
      } else {
          if (!selectedQuest) return;
          if (selectedAgents.length >= selectedQuest.requirements.partySize) return;
          setSelectedAgents(prev => [...prev, id]);
      }
  };

  const confirmDispatch = () => {
      if (!selectedQuest) return;
      onStartQuest(selectedQuest.id, selectedAgents);
      setSelectedQuest(null);
      setSelectedAgents([]);
  };

  const handleClaimAll = () => {
      quests.forEach(q => {
          const isCompleted = q.status === 'active' && q.startTime && (now - q.startTime) >= (q.duration * 1000);
          if (isCompleted || q.status === 'completed') {
              if (q.status !== 'completed') onClaimQuest(q.id); // Only claim active completed ones
          }
      });
  };

  const getElementIcon = (el: ElementType) => {
    switch(el) {
      case ElementType.PYRO: return '🔥';
      case ElementType.HYDRO: return '💧';
      case ElementType.DENDRO: return '🌿';
      case ElementType.ELECTRO: return '⚡';
      case ElementType.CRYO: return '❄️';
      default: return '';
    }
  };

  // Render Dispatch Modal
  const renderDispatchModal = () => {
      if (!selectedQuest) return null;
      
      const characters = roster.filter(i => i.type === 'character') as Character[];
      // Sort: Available first, then by level
      const sortedChars = characters.sort((a, b) => {
          const aBusy = busyCharacterIds.includes(a.id);
          const bBusy = busyCharacterIds.includes(b.id);
          if (aBusy && !bBusy) return 1;
          if (!aBusy && bBusy) return -1;
          return b.level - a.level;
      });

      const isValid = selectedAgents.length === selectedQuest.requirements.partySize;

      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedQuest(null)} />
              <div className="relative bg-white border-4 border-popBlack shadow-brutal-lg max-w-4xl w-full max-h-[90vh] flex flex-col animate-pop-in">
                  <div className="bg-popBlack text-white p-4 flex justify-between items-center">
                      <h3 className="text-xl md:text-2xl font-black italic">DISPATCH AGENTS</h3>
                      <button onClick={() => setSelectedQuest(null)}><X /></button>
                  </div>
                  
                  <div className="p-4 md:p-6 border-b-2 border-gray-200 bg-gray-50">
                      <h4 className="font-bold text-gray-500 text-sm uppercase tracking-widest mb-2">MISSION REQUIREMENTS</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4">
                          <div className="flex items-center gap-2 bg-white px-3 py-1 border border-popBlack shadow-sm text-xs md:text-sm">
                              <Users size={16} /> 
                              <span className="font-bold">{selectedAgents.length} / {selectedQuest.requirements.partySize} Agents</span>
                          </div>
                          {selectedQuest.requirements.minLevel && (
                              <div className="flex items-center gap-2 bg-white px-3 py-1 border border-popBlack shadow-sm text-popBlue text-xs md:text-sm">
                                  <span className="font-bold">Min Lvl {selectedQuest.requirements.minLevel}</span>
                              </div>
                          )}
                          {selectedQuest.requirements.requiredElement && (
                              <div className="flex items-center gap-2 bg-white px-3 py-1 border border-popBlack shadow-sm text-popRed text-xs md:text-sm">
                                  <span className="font-bold">Required: {selectedQuest.requirements.requiredElement}</span>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                      {sortedChars.map(char => {
                          const isBusy = busyCharacterIds.includes(char.id);
                          const isSelected = selectedAgents.includes(char.id);
                          const meetsLevel = !selectedQuest.requirements.minLevel || char.level >= selectedQuest.requirements.minLevel;
                          const meetsElement = !selectedQuest.requirements.requiredElement || char.element === selectedQuest.requirements.requiredElement;
                          const disabled = isBusy || (!isSelected && !meetsLevel) || (!isSelected && !meetsElement);

                          return (
                              <div 
                                key={char.id} 
                                onClick={() => !disabled && toggleAgent(char.id)}
                                className={`
                                    relative border-2 rounded p-2 cursor-pointer transition-all
                                    ${isSelected ? 'border-popGreen bg-green-50 ring-2 ring-popGreen' : 'border-gray-200 hover:border-popBlack'}
                                    ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                                `}
                              >
                                  {isSelected && <div className="absolute top-2 right-2 bg-popGreen text-white rounded-full p-1 z-10"><CheckCircle size={16}/></div>}
                                  {isBusy && <div className="absolute inset-0 bg-black/10 flex items-center justify-center font-black text-popRed rotate-12 uppercase border-2 border-popRed m-2">BUSY</div>}
                                  
                                  <img src={char.imageUrl} className="w-full h-24 object-cover mb-2 bg-gray-100 rounded" />
                                  <div className="font-bold text-sm truncate">{char.name}</div>
                                  <div className="flex justify-between text-xs font-mono text-gray-500 mt-1">
                                      <span>Lv.{char.level}</span>
                                      <span>{getElementIcon(char.element)}</span>
                                  </div>
                              </div>
                          )
                      })}
                  </div>

                  <div className="p-4 border-t-2 border-popBlack flex justify-end gap-4 bg-white">
                      <button onClick={() => setSelectedQuest(null)} className="px-6 py-2 font-bold text-gray-500 hover:text-black">CANCEL</button>
                      <button 
                        onClick={confirmDispatch} 
                        disabled={!isValid}
                        className={`px-6 md:px-8 py-2 md:py-3 font-black text-white uppercase tracking-widest shadow-brutal transition-all
                            ${isValid ? 'bg-popBlack hover:translate-y-1 hover:shadow-none' : 'bg-gray-300 cursor-not-allowed'}
                        `}
                      >
                          START MISSION
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const completedCount = quests.filter(q => q.status === 'active' && q.startTime && (now - q.startTime) >= (q.duration * 1000)).length;

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {renderDispatchModal()}

      {/* Header */}
      <div className="bg-popGreen border-b-4 border-popBlack p-4 md:p-6 flex flex-col md:flex-row justify-between items-center z-10 shadow-lg gap-4">
        <h2 className="text-2xl md:text-4xl font-black text-white italic flex items-center gap-4 drop-shadow-md">
           <Map size={32} className="text-white md:w-10 md:h-10" />
           BOUNTY BOARD
        </h2>
        
        <div className="flex gap-4">
            {completedCount > 0 && (
                <button 
                    onClick={handleClaimAll}
                    className="font-bold bg-white text-popGreen px-6 py-2 border-2 border-popBlack shadow-brutal hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2 animate-bounce-small"
                >
                    <ListChecks size={18}/> CLAIM ALL ({completedCount})
                </button>
            )}
            <button onClick={onClose} className="font-bold bg-white px-6 py-2 border-2 border-popBlack shadow-brutal hover:translate-y-1 hover:shadow-none transition-all">
                EXIT
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto pb-20">
            {quests.map(quest => {
                const isCompleted = quest.status === 'active' && quest.startTime && (now - quest.startTime) >= (quest.duration * 1000);
                const timeLeft = quest.startTime ? Math.max(0, Math.ceil((quest.duration * 1000 - (now - quest.startTime)) / 1000)) : quest.duration;
                const isHard = quest.requirements.minLevel && quest.requirements.minLevel > 3;

                return (
                    <div key={quest.id} className="bg-white border-4 border-popBlack shadow-brutal flex flex-col group hover:-translate-y-1 transition-transform relative overflow-hidden">
                        {/* Status Strip */}
                        <div className={`p-3 flex justify-between items-center border-b-2 border-popBlack ${quest.status === 'active' ? 'bg-popBlue' : 'bg-gray-100'}`}>
                            <span className={`font-black text-xs uppercase tracking-widest ${quest.status === 'active' ? 'text-white animate-pulse' : 'text-gray-500'}`}>
                                {quest.status === 'completed' ? 'DONE' : quest.status === 'active' ? 'IN PROGRESS' : 'AVAILABLE'}
                            </span>
                            {isHard && <span className="bg-popRed text-white text-[10px] px-2 font-bold uppercase rotate-3 shadow-sm">ELITE</span>}
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col relative">
                            {/* WANTED Stamp effect */}
                            <div className="absolute top-4 right-4 opacity-10 font-black text-4xl -rotate-12 pointer-events-none uppercase">
                                {quest.status === 'active' ? 'HUNTING' : 'WANTED'}
                            </div>

                            <h3 className="text-xl font-black leading-tight mb-2 uppercase">{quest.title}</h3>
                            <p className="text-gray-500 font-bold text-xs mb-4 flex-1">{quest.description}</p>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="bg-gray-100 border border-gray-300 px-2 py-1 text-[10px] font-black text-gray-600 flex items-center gap-1 uppercase">
                                    <Users size={12} /> {quest.requirements.partySize} AGENTS
                                </div>
                                {quest.requirements.requiredElement && (
                                    <div className="bg-popRed/10 border border-popRed/30 px-2 py-1 text-[10px] font-black text-popRed uppercase">
                                        REQ: {getElementIcon(quest.requirements.requiredElement)} {quest.requirements.requiredElement}
                                    </div>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="flex flex-col gap-2 mb-4 bg-gray-50 p-3 border-2 border-dashed border-gray-300 rounded">
                                <div className="flex justify-between items-center font-mono text-xs border-b border-gray-200 pb-2 mb-2">
                                     <span className="text-gray-400 font-bold uppercase">Estimated Time</span>
                                     <span className="flex items-center gap-2 font-bold text-popBlack"><Timer size={14} /> {Math.ceil(quest.duration / 60)}m</span>
                                </div>
                                <div className="flex justify-between items-center font-mono text-xs">
                                     <span className="text-gray-400 font-bold uppercase">Bounty</span>
                                     <div className="flex gap-3">
                                        {quest.reward.gold > 0 && <span className="flex items-center gap-1 text-popBlack font-bold"><Coins size={14} className="text-popYellow fill-current"/> {quest.reward.gold}</span>}
                                        {quest.reward.gems > 0 && <span className="flex items-center gap-1 text-popBlack font-bold"><Diamond size={14} className="text-popBlue fill-current"/> {quest.reward.gems}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-auto">
                                {quest.status === 'available' && (
                                    <button 
                                        onClick={() => handleDispatchClick(quest)}
                                        className="w-full py-3 bg-popBlack text-white font-black uppercase hover:bg-popBlue transition-colors border-2 border-transparent flex items-center justify-center gap-2 group-hover:shadow-lg"
                                    >
                                        DISPATCH SQUAD <ArrowRight size={16} />
                                    </button>
                                )}

                                {quest.status === 'active' && !isCompleted && (
                                    <div className="space-y-2">
                                        <div className="w-full bg-gray-200 h-6 relative overflow-hidden border border-gray-400 rounded-full">
                                            <div 
                                                className="h-full bg-popBlue transition-all duration-1000 striped-bar"
                                                style={{ width: `${100 - (timeLeft / quest.duration * 100)}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-popBlack">
                                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onCancelQuest(quest.id)}
                                            className="w-full text-[10px] font-bold text-gray-400 hover:text-popRed uppercase tracking-widest text-center"
                                        >
                                            Abort Mission
                                        </button>
                                    </div>
                                )}

                                {(isCompleted || quest.status === 'completed') && (
                                    <button 
                                        onClick={() => onClaimQuest(quest.id)}
                                        className="w-full py-3 bg-popGreen text-popBlack font-black uppercase flex items-center justify-center gap-2 hover:bg-green-400 transition-colors border-2 border-popBlack shadow-brutal-sm animate-bounce-small"
                                    >
                                        <CheckCircle size={20} /> CLAIM REWARD
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default QuestBoard;
