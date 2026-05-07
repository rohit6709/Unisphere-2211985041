import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { EventForm } from '@/components/features/EventForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getAllClubs } from '@/services/clubService';
import { createEvent, submitEvent, uploadEventPoster } from '@/services/eventService';

const initialForm = {
  title: '',
  description: '',
  eventType: 'workshop',
  startsAt: '',
  endsAt: '',
  location: '',
  building: '',
  maxParticipants: 100,
  registrationDeadline: '',
  clubOnly: true,
  posterUrl: '',
};

const toIso = (datetimeLocalValue) => new Date(datetimeLocalValue).toISOString();

export default function CreateEventPage() {
  useDocumentTitle('Create Event | Unisphere');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [form, setForm] = React.useState(initialForm);
  const [selectedClubId, setSelectedClubId] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  const clubsQuery = useQuery({
    queryKey: ['event-create-clubs'],
    queryFn: () => getAllClubs({ page: 1, limit: 500, status: 'active' }),
    staleTime: 60_000,
  });

  const eligibleClubs = React.useMemo(() => {
    const clubs = clubsQuery.data?.clubs || [];
    return clubs.filter((club) => {
      const presidentId = club.president?._id?.toString();
      const vicePresidentId = club.vicePresident?._id?.toString();
      return presidentId === user?._id?.toString() || vicePresidentId === user?._id?.toString();
    });
  }, [clubsQuery.data, user?._id]);

  React.useEffect(() => {
    const preferredClubId = location.state?.clubId || searchParams.get('clubId');
    if (preferredClubId && eligibleClubs.some((club) => club._id === preferredClubId)) {
      setSelectedClubId(preferredClubId);
      return;
    }
    if (!selectedClubId && eligibleClubs.length) {
      setSelectedClubId(eligibleClubs[0]._id);
    }
  }, [eligibleClubs, location.state?.clubId, searchParams, selectedClubId]);

  const createDraftMutation = useMutation({
    mutationFn: ({ clubId, payload }) => createEvent(clubId, payload),
  });

  const submitMutation = useMutation({
    mutationFn: async ({ clubId, payload }) => {
      const createdEvent = await createEvent(clubId, payload);
      return submitEvent(clubId, createdEvent._id);
    },
  });

  const validateForm = () => {
    if (!selectedClubId) {
      throw new Error('Please select a club');
    }
    if (!form.title.trim() || form.title.trim().length < 3) {
      throw new Error('Event title must be at least 3 characters');
    }
    if (!form.description.trim() || form.description.trim().length < 20) {
      throw new Error('Event description must be at least 20 characters');
    }
    if (!form.startsAt || !form.endsAt || !form.registrationDeadline) {
      throw new Error('Start time, end time and registration deadline are required');
    }
    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);
    const deadline = new Date(form.registrationDeadline);
    const now = new Date();
    if (start <= now) {
      throw new Error('Start time must be in the future');
    }
    if (end <= start) {
      throw new Error('End time must be after start time');
    }
    if (deadline >= start) {
      throw new Error('Registration deadline must be before start time');
    }
    if (!form.location.trim()) {
      throw new Error('Location is required');
    }
    if (Number(form.maxParticipants) < 1) {
      throw new Error('Max participants must be at least 1');
    }
  };

  const buildPayload = () => {
    const startsAtIso = toIso(form.startsAt);
    const endsAtIso = toIso(form.endsAt);
    const deadlineIso = toIso(form.registrationDeadline);

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      eventType: form.eventType,
      visibility: form.clubOnly ? 'club_only' : 'open',
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      registrationDeadline: deadlineIso,
      duration: Math.max(1, Math.round((new Date(endsAtIso) - new Date(startsAtIso)) / (1000 * 60))),
      venue: {
        name: form.location.trim(),
        building: form.building.trim() || undefined,
      },
      maxParticipants: Number(form.maxParticipants),
      posterUrl: form.posterUrl || undefined,
    };
  };

  const handlePosterUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Poster must be an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Poster must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);
      const response = await uploadEventPoster(file);
      if (!response?.url) {
        throw new Error('Poster upload failed');
      }
      setForm((current) => ({ ...current, posterUrl: response.url }));
      toast.success('Poster uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to upload poster');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      validateForm();
      await createDraftMutation.mutateAsync({ clubId: selectedClubId, payload: buildPayload() });
      toast.success('Event saved as draft');
      navigate('/events/my-submitted');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save draft');
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      validateForm();
      await submitMutation.mutateAsync({ clubId: selectedClubId, payload: buildPayload() });
      toast.success('Event submitted for approval');
      navigate('/events/my-submitted');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit event');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Event</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Build the event draft, then submit it for advisor approval.</p>
          </div>
        </div>
      </section>

      {clubsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-3xl" />)}
        </div>
      ) : !eligibleClubs.length ? (
        <EmptyState title="No eligible clubs found" description="You are not assigned as president or vice president of any active club." icon={CalendarPlus} />
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <EventForm
            values={form}
            onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            onPosterUpload={handlePosterUpload}
            clubOptions={eligibleClubs}
            selectedClubId={selectedClubId}
            onClubChange={setSelectedClubId}
            onSaveDraft={handleSaveDraft}
            onSubmitApproval={handleSubmitForApproval}
            onCancel={() => navigate(-1)}
            draftLoading={createDraftMutation.isPending}
            submitLoading={submitMutation.isPending}
            uploading={uploading}
          />
        </section>
      )}
    </div>
  );
}
