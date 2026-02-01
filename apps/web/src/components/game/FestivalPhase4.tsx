import React from 'react';
import { useGameStore } from '@/stores/gameStore';

const FestivalPhase4: React.FC = () => {
    const { festivalState } = useGameStore();
    const jokerRank = festivalState?.jokerValue || '?';

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-pink-900/90 border-2 border-pink-400 p-4 rounded-xl shadow-lg z-50 text-center animate-bounce-in">
            <h2 className="text-2xl font-bold text-white mb-1">🃏 Festival Mode: JOKER ROUND</h2>
            <p className="text-pink-200 text-sm">
                Phase 4: Joker cards count as <strong>ZERO</strong>.
            </p>
            <div className="my-3 flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-pink-300 mb-1">Current Joker</span>
                <div className="w-12 h-16 bg-white rounded border-2 border-pink-500 flex items-center justify-center text-3xl font-bold text-red-600 shadow-glow">
                    {jokerRank}
                </div>
            </div>
            <div className="mt-1 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
                Goal: <strong>LOWEST SUM WINS</strong>
            </div>
        </div>
    );
};

export default FestivalPhase4;
