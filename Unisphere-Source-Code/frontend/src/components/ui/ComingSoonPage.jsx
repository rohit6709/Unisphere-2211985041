import React from 'react';
import { Construction } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * ComingSoonPage — A polished, reusable placeholder for pages under construction.
 * Displays the page title, an icon, and an optional description.
 * Replace this entire component with the actual page content in future phases.
 *
 * @param {string}       title        — The name of the page/feature.
 * @param {string}       description  — A short description of what this page will do.
 * @param {LucideIcon}   icon         — A lucide-react icon to display.
 * @param {string}       phase        — Roadmap phase label e.g. "Phase 2"
 * @param {string}       accent       — Tailwind color class for the icon background accent.
 */
export const ComingSoonPage = ({
  title = 'Coming Soon',
  description = 'This page is currently under construction and will be available soon.',
  phase = 'Next Phase',
  accent = 'bg-[var(--primary-glow)] text-[var(--primary)]',
}) => {
  return (
    <div className="flex flex-col min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className={cn(
          'mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl',
          accent
        )}>
          <Construction className="h-12 w-12" aria-hidden="true" />
        </div>

        {/* Phase Tag */}
        <span className="inline-block mb-4 rounded-full border border-[var(--border)] bg-[var(--bg-card-alt)] px-3 py-1 text-xs font-semibold text-[var(--text)] uppercase tracking-widest">
          {phase}
        </span>

        {/* Title */}
        <h1 className="mb-3 font-heading text-3xl font-extrabold text-[var(--text-h)] tracking-tight">
          {title}
        </h1>

        {/* Description */}
        <p className="text-[var(--text)] leading-relaxed">
          {description}
        </p>

        {/* Decorative progress bar */}
        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-[var(--primary)] to-purple-500 transition-all duration-700 ease-out" />
        </div>
        <p className="mt-2 text-xs text-[var(--text)] opacity-60">Implementation in progress</p>
      </div>
    </div>
  );
};
