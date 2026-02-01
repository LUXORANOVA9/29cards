import React from 'react';

const FestivalPhase3: React.FC = () => {
    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-purple-900/90 border-2 border-purple-400 p-4 rounded-xl shadow-lg z-50 text-center animate-bounce-in">
            <h2 className="text-2xl font-bold text-white mb-1">🎉 Festival Mode: LOWEST WINS</h2>
            <p className="text-purple-200 text-sm">
                Phase 3: Best hand is the <strong>LOWEST SUM</strong>.
            </p>
            <div className="mt-2 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
                Cards 2-8 count as face value. 9 counts as 9.
                <br />
                Example: 2+2+2 = 6 (Best Hand)
            </div>
        </div>
    );
};

export default FestivalPhase3;
