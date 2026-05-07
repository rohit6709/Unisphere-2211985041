import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { assignAdvisor, assignPresident, assignVicePresident, getAllClubs, getClubById } from '@/services/clubService';
import { getAllFaculty, getAllStudents } from '@/services/authService';

const INPUT_CLASS = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100';

export default function ClubLeadershipPage() {
  useDocumentTitle('Club Leadership | Unisphere');
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = React.useState('');
  const [presidentSearch, setPresidentSearch] = React.useState('');
  const [viceSearch, setViceSearch] = React.useState('');
  const [advisorSearch, setAdvisorSearch] = React.useState('');
  const [presidentRollNo, setPresidentRollNo] = React.useState('');
  const [vicePresidentRollNo, setVicePresidentRollNo] = React.useState('');
  const [advisorEmployeeId, setAdvisorEmployeeId] = React.useState('');

  const clubsQuery = useQuery({
    queryKey: ['club-leadership-clubs'],
    queryFn: () => getAllClubs({ page: 1, limit: 500, status: 'active' }),
    staleTime: 60_000,
  });

  const clubDetailQuery = useQuery({
    queryKey: ['club-leadership-detail', selectedClubId],
    queryFn: () => getClubById(selectedClubId),
    enabled: Boolean(selectedClubId),
  });

  const presidentStudentsQuery = useQuery({
    queryKey: ['club-leadership-students-president', presidentSearch],
    queryFn: () => getAllStudents({ page: 1, limit: 20, search: presidentSearch || undefined }),
    staleTime: 30_000,
  });

  const viceStudentsQuery = useQuery({
    queryKey: ['club-leadership-students-vice', viceSearch],
    queryFn: () => getAllStudents({ page: 1, limit: 20, search: viceSearch || undefined }),
    staleTime: 30_000,
  });

  const advisorsQuery = useQuery({
    queryKey: ['club-leadership-advisors', advisorSearch],
    queryFn: () => getAllFaculty({ page: 1, limit: 20, search: advisorSearch || undefined, isActive: true }),
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (!clubDetailQuery.data) return;
    setPresidentRollNo(clubDetailQuery.data.president?.rollNo || '');
    setVicePresidentRollNo(clubDetailQuery.data.vicePresident?.rollNo || '');
    setAdvisorEmployeeId('');
  }, [clubDetailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClubId) {
        throw new Error('Please select a club first');
      }
      if (!presidentRollNo) {
        throw new Error('President selection is required');
      }
      if (!vicePresidentRollNo) {
        throw new Error('Vice president selection is required');
      }
      if (presidentRollNo === vicePresidentRollNo) {
        throw new Error('President and vice president must be different students');
      }

      const detail = clubDetailQuery.data;
      const currentPresident = detail?.president?.rollNo || '';
      const currentVicePresident = detail?.vicePresident?.rollNo || '';
      const currentAdvisorEmployeeIds = new Set((detail?.advisors || []).map((advisor) => advisor.employeeId));

      const jobs = [];
      if (presidentRollNo !== currentPresident) {
        jobs.push(assignPresident(selectedClubId, { rollNo: presidentRollNo }));
      }
      if (vicePresidentRollNo !== currentVicePresident) {
        jobs.push(assignVicePresident(selectedClubId, { rollNo: vicePresidentRollNo }));
      }
      if (advisorEmployeeId && !currentAdvisorEmployeeIds.has(advisorEmployeeId)) {
        jobs.push(assignAdvisor(selectedClubId, { employeeId: advisorEmployeeId }));
      }

      if (!jobs.length) {
        throw new Error('No leadership changes to save');
      }

      await Promise.all(jobs);
    },
    onSuccess: () => {
      toast.success('Club leadership updated successfully');
      queryClient.invalidateQueries({ queryKey: ['club-leadership-detail', selectedClubId] });
      queryClient.invalidateQueries({ queryKey: ['club-admin-detail', selectedClubId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update leadership');
    },
  });

  const clubs = clubsQuery.data?.clubs || [];
  const clubDetail = clubDetailQuery.data;
  const presidentStudents = presidentStudentsQuery.data?.students || [];
  const viceStudents = viceStudentsQuery.data?.students || [];
  const advisors = advisorsQuery.data?.faculty || [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Club Leadership Management</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select a club, review current leaders, search candidates, and apply leadership updates safely.
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Select Club</label>
        <select
          className={INPUT_CLASS}
          value={selectedClubId}
          onChange={(event) => setSelectedClubId(event.target.value)}
        >
          <option value="">Choose an active club</option>
          {clubs.map((club) => (
            <option key={club._id} value={club._id}>
              {club.name} ({club.department || 'General'})
            </option>
          ))}
        </select>
      </section>

      {!selectedClubId ? (
        <EmptyState title="Pick a club to continue" description="Leadership controls appear after selecting a club." icon={ShieldCheck} />
      ) : clubDetailQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-3xl" />)}
        </div>
      ) : !clubDetail ? (
        <EmptyState title="Club not found" description="Try selecting another active club." icon={Users} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Leadership</h2>
            <div className="mt-4 space-y-4 text-sm">
              <InfoRow label="President" value={clubDetail.president ? `${clubDetail.president.name} (${clubDetail.president.rollNo})` : 'Not assigned'} />
              <InfoRow label="Vice President" value={clubDetail.vicePresident ? `${clubDetail.vicePresident.name} (${clubDetail.vicePresident.rollNo})` : 'Not assigned'} />
              <InfoRow
                label="Advisors"
                value={clubDetail.advisors?.length
                  ? clubDetail.advisors.map((advisor) => `${advisor.name} (${advisor.employeeId})`).join(', ')
                  : 'Not assigned'}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Update Leadership</h2>

            <SearchSelect
              label="President Candidate"
              searchValue={presidentSearch}
              setSearchValue={setPresidentSearch}
              selectedValue={presidentRollNo}
              onSelect={setPresidentRollNo}
              options={presidentStudents.map((student) => ({
                value: student.rollNo,
                label: `${student.name} (${student.rollNo})`,
              }))}
              placeholder="Search students by name/roll no"
              loading={presidentStudentsQuery.isFetching}
            />

            <SearchSelect
              label="Vice President Candidate"
              searchValue={viceSearch}
              setSearchValue={setViceSearch}
              selectedValue={vicePresidentRollNo}
              onSelect={setVicePresidentRollNo}
              options={viceStudents.map((student) => ({
                value: student.rollNo,
                label: `${student.name} (${student.rollNo})`,
              }))}
              placeholder="Search students by name/roll no"
              loading={viceStudentsQuery.isFetching}
            />

            <SearchSelect
              label="Advisor to Add (Optional)"
              searchValue={advisorSearch}
              setSearchValue={setAdvisorSearch}
              selectedValue={advisorEmployeeId}
              onSelect={setAdvisorEmployeeId}
              options={advisors.map((faculty) => ({
                value: faculty.employeeId,
                label: `${faculty.name} (${faculty.employeeId})`,
              }))}
              placeholder="Search faculty by name/employee id"
              loading={advisorsQuery.isFetching}
            />

            <div className="mt-6 flex justify-end">
              <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
                Confirm & Save
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SearchSelect({
  label,
  searchValue,
  setSearchValue,
  selectedValue,
  onSelect,
  options,
  placeholder,
  loading,
}) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className={`${INPUT_CLASS} pl-11`}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      <select className={`${INPUT_CLASS} mt-2`} value={selectedValue} onChange={(event) => onSelect(event.target.value)}>
        <option value="">Select candidate</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {loading && <p className="mt-2 text-xs text-gray-500">Searching…</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}
