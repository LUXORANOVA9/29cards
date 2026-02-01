import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import CardDeck from './CardDeck';

interface PlayerSeatProps {
  id: string;
  name: string;
  avatarUrl?: string;
  balance: number;
  seatNumber: number;
  isActive: boolean;
  isDealer: boolean;
  isFolded: boolean;
  isWinner: boolean;
  cards: any[]; // Use proper Card type later
  currentBet: number;
  position: 'bottom' | 'top' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  jokerValue?: number | null; // New prop
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  name,
  avatarUrl,
  balance,
  isActive,
  isDealer,
  isFolded,
  isWinner,
  cards,
  currentBet,
  position,
  jokerValue
}) => {
  return (
    <div className={clsx(
      "relative flex flex-col items-center",
      // Position handling can be done via parent layout, but simple transforms here help
      isFolded && "opacity-50 grayscale"
    )}>
      {/* Cards Area */}
      <div className="flex -space-x-8 mb-2 min-h-[100px]">
        {cards.map((card, idx) => {
          const cardCode = typeof card === 'string' ? card : card.code;
          const cardRank = cardCode ? parseInt(cardCode.slice(0, -1)) : 0;
          const isJoker = !!jokerValue && cardRank === jokerValue;

          return (
            <CardDeck
              key={idx}
              code={cardCode}
              isFaceDown={!card || (typeof card === 'object' && !card.code)} // Hidden logic
              className="hover:z-10 transition-all"
              isJoker={isJoker}
            />
          );
        })}
        {/* Placeholder for empty hand */}
        {cards.length === 0 && isActive && (
          <div className="w-16 h-24 border-2 border-dashed border-white/20 rounded-lg" />
        )}
      </div>

      {/* Avatar & Info */}
      <motion.div
        animate={isActive ? { scale: 1.1, boxShadow: "0 0 20px rgba(99, 102, 241, 0.6)" } : {}}
        className={clsx(
          "relative w-20 h-20 rounded-full border-4 flex items-center justify-center bg-gray-800",
          isActive ? "border-indigo-500" : "border-gray-600",
          isWinner && "border-yellow-400 ring-4 ring-yellow-400/50"
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        )}

        {/* Dealer Button */}
        {isDealer && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-gray-300">
            D
          </div>
        )}

        {/* Status Badge */}
        {isFolded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <span className="text-xs font-bold text-red-400 uppercase">Fold</span>
          </div>
        )}
      </motion.div>

      {/* Name & Balance */}
      <div className="mt-2 text-center bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
        <div className="text-sm font-medium text-white truncate max-w-[100px]">{name}</div>
        <div className="text-xs text-yellow-400 font-mono">₹{balance.toLocaleString()}</div>
      </div>

      {/* Current Bet Bubble */}
      {currentBet > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-8 top-10 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border border-indigo-400"
        >
          {currentBet}
        </motion.div>
      )}
    </div>
  );
};

export default PlayerSeat;
