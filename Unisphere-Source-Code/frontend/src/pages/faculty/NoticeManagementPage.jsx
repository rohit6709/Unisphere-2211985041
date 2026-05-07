import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Trash2, Pencil, Clock, Users, Building2, Bell, BadgeAlert, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { NoticeForm } from '@/components/features/NoticeForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createNotice, deleteNotice, getMyPostedNotices, updateNotice } from '@/services/noticeService';
import { getMyAdvisedClubs } from '@/services/clubService';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'department', label: 'Department' },
  { value: 'club', label: 'Specific Club' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const getMinExpiryValue = () => new Date(Date.now() + 60_000).toISOString().slice(0, 16);

const defaultForm = {
  title: '',
  content: '',
  targetAudience: 'all',
  targetDepartment: '',
  targetClub: '',
  priority: 'medium',
  expiresAt: '',
};

export default function FacultyNoticeManagementPage() {
  useDocumentTitle('Notice Board Management');
  const queryClient = useQueryClient();

  const [form, setForm] = useState(defaultForm);
  const [editingNoticeId, setEditingNoticeId] = useState('');
  const [minExpiryValue] = useState(getMinExpiryValue);

  const { data: postedData, isLoading, refetch: refetchNotices } = useQuery({
    queryKey: ['faculty-posted-notices'],
    queryFn: () => getMyPostedNotices({ page: 1, limit: 100 }),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const { data: advisedClubData } = useQuery({
    queryKey: ['faculty-advised-clubs'],
    queryFn: () => getMyAdvisedClubs(),
  });

  const notices = useMemo(() => postedData?.notices || [], [postedData]);
  const advisedClubs = advisedClubData?.clubs || [];

  const submitMutation = useMutation({
    mutationFn: (payload) => {
      if (editingNoticeId) {
        return updateNotice(editingNoticeId, payload);
      }
      return createNotice(payload);
    },
    onSuccess: () => {
      toast.success(editingNoticeId ? 'Notice updated successfully' : 'Notice created successfully');
      queryClient.invalidateQueries({ queryKey: ['faculty-posted-notices'] });
      // Explicitly refetch to ensure immediate update
      refetchNotices();
      setEditingNoticeId('');
      setForm(defaultForm);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save notice');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noticeId) => deleteNotice(noticeId),
    onSuccess: () => {
      toast.success('Notice deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['faculty-posted-notices'] });
      refetchNotices();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete notice');
    },
  });

  const expireMutation = useMutation({
    mutationFn: (noticeId) => updateNotice(noticeId, { forceExpire: true }),
    onSuccess: () => {
      toast.success('Notice marked as expired');
      queryClient.invalidateQueries({ queryKey: ['faculty-posted-notices'] });
      refetchNotices();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to expire notice');
    },
  });

  const isExpired = (expiresAt) => Boolean(expiresAt && new Date(expiresAt) <= new Date());

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    if (form.targetAudience === 'department' && !form.targetDepartment.trim()) {
      toast.error('Department is required for department-targeted notices');
      return;
    }

    if (form.targetAudience === 'club' && !form.targetClub) {
      toast.error('Please select a target club');
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      expiresAt: form.expiresAt || null,
    };

    if (!editingNoticeId) {
      payload.targetAudience = form.targetAudience;
      payload.targetDepartment = form.targetAudience === 'department' ? form.targetDepartment.trim() : null;
      payload.targetClub = form.targetAudience === 'club' ? form.targetClub : null;
    }

    submitMutation.mutate(payload);
  };

  const startEdit = (notice) => {
    setEditingNoticeId(notice._id);
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      targetAudience: notice.targetAudience || 'all',
      targetDepartment: notice.targetDepartment || '',
      targetClub: notice.targetClub?._id || '',
      priority: notice.priority || 'medium',
      expiresAt: notice.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 16) : '',
    });
  };

  const sortedNotices = useMemo(
    () =>
      [...notices].sort((a, b) => {
        const aArchived = isExpired(a.expiresAt) || !a.isActive;
        const bArchived = isExpired(b.expiresAt) || !b.isActive;
        if (aArchived !== bArchived) return Number(aArchived) - Number(bArchived);
        return new Date(b.createdAt) - new Date(a.createdAt);
      }),
    [notices]
  );

  const getAudienceLabel = (notice) => {
    if (notice.targetAudience === 'department') {
      return notice.targetDepartment ? `Department: ${notice.targetDepartment}` : 'Department';
    }
    if (notice.targetAudience === 'club') {
      return notice.targetClub?.name ? `Club: ${notice.targetClub.name}` : 'Specific Club';
    }
    return 'All Users';
  };

  const getPriorityBadgeClass = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (priority === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-orange-500" />
            Notice Board Management
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Publish audience-targeted notices, set expiry windows, and manage posted announcements from one faculty workspace.
          </p>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {editingNoticeId ? 'Edit Notice' : 'Create Notice'}
        </h2>
        <NoticeForm
          values={form}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value, ...(key === 'targetAudience' ? { targetDepartment: '', targetClub: '' } : {}) }))}
          onSubmit={() => handleSubmit({ preventDefault() {} })}
          onCancel={editingNoticeId ? () => {
            setEditingNoticeId('');
            setForm(defaultForm);
          } : undefined}
          isSubmitting={submitMutation.isPending}
          submitLabel={editingNoticeId ? 'Update Notice' : 'Publish Notice'}
          audienceOptions={AUDIENCE_OPTIONS}
          priorityOptions={PRIORITY_OPTIONS}
          clubOptions={advisedClubs}
          showAudienceFields={!editingNoticeId}
          minExpiryValue={minExpiryValue}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Posted Notices</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : !sortedNotices.length ? (
          <EmptyState
            title="No posted notices yet"
            description="Your published notices will appear here with edit, expire, and delete actions."
            icon={Bell}
          />
        ) : (
          <div className="space-y-4">
            {sortedNotices.map((notice) => {
              const expired = isExpired(notice.expiresAt);
              const inactive = !notice.isActive;

              return (
                <article key={notice._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{notice.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(notice.createdAt).toLocaleString()}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {getAudienceLabel(notice)}</span>
                        {notice.targetAudience === 'club' && notice.targetClub?.department && (
                          <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {notice.targetClub.department}</span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${getPriorityBadgeClass(notice.priority)}`}>
                          {notice.priority}
                        </span>
                        {notice.expiresAt && <span>Expires: {new Date(notice.expiresAt).toLocaleString()}</span>}
                        {expired && (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                            <BadgeAlert className="h-3.5 w-3.5" /> Expired
                          </span>
                        )}
                        {inactive && !expired && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Ban className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(notice)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!window.confirm('Mark this notice as expired now?')) return;
                          expireMutation.mutate(notice._id);
                        }}
                        disabled={expired || expireMutation.isPending}
                        isLoading={expireMutation.isPending && expireMutation.variables === notice._id}
                      >
                        Mark Expired
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          if (!window.confirm('Delete this notice permanently?')) return;
                          deleteMutation.mutate(notice._id);
                        }}
                        isLoading={deleteMutation.isPending && deleteMutation.variables === notice._id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{notice.content}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
