import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageTransition } from '@/components/ui/PageTransition';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
};
