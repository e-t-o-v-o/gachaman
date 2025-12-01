
import React from 'react';
import { CAMPAIGN_STAGES } from '../services/gameLogic';
import { Lock, MapPin, Skull, Trophy, Star, Play, AlertTriangle, ShieldCheck, Sword } from 'lucide-react';
import { Rarity } from '../types';

interface CampaignMapProps {
    unlockedStage: number;
    clearedStages: Record<number, number>;
    onSelectStage: (stageId: number) => void;
    onClose: () => void;
    teamCP: number;
}

const CampaignMap: React.FC<CampaignMapProps> = ({ unlockedStage, clearedStages, onSelectStage, onClose, teamCP }) => {
    
    return (
        <div className="flex flex-col h-full bg-popBlack text-white relative overflow-hidden">
            {/* Background Map Effect */}
            <div className="absolute inset-0 opacity-20">
                 <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border-4 border-gray-700 rounded-3xl transform rotate-3"></div>
                 <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] border-4 border-gray-700 rounded-full"></div>
            </div>

            <div className="bg-popBlack border-b-4 border-popYellow p-4 md:p-6 flex justify-between items-center z-10 shrink-0">
                <div>
                    <h2 className="text-2xl md:text-4xl font-black italic flex items-center gap-4 text-popYellow drop-shadow-md">
                    <MapPin size={32} />
                    CAMPAIGN MAP
                    </h2>
                    <div className="text-xs font-bold font-mono text-gray-400 mt-1">
                        CURRENT TEAM CP: <span className="text-white">{teamCP}</span>
                    </div>
                </div>
                <button onClick={onClose} className="font-bold bg-white text-popBlack px-4 py-2 border-2 border-transparent shadow-brutal hover:bg-gray-200 transition-all text-xs md:text-base uppercase">
                  Back to HQ
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 relative pb-20">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-8 md:left-12 top-8 bottom-8 w-2 bg-gray-800 z-0"></div>

                    {CAMPAIGN_STAGES.map((stage) => {
                        const isLocked = stage.id > unlockedStage;
                        const stars = clearedStages[stage.id] || 0;
                        const isBoss = stage.boss;
                        const isHardMode = stage.id > 10;
                        
                        // CP Calculation
                        const diff = teamCP - stage.recommendedCP;
                        let difficulty = 'SAFE';
                        if (diff < -2000) difficulty = 'DANGER';
                        else if (diff < 0) difficulty = 'RISKY';

                        // Sector Divider
                        if (stage.id === 11) {
                            return (
                                <div key="divider" className="relative z-10 py-8 text-center">
                                    <div className="inline-block bg-popRed text-white px-6 py-2 font-black text-xl uppercase tracking-widest border-2 border-white shadow-[0_0_20px_red] transform rotate-2">
                                        ⚠ VOID SECTOR ACCESS ⚠
                                    </div>
                                    <div key={stage.id} className={`mt-8 relative z-10 pl-20 md:pl-28 transition-all ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                                        {/* Render Stage 11 normally below divider */}
                                        <StageCard stage={stage} isLocked={isLocked} stars={stars} isBoss={isBoss} isHardMode={isHardMode} difficulty={difficulty} onSelectStage={onSelectStage} />
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={stage.id} className={`relative z-10 pl-20 md:pl-28 transition-all ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                                <StageCard stage={stage} isLocked={isLocked} stars={stars} isBoss={isBoss} isHardMode={isHardMode} difficulty={difficulty} onSelectStage={onSelectStage} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const StageCard = ({ stage, isLocked, stars, isBoss, isHardMode, difficulty, onSelectStage }: any) => (
    <>
        {/* Connection Node */}
        <div className={`
            absolute left-5 md:left-9 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full border-4 border-popBlack z-20 flex items-center justify-center
            ${isLocked ? 'bg-gray-600' : isBoss ? 'bg-popRed scale-125' : isHardMode ? 'bg-purple-600' : 'bg-popBlue'}
        `}>
            {isLocked ? <Lock size={14} /> : <div className="w-2 h-2 bg-white rounded-full"></div>}
        </div>

        <div className={`
            bg-white text-popBlack border-4 border-popBlack p-4 md:p-6 shadow-brutal hover:translate-x-2 transition-transform
            ${isBoss ? 'border-popRed' : isHardMode ? 'border-purple-600 bg-purple-50' : ''}
        `}>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`font-black text-lg md:text-2xl uppercase italic ${isBoss ? 'text-popRed' : isHardMode ? 'text-purple-700' : 'text-popBlue'}`}>
                            {stage.id}. {stage.name}
                        </span>
                        {stars > 0 && (
                            <div className="flex gap-1 ml-2">
                                {Array.from({length: 3}).map((_, i) => (
                                    <Star key={i} size={14} className={i < stars ? "fill-popYellow text-popYellow" : "text-gray-300"} />
                                ))}
                            </div>
                        )}
                        
                        {/* Difficulty Badge */}
                        {!isLocked && (
                            <div className={`
                                px-2 py-0.5 text-[10px] font-black border border-black shadow-sm flex items-center gap-1
                                ${difficulty === 'SAFE' ? 'bg-popGreen text-black' : ''}
                                ${difficulty === 'RISKY' ? 'bg-popYellow text-black' : ''}
                                ${difficulty === 'DANGER' ? 'bg-popRed text-white' : ''}
                            `}>
                                {difficulty === 'SAFE' && <ShieldCheck size={10} />}
                                {difficulty === 'RISKY' && <AlertTriangle size={10} />}
                                {difficulty === 'DANGER' && <Skull size={10} />}
                                {difficulty}
                            </div>
                        )}
                    </div>
                    <p className="text-gray-500 font-bold text-xs md:text-sm">{stage.description}</p>
                    
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-3 text-xs font-mono font-bold">
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Sword size={14} className={isLocked ? "text-gray-400" : "text-popRed"} />
                            REC CP: {stage.recommendedCP}
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Trophy size={14} className="text-popYellow" />
                            {stage.rewards.gold} Gold
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => !isLocked && onSelectStage(stage.id)}
                    disabled={isLocked}
                    className={`
                        px-6 py-3 font-black text-lg uppercase flex items-center justify-center gap-2 border-2 border-transparent shadow-brutal-sm transition-all
                        ${isLocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : isHardMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-popBlack text-white hover:bg-popBlue hover:scale-105 cursor-pointer'}
                    `}
                >
                    {isLocked ? 'LOCKED' : (
                        <>DEPLOY <Play size={16} fill="currentColor" /></>
                    )}
                </button>
            </div>
        </div>
    </>
);

export default CampaignMap;
