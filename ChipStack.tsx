import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatChips } from '@/lib/gameLogic';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChipStackProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const chipColors = [
  { threshold: 0, color: 'bg-chip-white', border: 'border-gray-400' },
  { threshold: 10, color: 'bg-chip-red', border: 'border-red-800' },
  { threshold: 50, color: 'bg-chip-blue', border: 'border-blue-800' },
  { threshold: 100, color: 'bg-chip-green', border: 'border-green-800' },
  { threshold: 500, color: 'bg-chip-black', border: 'border-gray-800' },
  { threshold: 1000, color: 'bg-gold', border: 'border-gold-dark' },
];

function getChipColor(value: number) {
  for (let i = chipColors.length - 1; i >= 0; i--) {
    if (value >= chipColors[i].threshold) {
      return chipColors[i];
    }
  }
  return chipColors[0];
}

export function ChipStack({ value, size = 'md', animate = true, className }: ChipStackProps) {
  const isMobile = useIsMobile();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-16 h-16 text-sm'
  };

  const chipColor = getChipColor(value);
  const maxChips = isMobile ? 3 : 5;
  const numChips = Math.min(maxChips, Math.max(1, Math.floor(Math.log10(value + 1))));

  return (
    <motion.div 
      className={cn('relative', className)}
      initial={animate ? { scale: 0, y: 20 } : {}}
      animate={animate ? { scale: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: isMobile ? 150 : 200 }}
    >
      <div className="relative">
        {Array.from({ length: numChips }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              'absolute rounded-full border-4 shadow-chip',
              chipColor.color,
              chipColor.border,
              sizeClasses[size]
            )}
            style={{ 
              bottom: i * 3,
              zIndex: numChips - i 
            }}
            initial={animate ? { scale: 0 } : {}}
            animate={animate ? { scale: 1 } : {}}
            transition={{ delay: i * 0.05 }}
          >
            <div className="absolute inset-1 rounded-full border border-foreground/10">
              <div className="absolute inset-0 flex items-center justify-center">
                {i === numChips - 1 && (
                  <span className="font-bold text-foreground drop-shadow-sm">
                    {formatChips(value)}
                  </span>
                )}
              </div>
            </div>
            {/* Edge details - hidden on mobile for perf */}
            {!isMobile && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {[0, 45, 90, 135].map(deg => (
                  <div
                    key={deg}
                    className="absolute w-full h-1 bg-foreground/20 top-1/2 -translate-y-1/2"
                    style={{ transform: `rotate(${deg}deg)` }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

interface SingleChipProps {
  color: 'red' | 'blue' | 'green' | 'black' | 'white' | 'gold';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function SingleChip({ color, label, size = 'md', onClick, className }: SingleChipProps) {
  const colorClasses = {
    red: 'bg-chip-red border-red-800',
    blue: 'bg-chip-blue border-blue-800',
    green: 'bg-chip-green border-green-800',
    black: 'bg-chip-black border-gray-700',
    white: 'bg-chip-white border-gray-400 text-primary-foreground',
    gold: 'bg-gold border-gold-dark'
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-16 h-16 text-sm'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(
        'rounded-full border-4 shadow-chip flex items-center justify-center',
        'font-bold transition-transform cursor-pointer',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {label}
    </motion.button>
  );
}
