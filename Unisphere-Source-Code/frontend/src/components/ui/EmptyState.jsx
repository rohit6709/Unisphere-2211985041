import React from 'react';
import { cn } from '@/utils/cn';

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-[var(--border)] border-dashed rounded-3xl bg-[var(--bg-card)]/30 backdrop-blur-sm",
        className
      )}
    >
      {Icon && (
        <div className="w-20 h-20 bg-[var(--bg-card-alt)] rounded-full flex items-center justify-center mb-6 shadow-inner relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)]/10 to-[var(--violet)]/10 rounded-full" />
          <Icon className="w-10 h-10 text-[var(--primary)] opacity-80 relative z-10" />
        </div>
      )}
      
      <h3 className="font-heading font-bold text-xl text-[var(--text-h)] mb-2 tracking-tight">
        {title}
      </h3>
      
      {description && (
        <p className="text-[var(--text)] text-sm max-w-sm mx-auto leading-relaxed mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};
