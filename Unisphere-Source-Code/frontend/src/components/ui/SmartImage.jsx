import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * SmartImage Component
 * Features: Lazy loading (native), loading states, error fallbacks, and premium transitions.
 */
export const SmartImage = ({ 
  src, 
  alt, 
  className, 
  aspectRatio = 'aspect-video',
  objectFit = 'object-cover'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn(
      "relative overflow-hidden bg-gray-100 dark:bg-gray-800",
      aspectRatio,
      className
    )}>
      {/* Loading Shimmer */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-gray-200/50 dark:via-gray-700/50 to-transparent" />
      )}

      {/* Actual Image */}
      {!hasError ? (
        <img
          key={src || 'empty-image'}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => {
            setHasError(false);
            setIsLoaded(true);
          }}
          onError={() => {
            setIsLoaded(false);
            setHasError(true);
          }}
          className={cn(
            "w-full h-full transition-all duration-700",
            objectFit,
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          )}
        />
      ) : (
        /* Fallback UI */
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
           <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Image Unavailable</span>
        </div>
      )}
    </div>
  );
};
