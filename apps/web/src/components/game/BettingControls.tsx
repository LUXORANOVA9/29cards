import React from 'react';
import { motion } from 'framer-motion';

interface BettingControlsProps {
  currentBet: number;
  potAmount: number;
  onAction: (action: string, amount?: number) => void;
  canChaal: boolean;
  canBlind: boolean;
  canShow: boolean;
  canSideShow: boolean;
  isMyTurn: boolean;
}

const BettingControls: React.FC<BettingControlsProps> = ({
  currentBet,
  potAmount,
  onAction,
  canChaal,
  canBlind,
  canShow,
  canSideShow,
  isMyTurn
}) => {
  if (!isMyTurn) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center pointer-events-none">
        <span className="text-white/60 animate-pulse">Waiting for other players...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 items-end z-50"
    >
      {/* Pack / Fold */}
      <button
        onClick={() => onAction('FOLD')}
        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
      >
        PACK
      </button>

      {/* Main Actions Container */}
      <div className="bg-gray-900/90 backdrop-blur-md p-2 rounded-2xl border border-gray-700 shadow-2xl flex gap-3">
        
        {/* Blind / Chaal Toggle */}
        <div className="flex flex-col gap-1">
          {canBlind ? (
            <button
              onClick={() => onAction('BLIND')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold min-w-[120px]"
            >
              BLIND
              <span className="block text-xs font-normal opacity-80">₹{currentBet || 1}</span>
            </button>
          ) : (
            <button
              onClick={() => onAction('CHAAL')}
              disabled={!canChaal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold min-w-[120px] disabled:opacity-50"
            >
              CHAAL
              <span className="block text-xs font-normal opacity-80">₹{currentBet}</span>
            </button>
          )}
        </div>

        {/* Plus / Raise */}
        <button
          onClick={() => onAction('PLUS_CHAAL')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-bold border border-gray-600"
        >
          +
        </button>

        {/* Side Actions */}
        <div className="flex flex-col gap-1">
          {canSideShow && (
            <button
              onClick={() => onAction('SIDE_SHOW')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded text-xs font-bold"
            >
              SIDE SHOW
            </button>
          )}
          {canShow && (
            <button
              onClick={() => onAction('SHOW')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded text-xs font-bold"
            >
              SHOW
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BettingControls;
