import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';

export function ApprovalModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  comment,
  onCommentChange,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  closeLabel = 'Close',
  isSubmitting = false,
  commentPlaceholder = 'Optional for approval, required for rejection.',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={subtitle} size="lg">
      <div className="space-y-5">
        {children}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <MessageSquare className="h-4 w-4" /> Decision Comment
          </label>
          <Textarea rows={6} value={comment} onChange={(event) => onCommentChange?.(event.target.value)} placeholder={commentPlaceholder} className="rounded-2xl" />
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{closeLabel}</Button>
          <Button variant="outline" className="text-red-600" onClick={onReject} isLoading={false} disabled={isSubmitting}>{rejectLabel}</Button>
          <Button onClick={onApprove} isLoading={isSubmitting}>{approveLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
