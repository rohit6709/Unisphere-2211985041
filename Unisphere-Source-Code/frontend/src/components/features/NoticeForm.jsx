import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export function NoticeForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Notice',
  audienceOptions = [],
  priorityOptions = [],
  clubOptions = [],
  showAudienceFields = true,
  minExpiryValue,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input value={values.title} onChange={(event) => onChange('title', event.target.value)} placeholder="Notice title" />
        </Field>
        <Field label="Priority">
          <Select
            value={values.priority}
            onChange={(event) => onChange('priority', event.target.value)}
            options={priorityOptions.map((option) => ({ value: option, label: option }))}
            placeholder={null}
          />
        </Field>
      </div>

      {showAudienceFields && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Target Audience">
            <Select
              value={values.targetAudience}
              onChange={(event) => onChange('targetAudience', event.target.value)}
              options={audienceOptions}
              placeholder={null}
            />
          </Field>

          {values.targetAudience === 'department' && (
            <Field label="Department">
              <Input value={values.targetDepartment} onChange={(event) => onChange('targetDepartment', event.target.value)} placeholder="Department" />
            </Field>
          )}

          {values.targetAudience === 'club' && (
            <Field label="Club">
              <Select
                value={values.targetClub}
                onChange={(event) => onChange('targetClub', event.target.value)}
                options={clubOptions.map((club) => ({ value: club._id, label: club.name }))}
                placeholder="Select club"
              />
            </Field>
          )}

          <Field label="Expiry">
            <Input type="datetime-local" value={values.expiresAt} min={minExpiryValue} onChange={(event) => onChange('expiresAt', event.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Content">
        <Textarea rows={5} value={values.content} onChange={(event) => onChange('content', event.target.value)} placeholder="Write the full notice content" />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isSubmitting}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
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
