import React from 'react';
import { Loader2, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';

export function FeedbackForm({
  rating,
  hoverRating,
  onRatingChange,
  onHoverChange,
  comment,
  onCommentChange,
  isAnonymous,
  onAnonymousChange,
  onSubmit,
  isSubmitting = false,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => onHoverChange?.(star)}
                onMouseLeave={() => onHoverChange?.(0)}
                onClick={() => onRatingChange?.(star)}
                className="transition-transform active:scale-90"
              >
                <Star className={cn('h-8 w-8 transition-colors', (hoverRating || rating) >= star ? 'fill-indigo-600 text-indigo-600' : 'text-indigo-200 dark:text-indigo-900')} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">Share your thoughts</label>
          <Textarea
            rows={3}
            value={comment}
            onChange={(event) => onCommentChange?.(event.target.value)}
            placeholder="How was the event? What stood out?"
            className="rounded-2xl border-indigo-100 bg-white px-6 py-4 dark:border-indigo-900 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-3">
          <div onClick={() => onAnonymousChange?.(!isAnonymous)} className={cn('relative h-6 w-11 rounded-full transition-colors', isAnonymous ? 'bg-indigo-600' : 'bg-indigo-200 dark:bg-indigo-900')}>
            <div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-all', isAnonymous ? 'left-6' : 'left-1')} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Submit Anonymously</span>
        </label>

        <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit Review</>}
        </Button>
      </div>
    </form>
  );
}
