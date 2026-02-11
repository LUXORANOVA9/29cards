import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  BarChart3,
  Shield,
  Table2,
} from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Players' },
  { icon: Table2, label: 'Tables' },
  { icon: Wallet, label: 'Transactions' },
  { icon: BarChart3, label: 'Reports' },
  { icon: Shield, label: 'Anti-Fraud' },
  { icon: Settings, label: 'Settings' },
];

interface AdminSidebarProps {
  userEmail?: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  return (
    <motion.aside 
      className="w-64 bg-card border-r border-border/50 flex flex-col"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold via-gold-light to-gold flex items-center justify-center shadow-gold">
            <span className="font-display font-bold text-primary-foreground">SP</span>
          </div>
          <div>
            <h1 className="font-display font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Sindhi Patta</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                item.active 
                  ? 'bg-gold/10 text-gold border border-gold/30' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <Avatar className="w-10 h-10 border-2 border-gold/30">
            <AvatarFallback className="bg-gold/20 text-gold font-bold">SA</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Super Admin</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail || 'admin@sindhipatta.com'}</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
