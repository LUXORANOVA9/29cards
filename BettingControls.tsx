import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatChips } from '@/lib/gameLogic';
import { Eye, EyeOff, TrendingUp, X, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BettingControlsProps {
  minBet: number;
  maxBet: number;
  currentBet: number;
  playerChips: number;
  isPlayerTurn: boolean;
  onFold: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onCheck: () => void;
  canCheck: boolean;
  className?: string;
}

export function BettingControls({
  minBet,
  maxBet,
  currentBet,
  playerChips,
  isPlayerTurn,
  onFold,
  onCall,
  onRaise,
  onCheck,
  canCheck,
  className
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minBet * 2);
  const [isBlind, setIsBlind] = useState(false);
  const isMobile = useIsMobile();

  const callAmount = currentBet;
  const canRaise = playerChips > callAmount;

  const presetRaises = [
    { label: '2x', value: minBet * 2 },
    { label: '3x', value: minBet * 3 },
    { label: '5x', value: minBet * 5 },
    { label: 'All In', value: playerChips },
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'bg-gradient-to-t from-background via-background/95 to-transparent',
        'border-t border-border/50 safe-area-bottom',
        isMobile ? 'p-2 pb-3' : 'p-4',
        className
      )}
    >
      <div className="max-w-4xl mx-auto">
        {/* Blind toggle */}
        <div className="flex justify-center mb-2 sm:mb-4">
          <Button
            variant="velvet"
            size="sm"
            onClick={() => setIsBlind(!isBlind)}
            className="gap-2 active:scale-95 transition-transform"
          >
            {isBlind ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isBlind ? 'Playing Blind' : 'Seen Cards'}
          </Button>
        </div>

        {/* Raise slider */}
        {canRaise && isPlayerTurn && (
          <div className={cn('space-y-2 sm:space-y-3', isMobile ? 'mb-2' : 'mb-4')}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Raise Amount</span>
              <span className="font-bold text-gold">{formatChips(raiseAmount)}</span>
            </div>
            <Slider
              value={[raiseAmount]}
              onValueChange={([value]) => setRaiseAmount(value)}
              min={Math.max(minBet, currentBet + minBet)}
              max={playerChips}
              step={minBet}
              className={cn('w-full', isMobile && '[&_[role=slider]]:h-6 [&_[role=slider]]:w-6')}
            />
            <div className={cn(
              'flex gap-2 justify-center',
              isMobile && 'overflow-x-auto flex-nowrap pb-1'
            )}>
              {presetRaises.map(preset => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setRaiseAmount(Math.min(preset.value, playerChips))}
                  disabled={preset.value > playerChips}
                  className="text-xs shrink-0 active:scale-95 transition-transform"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3 justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={onFold}
            disabled={!isPlayerTurn}
            className={cn(
              'gap-1 sm:gap-2 active:scale-95 transition-transform',
              isMobile ? 'min-w-20 h-12 text-sm' : 'min-w-24'
            )}
          >
            <X className="w-4 h-4" />
            Fold
          </Button>

          {canCheck ? (
            <Button
              variant="velvet"
              size="lg"
              onClick={onCheck}
              disabled={!isPlayerTurn}
              className={cn(
                'gap-1 sm:gap-2 active:scale-95 transition-transform',
                isMobile ? 'min-w-20 h-12 text-sm' : 'min-w-24'
              )}
            >
              <Check className="w-4 h-4" />
              Check
            </Button>
          ) : (
            <Button
              variant="gold"
              size="lg"
              onClick={onCall}
              disabled={!isPlayerTurn || playerChips < callAmount}
              className={cn(
                'gap-1 sm:gap-2 active:scale-95 transition-transform',
                isMobile ? 'min-w-24 h-12 text-sm' : 'min-w-28'
              )}
            >
              Call {formatChips(callAmount)}
            </Button>
          )}

          {canRaise && (
            <Button
              variant="hero"
              size="lg"
              onClick={() => onRaise(raiseAmount)}
              disabled={!isPlayerTurn}
              className={cn(
                'gap-1 sm:gap-2 active:scale-95 transition-transform',
                isMobile ? 'min-w-28 h-12 text-sm' : 'min-w-32'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Raise {formatChips(raiseAmount)}
            </Button>
          )}
        </div>

        {/* Player chips display */}
        <div className="mt-2 sm:mt-4 text-center">
          <span className="text-xs sm:text-sm text-muted-foreground">Your Stack: </span>
          <span className={cn(
            'font-bold text-gold',
            isMobile ? 'text-sm' : 'text-lg'
          )}>{formatChips(playerChips)}</span>
        </div>
      </div>
    </motion.div>
  );
}
