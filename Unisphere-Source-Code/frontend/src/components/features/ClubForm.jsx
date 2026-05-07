import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export function ClubForm({
  values,
  onChange,
  onSubmit,
  facultyOptions = [],
  submitLabel = 'Save Club',
  isSubmitting = false,
  showAdvisor = true,
  departments = [],
  onCancel,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="space-y-5"
    >
      <Field label="Club Name">
        <Input value={values.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Club name" />
      </Field>

      <Field label="Department">
        {departments.length ? (
          <Select
            value={values.department}
            onChange={(event) => onChange('department', event.target.value)}
            options={departments.map((item) => ({ value: item, label: item }))}
            placeholder="Select department"
          />
        ) : (
          <Input value={values.department} onChange={(event) => onChange('department', event.target.value)} placeholder="Department" />
        )}
      </Field>

      {showAdvisor && (
        <Field label="Advisor">
          <Select
            value={values.advisorEmployeeId || ''}
            onChange={(event) => onChange('advisorEmployeeId', event.target.value)}
            placeholder="Select advisor"
            options={facultyOptions.map((member) => ({
              value: member.employeeId,
              label: `${member.name} (${member.employeeId})`,
            }))}
          />
        </Field>
      )}

      <Field label="Description">
        <Textarea
          rows={5}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
          placeholder="Describe the club's mission and scope"
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" isLoading={isSubmitting}>{submitLabel}</Button>
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
