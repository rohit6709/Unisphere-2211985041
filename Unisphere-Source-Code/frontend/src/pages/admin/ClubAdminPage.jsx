import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Plus, Search, Settings2, ShieldCheck, Tag, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  assignPresident,
  assignVicePresident,
  createClub,
  getAllClubs,
  getClubById,
  getClubMembers,
  removeMember,
  toggleClubStatus,
  updateClub,
  updateClubTags,
} from '@/services/clubService';
import { getAllFaculty, getAllStudents } from '@/services/authService';

const TAG_OPTIONS = [
  'coding', 'web_development', 'ai_ml', 'cybersecurity', 'robotics', 'data_science', 'music', 'dance', 'drama',
  'photography', 'art', 'film_making', 'cricket', 'football', 'basketball', 'athletics', 'chess', 'debate',
  'public_speaking', 'entrepreneurship', 'research', 'finance', 'marketing', 'cultural', 'social_service',
  'environment', 'health_wellness',
];

const INPUT_CLASS = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-950';

const emptyCreateForm = {
  name: '',
  description: '',
  department: '',
  advisorEmployeeId: '',
};

export default function ClubAdminPage() {
  useDocumentTitle('Club Administration | Unisphere');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [selectedClubId, setSelectedClubId] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState(emptyCreateForm);
  const [editForm, setEditForm] = React.useState({ name: '', description: '', department: '' });
  const [leadership, setLeadership] = React.useState({ presidentRollNo: '', vicePresidentRollNo: '' });
  const [tagState, setTagState] = React.useState({ predefined: [], custom: '' });

  const { data: clubsData, isLoading } = useQuery({
    queryKey: ['club-admin-list', search, statusFilter],
    queryFn: () => getAllClubs({ page: 1, limit: 200, search: search || undefined, status: statusFilter || undefined }),
  });

  const { data: clubDetail, isLoading: clubLoading } = useQuery({
    queryKey: ['club-admin-detail', selectedClubId],
    queryFn: () => getClubById(selectedClubId),
    enabled: Boolean(selectedClubId),
  });

  const { data: memberData } = useQuery({
    queryKey: ['club-admin-members', selectedClubId],
    queryFn: () => getClubMembers(selectedClubId, { page: 1, limit: 200 }),
    enabled: Boolean(selectedClubId),
  });

  const { data: facultyData } = useQuery({
    queryKey: ['club-admin-faculty'],
    queryFn: () => getAllFaculty({ page: 1, limit: 500, isActive: true }),
  });

  const { data: studentData } = useQuery({
    queryKey: ['club-admin-students'],
    queryFn: () => getAllStudents({ page: 1, limit: 1000 }),
  });

  React.useEffect(() => {
    if (!clubDetail) return;
    setEditForm({
      name: clubDetail.name || '',
      description: clubDetail.description || '',
      department: clubDetail.department || '',
    });
    setLeadership({
      presidentRollNo: clubDetail.president?.rollNo || '',
      vicePresidentRollNo: clubDetail.vicePresident?.rollNo || '',
    });
    setTagState({
      predefined: clubDetail.tags?.predefined || [],
      custom: (clubDetail.tags?.custom || []).join(', '),
    });
  }, [clubDetail]);

  const clubs = clubsData?.clubs || [];

  console.log('Club Detail:', clubs);
  const clubMembers = memberData?.members || clubDetail?.members || [];
  const faculty = facultyData?.faculty || [];
  const students = studentData?.students || [];

  const invalidateClubs = () => {
    queryClient.invalidateQueries({ queryKey: ['club-admin-list'] });
    queryClient.invalidateQueries({ queryKey: ['club-admin-detail', selectedClubId] });
    queryClient.invalidateQueries({ queryKey: ['club-admin-members', selectedClubId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createClub(payload),
    onSuccess: () => {
      toast.success('Club created successfully');
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to create club'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ clubId, payload }) => updateClub(clubId, payload),
    onSuccess: () => {
      toast.success('Club details updated');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to update club'),
  });

  const tagMutation = useMutation({
    mutationFn: ({ clubId, payload }) => updateClubTags(clubId, payload),
    onSuccess: () => {
      toast.success('Club tags updated');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to update tags'),
  });

  const presidentMutation = useMutation({
    mutationFn: ({ clubId, rollNo }) => assignPresident(clubId, { rollNo }),
    onSuccess: () => {
      toast.success('President updated');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to assign president'),
  });

  const vicePresidentMutation = useMutation({
    mutationFn: ({ clubId, rollNo }) => assignVicePresident(clubId, { rollNo }),
    onSuccess: () => {
      toast.success('Vice president updated');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to assign vice president'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ clubId, rollNo }) => removeMember(clubId, rollNo),
    onSuccess: () => {
      toast.success('Member removed from club');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to remove member'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (clubId) => toggleClubStatus(clubId),
    onSuccess: () => {
      toast.success('Club status updated');
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to toggle club status'),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, nextStatus }) => {
      const selectedClubs = clubs.filter((club) => ids.includes(club._id));
      const actionable = selectedClubs.filter((club) => ['active', 'inactive'].includes(club.status) && club.status !== nextStatus);
      await Promise.all(actionable.map((club) => toggleClubStatus(club._id)));
      return actionable.length;
    },
    onSuccess: (count) => {
      toast.success(`Updated ${count} clubs`);
      setSelectedIds([]);
      invalidateClubs();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Bulk action failed'),
  });

  const handleBulkToggle = (nextStatus) => {
    if (!selectedIds.length) {
      toast.error('Select at least one club first');
      return;
    }
    bulkMutation.mutate({ ids: selectedIds, nextStatus });
  };

  const saveCreate = () => {
    if (!createForm.name.trim() || !createForm.advisorEmployeeId) {
      toast.error('Club name and advisor are required');
      return;
    }
    createMutation.mutate({
      ...createForm,
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      department: createForm.department.trim(),
    });
  };

  const saveDetails = () => {
    if (!selectedClubId) return;
    updateMutation.mutate({ clubId: selectedClubId, payload: editForm });
  };

  const saveTags = () => {
    if (!selectedClubId) return;
    const custom = tagState.custom
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    tagMutation.mutate({ clubId: selectedClubId, payload: { predefined: tagState.predefined, custom } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Club Administration</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Search and govern clubs, create new organizations, assign leadership, manage members and tags, and handle bulk operational actions safely.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Club
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_1fr]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by club name or description"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm dark:border-gray-800 dark:bg-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => handleBulkToggle('active')} isLoading={bulkMutation.isPending}>Bulk Activate</Button>
          <Button variant="outline" onClick={() => handleBulkToggle('inactive')} isLoading={bulkMutation.isPending}>Bulk Deactivate</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} className="h-56 w-full rounded-3xl" />
          ))}
        </div>
      ) : clubs.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <article key={club._id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-start justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(club._id)}
                    onChange={(event) => {
                      setSelectedIds((current) =>
                        event.target.checked ? [...current, club._id] : current.filter((id) => id !== club._id)
                      );
                    }}
                  />
                  Select
                </label>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                  club.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : club.status === 'inactive'
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      : club.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                }`}>
                  {club.status}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{club.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{club.description || 'No description provided.'}</p>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {club.department || 'All departments'}</p>
                <p className="flex items-center gap-2"><Users className="h-4 w-4" /> {club.members?.length || 0} members</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {club.president?.name || 'No president assigned'}</p>
              </div>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedClubId(club._id)}>
                  <Settings2 className="mr-2 h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toggleStatusMutation.mutate(club._id)}
                  isLoading={toggleStatusMutation.isPending && toggleStatusMutation.variables === club._id}
                >
                  Toggle Status
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No clubs found" description="Adjust your filters or create a new club to get started." icon={Building2} />
      )}

      {createOpen && (
        <Modal title="Create New Club" onClose={() => setCreateOpen(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Club Name">
                      <input value={createForm.name} onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Department">
                      <input value={createForm.department} onChange={(event) => setCreateForm((state) => ({ ...state, department: event.target.value }))} className={INPUT_CLASS} />
            </Field>
          </div>
          <Field label="Advisor">
            <select value={createForm.advisorEmployeeId} onChange={(event) => setCreateForm((state) => ({ ...state, advisorEmployeeId: event.target.value }))} className={INPUT_CLASS}>
              <option value="">Select advisor</option>
              {faculty.map((member) => (
                <option key={member._id} value={member.employeeId}>
                  {member.name} ({member.employeeId})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              rows={5}
              value={createForm.description}
              onChange={(event) => setCreateForm((state) => ({ ...state, description: event.target.value }))}
              className={INPUT_CLASS}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveCreate} isLoading={createMutation.isPending}>Create Club</Button>
          </div>
        </Modal>
      )}

      {selectedClubId && (
        <Modal title={clubDetail?.name || 'Club Details'} onClose={() => setSelectedClubId(null)} wide>
          {clubLoading || !clubDetail ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Club Details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Name">
                      <input value={editForm.name} onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Department">
                      <input value={editForm.department} onChange={(event) => setEditForm((state) => ({ ...state, department: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea rows={4} value={editForm.description} onChange={(event) => setEditForm((state) => ({ ...state, description: event.target.value }))} className={INPUT_CLASS} />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={saveDetails} isLoading={updateMutation.isPending}>Save Details</Button>
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Tags</h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => {
                      const active = tagState.predefined.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTagState((state) => ({
                            ...state,
                            predefined: active ? state.predefined.filter((item) => item !== tag) : [...state.predefined, tag],
                          }))}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            active ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Custom Tags (comma separated)">
                    <input value={tagState.custom} onChange={(event) => setTagState((state) => ({ ...state, custom: event.target.value }))} className={INPUT_CLASS} />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={saveTags} isLoading={tagMutation.isPending}>Save Tags</Button>
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3>
                  <div className="mt-4 space-y-3">
                    {clubMembers.map((member) => (
                      <div key={member._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.rollNo} • {member.department || 'N/A'}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="text-red-600"
                          onClick={() => removeMemberMutation.mutate({ clubId: selectedClubId, rollNo: member.rollNo })}
                          isLoading={
                            removeMemberMutation.isPending &&
                            removeMemberMutation.variables?.rollNo === member.rollNo
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leadership</h3>
                  <Field label="President">
                    <select value={leadership.presidentRollNo} onChange={(event) => setLeadership((state) => ({ ...state, presidentRollNo: event.target.value }))} className={INPUT_CLASS}>
                      <option value="">Select president</option>
                      {students.map((student) => (
                        <option key={student._id} value={student.rollNo}>
                          {student.name} ({student.rollNo})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => presidentMutation.mutate({ clubId: selectedClubId, rollNo: leadership.presidentRollNo })}
                      isLoading={presidentMutation.isPending}
                    >
                      Assign President
                    </Button>
                  </div>
                  <Field label="Vice President">
                    <select value={leadership.vicePresidentRollNo} onChange={(event) => setLeadership((state) => ({ ...state, vicePresidentRollNo: event.target.value }))} className={INPUT_CLASS}>
                      <option value="">Select vice president</option>
                      {students.map((student) => (
                        <option key={student._id} value={student.rollNo}>
                          {student.name} ({student.rollNo})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => vicePresidentMutation.mutate({ clubId: selectedClubId, rollNo: leadership.vicePresidentRollNo })}
                      isLoading={vicePresidentMutation.isPending}
                    >
                      Assign Vice President
                    </Button>
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Club Summary</h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-semibold text-gray-900 dark:text-white">Status:</span> {clubDetail.status}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-white">Advisors:</span> {(clubDetail.advisors || []).map((advisor) => advisor.name).join(', ') || 'None'}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-white">Members:</span> {clubMembers.length}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-white">President:</span> {clubDetail.president?.name || 'Unassigned'}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-white">Vice President:</span> {clubDetail.vicePresident?.name || 'Unassigned'}</p>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => toggleStatusMutation.mutate(selectedClubId)}
                      isLoading={toggleStatusMutation.isPending && toggleStatusMutation.variables === selectedClubId}
                    >
                      Toggle Status
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`mx-auto mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 ${wide ? 'max-w-7xl' : 'max-w-3xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}
