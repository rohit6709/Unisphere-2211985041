import React from 'react';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

const EVENT_TYPES = ['workshop', 'seminar', 'competition', 'cultural', 'sports', 'other'];

export function EventForm({
  values,
  onChange,
  onPosterUpload,
  clubOptions = [],
  selectedClubId = '',
  onClubChange,
  onSaveDraft,
  onSubmitApproval,
  onCancel,
  draftLoading = false,
  submitLoading = false,
  uploading = false,
  disableClubSelection = false,
  saveLabel = 'Save as Draft',
  submitLabel = 'Submit for Approval',
}) {
  const selectedClub = clubOptions.find((club) => club._id === selectedClubId);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Club">
          {disableClubSelection ? (
            <Input value={selectedClub?.name || ''} disabled />
          ) : (
            <Select
              value={selectedClubId}
              onChange={(event) => onClubChange?.(event.target.value)}
              placeholder="Select club"
              options={clubOptions.map((club) => ({ value: club._id, label: club.name }))}
            />
          )}
        </Field>

        <Field label="Event Category">
          <Select
            value={values.eventType}
            onChange={(event) => onChange('eventType', event.target.value)}
            options={EVENT_TYPES.map((type) => ({ value: type, label: type }))}
            placeholder={null}
          />
        </Field>

        <Field label="Event Title">
          <Input value={values.title} onChange={(event) => onChange('title', event.target.value)} placeholder="Event title" />
        </Field>

        <Field label="Max Participants">
          <Input type="number" min={1} value={values.maxParticipants} onChange={(event) => onChange('maxParticipants', event.target.value)} />
        </Field>

        <Field label="Start Date & Time">
          <Input type="datetime-local" value={values.startsAt} onChange={(event) => onChange('startsAt', event.target.value)} />
        </Field>

        <Field label="End Date & Time">
          <Input type="datetime-local" value={values.endsAt} onChange={(event) => onChange('endsAt', event.target.value)} />
        </Field>

        <Field label="Registration Deadline">
          <Input type="datetime-local" value={values.registrationDeadline} onChange={(event) => onChange('registrationDeadline', event.target.value)} />
        </Field>

        <Field label="Visibility">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
            <input type="checkbox" checked={values.clubOnly} onChange={(event) => onChange('clubOnly', event.target.checked)} />
            Club-only event
          </label>
        </Field>

        <Field label="Location">
          <Input value={values.location} onChange={(event) => onChange('location', event.target.value)} placeholder="Venue name" />
        </Field>

        <Field label="Building (Optional)">
          <Input value={values.building} onChange={(event) => onChange('building', event.target.value)} placeholder="Building or hall" />
        </Field>
      </div>

      <Field label="Event Description">
        <Textarea rows={6} value={values.description} onChange={(event) => onChange('description', event.target.value)} placeholder="Describe the event agenda and details" />
      </Field>

      <Field label="Poster/Image">
        <FileUpload
          accept="image/*"
          onChange={onPosterUpload}
          previewUrl={values.posterUrl}
          helperText="Image preview appears after upload"
          dragLabel="Drop an image here or click to upload"
          progress={uploading ? 35 : 0}
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onSaveDraft} isLoading={draftLoading}>{saveLabel}</Button>
        <Button type="button" onClick={onSubmitApproval} isLoading={submitLoading}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}
