import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface CardProps {
  rank?: Rank;
  suit?: Suit;
  code?: string; // e.g. "9♥"
  isFaceDown?: boolean;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  isJoker?: boolean; // New prop
}

const CardDeck: React.FC<CardProps> = ({
  rank,
  suit,
  code,
  isFaceDown = false,
  className,
  onClick,
  selected,
  isJoker
}) => {
  // Parse code if provided
  let displayRank = rank;
  let displaySuit = suit;

  if (code && !rank && !suit) {
    displayRank = parseInt(code.slice(0, -1)) as Rank;

    // Handle special case where 9 might be parsed from "9H"
    const suitChar = code.slice(-1);
    if (['♠', '♥', '♦', '♣'].includes(suitChar)) {
      displaySuit = suitChar as Suit;
    } else {
      // Fallback for letter suits if any (H, D, S, C)
      const suitMap: Record<string, Suit> = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
      displaySuit = suitMap[suitChar] || '♠';
    }
  }

  const isRed = displaySuit === '♥' || displaySuit === '♦';

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: selected ? -15 : 0
      }}
      onClick={onClick}
      className={clsx(
        "relative w-16 h-24 rounded-lg shadow-md border-2 cursor-pointer select-none transition-all duration-200",
        isFaceDown
          ? "bg-blue-800 border-white bg-opacity-90"
          : "bg-white border-gray-200",
        selected && "ring-2 ring-yellow-400 ring-offset-2",
        isJoker && "ring-2 ring-purple-500 ring-offset-2 shadow-[0_0_15px_rgba(168,85,247,0.5)]", // Joker Glow
        className
      )}
    >
      {isFaceDown ? (
        // Card Back Pattern
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-20 border border-blue-400/30 rounded flex items-center justify-center">
            <span className="text-2xl text-blue-200/50">♠</span>
          </div>
        </div>
      ) : (
        // Card Face
        <div className={clsx(
          "w-full h-full flex flex-col justify-between p-1.5",
          isRed ? "text-red-600" : "text-black"
        )}>
          {/* Top Left */}
          <div className="flex flex-col items-center leading-none">
            <span className={clsx("text-sm font-bold", isJoker && "text-purple-600")}>
              {isJoker ? 0 : displayRank}
            </span>
            <span className="text-xs">{displaySuit}</span>
          </div>

          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={clsx("text-3xl opacity-20", isJoker && "text-purple-500 opacity-40")}>
              {displaySuit}
            </span>
          </div>

          {/* Bottom Right (Rotated) */}
          <div className="flex flex-col items-center leading-none rotate-180">
            <span className={clsx("text-sm font-bold", isJoker && "text-purple-600")}>
              {isJoker ? 0 : displayRank}
            </span>
            <span className="text-xs">{displaySuit}</span>
          </div>

          {/* Joker Badge Overlay */}
          {isJoker && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-purple-600/10 w-full h-full rounded flex items-center justify-center">
                {/* Optional: subtle J overlay */}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CardDeck;
