'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Users, DollarSign, Activity, AlertTriangle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-8 text-white">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">Welcome back, {user?.displayName || 'Admin'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value="1,234" 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Total Revenue" 
          value="₹45,67,890" 
          icon={DollarSign} 
          color="bg-emerald-600" 
        />
        <StatCard 
          title="Active Tables" 
          value="42" 
          icon={Activity} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="Fraud Alerts" 
          value="3" 
          icon={AlertTriangle} 
          color="bg-red-600" 
        />
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
        <div className="text-gray-500 text-sm text-center py-8">
          No recent activity logs found.
        </div>
      </div>
    </div>
  );
}
