import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePenLine, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { EventForm } from '@/components/features/EventForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getAllClubs } from '@/services/clubService';
import { getClubEvent, submitEvent, updateEvent, uploadEventPoster } from '@/services/eventService';

const toIso = (datetimeLocalValue) => new Date(datetimeLocalValue).toISOString();
const toDateTimeLocal = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export default function EditEventPage() {
  useDocumentTitle('Edit Event | Unisphere');
  const navigate = useNavigate();
  const { id: eventId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [resolvedClubId, setResolvedClubId] = React.useState('');
  const [resolvingClub, setResolvingClub] = React.useState(true);
  const [clubResolveError, setClubResolveError] = React.useState('');
  const [form, setForm] = React.useState({
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
  });
  const [initialPayloadSnapshot, setInitialPayloadSnapshot] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  const clubsQuery = useQuery({
    queryKey: ['event-edit-clubs'],
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
    if (!eventId || clubsQuery.isLoading) return;

    let cancelled = false;

    const resolveClub = async () => {
      try {
        setResolvingClub(true);
        setClubResolveError('');

        const suggestedClubId = location.state?.clubId || searchParams.get('clubId');
        if (suggestedClubId && eligibleClubs.some((club) => club._id === suggestedClubId)) {
          if (!cancelled) {
            setResolvedClubId(suggestedClubId);
            setResolvingClub(false);
          }
          return;
        }

        for (const club of eligibleClubs) {
          try {
            await getClubEvent(club._id, eventId);
            if (!cancelled) {
              setResolvedClubId(club._id);
              setResolvingClub(false);
            }
            return;
          } catch {
            // keep scanning other clubs
          }
        }

        if (!cancelled) {
          setResolvedClubId('');
          setResolvingClub(false);
          setClubResolveError('Event not found in clubs where you have edit rights');
        }
      } catch (error) {
        if (!cancelled) {
          setResolvedClubId('');
          setResolvingClub(false);
          setClubResolveError(error?.response?.data?.message || error?.message || 'Failed to resolve event club');
        }
      }
    };

    resolveClub();

    return () => {
      cancelled = true;
    };
  }, [eventId, eligibleClubs, clubsQuery.isLoading, location.state?.clubId, searchParams]);

  const eventQuery = useQuery({
    queryKey: ['event-edit-detail', resolvedClubId, eventId],
    queryFn: () => getClubEvent(resolvedClubId, eventId),
    enabled: Boolean(resolvedClubId && eventId),
  });

  const buildPayload = React.useCallback((source = form) => {
    const startsAtIso = toIso(source.startsAt);
    const endsAtIso = toIso(source.endsAt);
    const deadlineIso = toIso(source.registrationDeadline);

    return {
      title: source.title.trim(),
      description: source.description.trim(),
      eventType: source.eventType,
      visibility: source.clubOnly ? 'club_only' : 'open',
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      registrationDeadline: deadlineIso,
      duration: Math.max(1, Math.round((new Date(endsAtIso) - new Date(startsAtIso)) / (1000 * 60))),
      venue: {
        name: source.location.trim(),
        building: source.building.trim() || undefined,
      },
      maxParticipants: Number(source.maxParticipants),
      posterUrl: source.posterUrl || undefined,
    };
  }, [form]);

  React.useEffect(() => {
    const event = eventQuery.data;
    if (!event) return;

    const nextForm = {
      title: event.title || '',
      description: event.description || '',
      eventType: event.eventType || 'workshop',
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: toDateTimeLocal(event.endsAt),
      location: event.venue?.name || '',
      building: event.venue?.building || '',
      maxParticipants: event.maxParticipants || 100,
      registrationDeadline: toDateTimeLocal(event.registrationDeadline),
      clubOnly: event.visibility !== 'open',
      posterUrl: event.posterUrl || '',
    };
    setForm(nextForm);
    setInitialPayloadSnapshot(JSON.stringify(buildPayload(nextForm)));
  }, [eventQuery.data, buildPayload]);

  const updateMutation = useMutation({
    mutationFn: ({ clubId, payload }) => updateEvent(clubId, eventId, payload),
  });

  const submitMutation = useMutation({
    mutationFn: ({ clubId }) => submitEvent(clubId, eventId),
  });

  const validateForm = () => {
    if (!resolvedClubId) {
      throw new Error('Unable to resolve club for this event');
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

  const hasChanges = React.useMemo(() => {
    if (!initialPayloadSnapshot) return false;
    return JSON.stringify(buildPayload(form)) !== initialPayloadSnapshot;
  }, [form, initialPayloadSnapshot, buildPayload]);

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
      if (!response?.url) throw new Error('Poster upload failed');
      setForm((current) => ({ ...current, posterUrl: response.url }));
      toast.success('Poster uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to upload poster');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      validateForm();
      if (!hasChanges) {
        toast.error('No changes to save');
        return;
      }
      await updateMutation.mutateAsync({ clubId: resolvedClubId, payload: buildPayload(form) });
      setInitialPayloadSnapshot(JSON.stringify(buildPayload(form)));
      toast.success('Event updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update event');
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      validateForm();
      if (hasChanges) {
        await updateMutation.mutateAsync({ clubId: resolvedClubId, payload: buildPayload(form) });
        setInitialPayloadSnapshot(JSON.stringify(buildPayload(form)));
      }
      await submitMutation.mutateAsync({ clubId: resolvedClubId });
      toast.success('Event submitted for approval');
      navigate('/events/my-submitted');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit event');
    }
  };

  const event = eventQuery.data;
  const canEdit = event && ['draft', 'rejected'].includes(event.status);

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
          <FilePenLine className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Update draft/rejected events and resubmit for approval.</p>
          </div>
        </div>
      </section>

      {clubsQuery.isLoading || resolvingClub ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-3xl" />)}
        </div>
      ) : clubResolveError ? (
        <EmptyState title="Unable to edit this event" description={clubResolveError} icon={FilePenLine} />
      ) : eventQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-3xl" />)}
        </div>
      ) : !event ? (
        <EmptyState title="Event not found" description="Try opening this event from a valid club context." icon={FilePenLine} />
      ) : !canEdit ? (
        <EmptyState title="This event cannot be edited" description={`Only draft/rejected events are editable. Current status: ${event.status}.`} icon={FilePenLine} />
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
            Editing status: <span className="font-semibold capitalize">{event.status}</span>
          </div>
          <div className="mt-5">
            <EventForm
              values={form}
              onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
              onPosterUpload={handlePosterUpload}
              clubOptions={eligibleClubs}
              selectedClubId={resolvedClubId}
              disableClubSelection
              onSaveDraft={handleSaveChanges}
              onSubmitApproval={handleSubmitForApproval}
              onCancel={() => navigate(-1)}
              draftLoading={updateMutation.isPending}
              submitLoading={submitMutation.isPending}
              uploading={uploading}
              saveLabel="Save Changes"
            />
          </div>
        </section>
      )}
    </div>
  );
}
