import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Building2, 
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { getPlatformStats } from '@/services/authService';
import { SEO } from '@/components/SEO';
import { cn } from '@/utils/cn';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

export default function PlatformStatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => getPlatformStats(),
  });

  if (isLoading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse">Analyzing Platform Data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <SEO title="Platform Analytics | Unisphere" />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
           title="Total Students" 
           value={stats.users.students} 
           icon={Users} 
           trend="+12%" 
           color="indigo" 
         />
         <StatCard 
           title="Active Clubs" 
           value={stats.platform.clubs} 
           icon={Building2} 
           trend="+5%" 
           color="purple" 
         />
         <StatCard 
           title="Live Events" 
           value={stats.platform.events} 
           icon={Calendar} 
           trend="+18%" 
           color="rose" 
         />
         <StatCard 
           title="Total Registrations" 
           value={stats.platform.registrations} 
           icon={CheckCircle2} 
           trend="+24%" 
           color="amber" 
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Growth Chart */}
         <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-[3rem] border border-gray-50 dark:border-gray-900 p-8 shadow-2xl shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Registration Growth</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Last 6 Months Activity</p>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/10 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                  <TrendingUp className="h-4 w-4" /> High Engagement
               </div>
            </div>
            
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.platform.growth}>
                     <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="month" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                     />
                     <Tooltip 
                        contentStyle={{ 
                          borderRadius: '1.5rem', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: '800'
                        }}
                     />
                     <Area 
                       type="monotone" 
                       dataKey="count" 
                       stroke="#6366f1" 
                       strokeWidth={4}
                       fillOpacity={1} 
                       fill="url(#colorCount)" 
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Department Breakdown */}
         <div className="bg-white dark:bg-gray-950 rounded-[3rem] border border-gray-50 dark:border-gray-900 p-8 shadow-2xl shadow-indigo-500/5">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-8">Department Reach</h3>
            <div className="h-[300px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={stats.users.departments}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="count"
                        nameKey="_id"
                     >
                        {stats.users.departments.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ 
                          borderRadius: '1.5rem', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        }}
                     />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.users.departments.length}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Depts</span>
               </div>
            </div>
            
            <div className="space-y-3 mt-8">
               {stats.users.departments.slice(0, 4).map((dept, idx) => (
                 <div key={dept._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                       <span className="text-xs font-black text-gray-600 dark:text-gray-400">{dept._id}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{dept.count}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }) {
  const colors = {
    indigo: "bg-indigo-500 shadow-indigo-500/20",
    purple: "bg-purple-500 shadow-purple-500/20",
    rose: "bg-rose-500 shadow-rose-500/20",
    amber: "bg-amber-500 shadow-amber-500/20",
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-50 dark:border-gray-900 p-8 shadow-2xl shadow-indigo-500/5 transition-transform hover:-translate-y-1">
       <div className="flex items-center justify-between mb-6">
          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl", colors[color])}>
             {React.createElement(icon, { className: 'h-7 w-7' })}
          </div>
          <div className="flex items-center gap-1 text-green-600 font-black text-[10px] bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded-lg">
             <ArrowUpRight className="h-3 w-3" /> {trend}
          </div>
       </div>
       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
       <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
