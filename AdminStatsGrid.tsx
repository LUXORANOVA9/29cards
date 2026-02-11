import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatChips } from '@/lib/gameLogic';
import {
  Users,
  Table2,
  Coins,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface AdminStatsGridProps {
  totalBalance: number;
  activePlayers: number;
  activeTables: number;
  fraudAlerts: number;
}

export function AdminStatsGrid({ 
  totalBalance, 
  activePlayers, 
  activeTables, 
  fraudAlerts 
}: AdminStatsGridProps) {
  const stats = [
    { 
      title: 'Total Balance', 
      value: formatChips(totalBalance), 
      change: '', 
      trend: 'up' as const,
      icon: Coins 
    },
    { 
      title: 'Active Players', 
      value: activePlayers.toString(), 
      change: '', 
      trend: 'up' as const,
      icon: Users 
    },
    { 
      title: 'Active Tables', 
      value: activeTables.toString(), 
      change: '', 
      trend: 'up' as const,
      icon: Table2 
    },
    { 
      title: 'Fraud Alerts', 
      value: fraudAlerts.toString(), 
      change: '', 
      trend: fraudAlerts > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle 
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    stat.trend === 'up' ? 'bg-accent/20' : 'bg-destructive/20'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      stat.trend === 'up' ? 'text-accent' : 'text-destructive'
                    )} />
                  </div>
                  {stat.change && (
                    <div className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      stat.trend === 'up' ? 'text-accent' : 'text-destructive'
                    )}>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {stat.change}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
