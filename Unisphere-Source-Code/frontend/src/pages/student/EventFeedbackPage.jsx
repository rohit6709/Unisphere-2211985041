import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, AlertCircle, MessageSquareText, Shield, User, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion as Motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPublicEvent } from '@/services/eventService';
import { getEventFeedback, submitFeedback } from '@/services/feedbackService';
import { getMyRegistrationStatus } from '@/services/registrationService';

export default function EventFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getPublicEvent(id),
    enabled: Boolean(id),
  });

  const { data: registrationStatus, isLoading: registrationLoading } = useQuery({
    queryKey: ['registration-status', id],
    queryFn: () => getMyRegistrationStatus(id),
    enabled: Boolean(id) && Boolean(user),
  });

  const { data: feedbackData } = useQuery({
    queryKey: ['event-feedback', id],
    queryFn: () => getEventFeedback(id),
    enabled: Boolean(id),
  });

  const items = feedbackData?.feedbacks || [];
  const summary = feedbackData?.summary || { averageRating: 0, totalReviews: 0 };
  const existingFeedback = user?._id
    ? items.find((entry) => entry?.student?._id === user._id) || null
    : null;

  const eventStarted = event?.startsAt ? new Date() >= new Date(event.startsAt) : false;
  const isRegistered = registrationStatus?.status === 'registered';
  const canSubmit = isRegistered && eventStarted;

  const submitMutation = useMutation({
    mutationFn: () => submitFeedback({
      eventId: id,
      rating,
      comment: comment.trim(),
      isAnonymous,
    }),
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['event-feedback', id] });
      setRating(0);
      setComment('');
      setIsAnonymous(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit feedback');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isRegistered) {
      toast.error('You must be registered for this event to submit feedback');
      return;
    }

    if (!eventStarted) {
      toast.error('Feedback opens after the event starts');
      return;
    }

    if (existingFeedback) {
      toast.error('You have already submitted feedback for this event');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }

    if (comment.trim().length > 1000) {
      toast.error('Comment must be 1000 characters or fewer');
      return;
    }

    submitMutation.mutate();
  };

  if (eventLoading || registrationLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-64 rounded-3xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-semibold text-(--text-h)">Event not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-(--text-h)">Event Feedback</h1>
          <p className="text-sm text-(--text) mt-1">{event.title}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-(--bg-card-alt) px-3 py-1 text-xs font-semibold text-(--text-h)">
              <CalendarDays className="h-3.5 w-3.5" />
              {eventStarted ? 'Feedback open' : 'Feedback opens after the event starts'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-(--bg-card-alt) px-3 py-1 text-xs font-semibold text-(--text-h)">
              <Shield className="h-3.5 w-3.5" />
              {isRegistered ? 'Registration confirmed' : 'Registration required'}
            </span>
          </div>
        </div>

        {!isRegistered && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-400">
            You must be registered for this event to submit feedback.
          </div>
        )}

        {isRegistered && !eventStarted && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 text-sm text-blue-700 dark:text-blue-400">
            Feedback opens after the event starts.
          </div>
        )}

        {existingFeedback && (
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 p-4 text-sm text-green-700 dark:text-green-400">
            You have already submitted feedback for this event.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-(--text-h) mb-3">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-1"
                  aria-label={`Set rating ${value}`}
                >
                  <Star
                    className={`h-7 w-7 ${rating >= value ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-h) mb-2">Comments</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={1000}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Share what went well and what can be improved"
            />
            <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-(--text)">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            Submit as anonymous
          </label>

          <div className="flex gap-3">
            <Button type="submit" isLoading={submitMutation.isPending} disabled={!canSubmit || Boolean(existingFeedback)}>
              Submit Feedback
            </Button>
            <Link to={`/events/${id}`}>
              <Button type="button" variant="outline">Back to Event</Button>
            </Link>
          </div>
        </form>
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-(--text-h) inline-flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-indigo-600" />
          Feedback Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-(--border) bg-(--bg-card-alt) p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--text)">Average Rating</p>
            <p className="mt-2 text-3xl font-bold text-(--text-h)">{Number(summary.averageRating || 0).toFixed(1)}</p>
          </div>
          <div className="rounded-2xl border border-(--border) bg-(--bg-card-alt) p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--text)">Total Reviews</p>
            <p className="mt-2 text-3xl font-bold text-(--text-h)">{summary.totalReviews || 0}</p>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <Motion.div
                key={item._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-(--border) bg-(--bg-card) p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-(--bg-card-alt) flex items-center justify-center text-(--text-h) font-bold shrink-0 overflow-hidden">
                      {item.isAnonymous ? <Shield className="h-4 w-4 text-(--text)" /> : item.student?.profilePicture ? <img src={item.student.profilePicture} alt={item.student?.name || 'Reviewer'} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-(--text-h)">
                        {item.isAnonymous ? 'Anonymous attendee' : item.student?.name || 'Verified attendee'}
                      </p>
                      <p className="text-xs text-(--text)">
                        {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${item.rating > index ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-(--text) leading-relaxed">
                  {item.comment?.trim() || 'No written comment was provided.'}
                </p>
              </Motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title="No feedback yet"
            description="Reviews submitted after the event starts will appear here."
            className="py-8"
          />
        )}
      </section>
    </div>
  );
}
