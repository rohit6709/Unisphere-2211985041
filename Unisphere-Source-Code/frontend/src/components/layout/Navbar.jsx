import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search, 
  LogOut, 
  User, 
  Compass, 
  LayoutDashboard,
  Settings,
  Moon,
  Sun
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import NotificationBell from './NotificationBell';
import { Button } from '@/components/ui/Button';
import { getDashboardPath, getProfilePath } from '@/utils/roleRedirect';
import { getInitials } from '@/utils/getInitials';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Discover', path: '/discovery', icon: Compass },
    { name: 'Events', path: '/events', icon: Search },
    { name: 'Dashboard', path: getDashboardPath(role), icon: LayoutDashboard },
  ];

  return (
    <nav className="sticky top-0 z-[60] w-full border-b border-gray-50/50 dark:border-gray-900/50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
           <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">U</span>
           </div>
           <span className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">Unisphere</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
           {navLinks.map((link) => (
             <Link 
               key={link.path} 
               to={link.path} 
               className="text-xs font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-2"
             >
                <link.icon className="h-4 w-4" />
                {link.name}
             </Link>
           ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
           <button 
             onClick={toggleTheme}
             className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-all text-gray-400"
           >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
           </button>
           
           <NotificationBell />

           <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-800 mx-2" />

           {user ? (
             <div className="flex items-center gap-4">
                <div className="text-right">
                   <p className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.name}</p>
                   <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{role}</p>
              </div>
                <div className="group relative">
                   <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-indigo-600 cursor-pointer overflow-hidden border-2 border-transparent hover:border-indigo-600 transition-all">
                     {user.profilePicture ? <img src={user.profilePicture} className="h-full w-full object-cover" /> : getInitials(user?.name)}
                   </div>
                   
                   {/* Dropdown */}
                   <div className="absolute right-0 top-full mt-4 w-48 bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-50 dark:border-gray-900 shadow-2xl p-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 shadow-indigo-500/5">
                      <Link to={getProfilePath(role)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all">
                         <User className="h-4 w-4" /> Profile
                      </Link>
                      <Link to="/change-password" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all">
                         <Settings className="h-4 w-4" /> Settings
                      </Link>
                      <div className="h-[1px] bg-gray-50 dark:bg-gray-900 my-2" />
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                      >
                         <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                   </div>
                </div>
             </div>
           ) : (
             <Link to="/login">
                <Button className="rounded-2xl h-12 px-6 bg-indigo-600 font-black">Sign In</Button>
             </Link>
           )}
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-400"
        >
           {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-50 dark:border-gray-900 bg-white dark:bg-gray-950 overflow-hidden"
          >
             <div className="px-4 py-8 space-y-6">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path} 
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 text-lg font-black text-gray-900 dark:text-white"
                  >
                     <link.icon className="h-6 w-6 text-indigo-600" />
                     {link.name}
                  </Link>
                ))}
                <div className="h-[1px] bg-gray-50 dark:bg-gray-900" />
                <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-4 text-lg font-black text-gray-900 dark:text-white"
                >
                   {theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                   {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 text-lg font-black text-rose-500"
                >
                   <LogOut className="h-6 w-6" /> Sign Out
                </button>
             </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
