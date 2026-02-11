import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/hooks/useAdminData';
import { formatDistanceToNow } from 'date-fns';

interface AdminActivityTabProps {
  logs: AuditLog[];
  isLoading: boolean;
}

function getLogType(action: string): 'info' | 'success' | 'warning' {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('fraud') || lowerAction.includes('alert') || lowerAction.includes('error')) {
    return 'warning';
  }
  if (lowerAction.includes('success') || lowerAction.includes('approved') || lowerAction.includes('deposit') || lowerAction.includes('win')) {
    return 'success';
  }
  return 'info';
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function AdminActivityTab({ logs, isLoading }: AdminActivityTabProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent system activity and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          {logs.length} recent events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity logs found.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.slice(0, 20).map((log, i) => {
              const logType = getLogType(log.action);
              const timeAgo = formatDistanceToNow(new Date(log.created_at), { addSuffix: true });
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg"
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    logType === 'info' && 'bg-blue-400',
                    logType === 'success' && 'bg-accent',
                    logType === 'warning' && 'bg-gold'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formatAction(log.action)}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.resource_type} {log.resource_id ? `• ${log.resource_id.slice(0, 8)}...` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
