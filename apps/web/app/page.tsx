'use client';

import React, { useState } from 'react';
import { Card, DECK, getHandRank, getLowestWinsHandRank, getMuflisHandRank } from '@29cards/game-engine';

type GameMode = 'Standard' | 'Lowest Wins' | 'Muflis';

const Page = () => {
  const [hand, setHand] = useState<Card[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('Standard');
  const [rank, setRank] = useState<number | null>(null);

  const dealHand = () => {
    const newHand: Card[] = [];
    const deckCopy = [...DECK];
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * deckCopy.length);
      newHand.push(deckCopy.splice(randomIndex, 1)[0]);
    }
    setHand(newHand);
    calculateRank(newHand, gameMode);
  };

  const calculateRank = (currentHand: Card[], mode: GameMode) => {
    if (currentHand.length === 3) {
      let newRank;
      switch (mode) {
        case 'Standard':
          newRank = getHandRank(currentHand);
          break;
        case 'Lowest Wins':
          newRank = getLowestWinsHandRank(currentHand);
          break;
        case 'Muflis':
          newRank = getMuflisHandRank(currentHand);
          break;
        default:
          newRank = null;
      }
      setRank(newRank);
    }
  };

  const handleGameModeChange = (mode: GameMode) => {
    setGameMode(mode);
    calculateRank(hand, mode);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Sindhi Patta</h1>
      <div>
        <h2>Game Mode</h2>
        <button onClick={() => handleGameModeChange('Standard')} disabled={gameMode === 'Standard'}>Standard</button>
        <button onClick={() => handleGameModeChange('Lowest Wins')} disabled={gameMode === 'Lowest Wins'}>Lowest Wins</button>
        <button onClick={() => handleGameModeChange('Muflis')} disabled={gameMode === 'Muflis'}>Muflis</button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button onClick={dealHand}>Deal Hand</button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h2>Your Hand</h2>
        {hand.length > 0 ? (
          <div>
            {hand.map((card, index) => (
              <div key={index} style={{ border: '1px solid black', padding: '10px', margin: '5px', display: 'inline-block' }}>
                <div>{card.rank} of {card.suit}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>Click "Deal Hand" to start.</p>
        )}
      </div>
      {rank !== null && (
        <div style={{ marginTop: '20px' }}>
          <h2>Hand Rank: {rank}</h2>
        </div>
      )}
    </div>
  );
};

export default Page;
