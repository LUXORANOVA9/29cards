import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  ShieldAlert, 
  Wallet,
  LogOut
} from 'lucide-react';

const AdminSidebar = () => {
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'PANEL_ADMIN', 'BROKER'] },
    { name: 'User Management', href: '/users', icon: Users, roles: ['SUPER_ADMIN', 'PANEL_ADMIN'] },
    { name: 'Financials', href: '/finance', icon: Wallet, roles: ['SUPER_ADMIN', 'PANEL_ADMIN', 'BROKER'] },
    { name: 'Risk & Fraud', href: '/risk', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'PANEL_ADMIN'] },
  ];

  // Filter based on role (simple check)
  const allowedItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  if (!mounted) {
    return (
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <h1 className="text-xl font-bold text-white tracking-wider">ADMIN PANEL</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-wider">ADMIN PANEL</h1>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="text-sm font-medium text-white">{user?.displayName || 'Admin'}</div>
        <div className="text-xs text-gray-500">{user?.role}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {allowedItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
