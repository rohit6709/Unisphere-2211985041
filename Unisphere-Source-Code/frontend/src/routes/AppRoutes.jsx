import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';

// ─── Auth & Onboarding (eager loaded — on the critical path) ──────────────────
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import ForceChangePasswordPage from '@/pages/auth/ForceChangePasswordPage';
import StudentOnboardingPage from '@/pages/auth/StudentOnboardingPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';

// ─── Route Guards ─────────────────────────────────────────────────────────────
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

// ─── Layout ───────────────────────────────────────────────────────────────────
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/utils/roleRedirect';

// ─── Shared / Public Pages (lazy) ────────────────────────────────────────────
const ClubDirectory      = lazy(() => import('@/pages/clubs/ClubDirectory'));
const ClubProfile        = lazy(() => import('@/pages/clubs/ClubProfile'));
const ClubGovernancePage = lazy(() => import('@/pages/ClubGovernancePage'));
const DiscoveryPage      = lazy(() => import('@/pages/DiscoveryPage'));
const EventDirectory     = lazy(() => import('@/pages/events/EventDirectory'));
const EventProfile       = lazy(() => import('@/pages/events/EventProfile'));
const MessagingHub       = lazy(() => import('@/pages/chat/MessagingHub'));
const ProfileSettingsPage = lazy(() => import('@/pages/ProfileSettingsPage'));

// ─── Student Pages (lazy) ─────────────────────────────────────────────────────
const StudentDashboard     = lazy(() => import('@/pages/student/StudentDashboard'));
const NoticesPage          = lazy(() => import('@/pages/student/NoticesPage'));
const MyClubsPage          = lazy(() => import('@/pages/student/MyClubsPage'));
const MyRegistrationsPage  = lazy(() => import('@/pages/student/MyRegistrationsPage'));
const NotificationsPage    = lazy(() => import('@/pages/student/NotificationsPage'));
const StudentProfilePage   = lazy(() => import('@/pages/student/StudentProfilePage'));
const EventFeedbackPage    = lazy(() => import('@/pages/student/EventFeedbackPage'));
const RequestClubPage      = lazy(() => import('@/pages/student/RequestClubPage'));
const CreateEventPage      = lazy(() => import('@/pages/student/CreateEventPage'));
const EditEventPage        = lazy(() => import('@/pages/student/EditEventPage'));
const MySubmittedEventsPage = lazy(() => import('@/pages/student/MySubmittedEventsPage'));
const ClubBrowserPage      = lazy(() => import('@/pages/student/ClubBrowserPage'));
const ClubDetailPage       = lazy(() => import('@/pages/student/ClubDetailPage'));
const EventsPage           = lazy(() => import('@/pages/student/EventsPage'));
const EventDetailPage      = lazy(() => import('@/pages/student/EventDetailPage'));

// ─── Faculty Pages (lazy) ─────────────────────────────────────────────────────
const FacultyDashboard          = lazy(() => import('@/pages/faculty/FacultyDashboard'));
const FacultyClubManagementPage = lazy(() => import('@/pages/faculty/ClubManagementPage'));
const EventReviewPage           = lazy(() => import('@/pages/faculty/EventReviewPage'));
const FacultyNoticeManagement   = lazy(() => import('@/pages/faculty/NoticeManagementPage'));
const FacultyProfilePage        = lazy(() => import('@/pages/faculty/FacultyProfilePage'));

// ─── Admin Pages (lazy) ───────────────────────────────────────────────────────
const AdminDashboard          = lazy(() => import('@/pages/admin/AdminDashboard'));
const ApprovalCenter          = lazy(() => import('@/pages/admin/ApprovalCenter'));
const StudentManagementPage   = lazy(() => import('@/pages/admin/StudentManagementPage'));
const FacultyManagementPage   = lazy(() => import('@/pages/admin/FacultyManagementPage'));
const AdminManagementPage     = lazy(() => import('@/pages/admin/AdminManagementPage'));
const ClubAdminPage           = lazy(() => import('@/pages/admin/ClubAdminPage'));
const ClubLeadershipPage      = lazy(() => import('@/pages/admin/ClubLeadershipPage'));
const EventAdminPage          = lazy(() => import('@/pages/admin/EventAdminPage'));
const NoticeAdminPage         = lazy(() => import('@/pages/admin/NoticeAdminPage'));
const RegistrationsAdminPage  = lazy(() => import('@/pages/admin/RegistrationsAdminPage'));
const AuditLogPage            = lazy(() => import('@/pages/admin/AuditLogPage'));
const StudentUploadPage       = lazy(() => import('@/pages/admin/StudentUploadPage'));
const FacultyUploadPage       = lazy(() => import('@/pages/admin/FacultyUploadPage'));
const PlatformStatsPage       = lazy(() => import('@/pages/admin/PlatformStatsPage'));
const IntegrationHealthPage   = lazy(() => import('@/pages/admin/IntegrationHealthPage'));

// ─── Route-level Suspense Fallback ────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg
        className="h-8 w-8 animate-spin text-(--primary)"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="text-sm text-(--text)">Loading page…</p>
    </div>
  </div>
);

const DashboardRedirect = () => {
  const { role } = useAuth();

  return <Navigate to={getDashboardPath(role)} replace />;
};

// ─── 404 Page ─────────────────────────────────────────────────────────────────
const NotFoundPageComponent = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--bg) text-center px-4">
    <p className="text-8xl font-heading font-extrabold text-(--primary) opacity-20 select-none">404</p>
    <h1 className="text-2xl font-heading font-bold text-(--text-h)">Page Not Found</h1>
    <p className="text-(--text) max-w-sm">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link
      to="/"
      className="mt-2 inline-flex items-center rounded-lg bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
    >
      Back to Home
    </Link>
  </div>
);

// ─── Route Tree ───────────────────────────────────────────────────────────────
export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Public ──────────────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* ── Auth-flow (must be authenticated but no onboarding gate) ────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
          <Route path="/onboarding" element={<StudentOnboardingPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* ── Authenticated + Dashboard Layout ────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            {/* Dashboard hub — redirect to role-specific dashboard */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* ── Shared Routes (all authenticated roles) ────────────── */}
            <Route path="/discovery"        element={<DiscoveryPage />} />
            <Route path="/events"           element={<EventDirectory />} />
            <Route path="/events/:id"       element={<EventProfile />} />
            <Route path="/clubs"            element={<ClubDirectory />} />
            <Route path="/clubs/:id"        element={<ClubProfile />} />
            <Route path="/clubs/:id/governance" element={<ClubGovernancePage />} />
            <Route path="/messages"         element={<MessagingHub />} />
            <Route path="/chat"             element={<Navigate to="/messages" replace />} />
            <Route path="/notices"          element={<NoticesPage />} />
            <Route path="/notifications"    element={<NotificationsPage />} />
            <Route path="/profile/settings" element={<ProfileSettingsPage />} />

            {/* ── Student Routes ─────────────────────────────────────── */}
            <Route element={<RoleGuard allowedRoles={['student', 'club_president', 'club_vice_president']} />}>
              <Route path="/dashboard/student"    element={<StudentDashboard />} />
              <Route path="/my-clubs"             element={<MyClubsPage />} />
              <Route path="/my-registrations"     element={<MyRegistrationsPage />} />
              <Route path="/events/:id/feedback"  element={<EventFeedbackPage />} />
              <Route path="/profile/student"      element={<StudentProfilePage />} />
              <Route path="/student/clubs"        element={<ClubBrowserPage />} />
              <Route path="/student/clubs/:id"    element={<ClubDetailPage />} />
              <Route path="/student/events"       element={<EventsPage />} />
              <Route path="/student/events/:id"   element={<EventDetailPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['student', 'club_president', 'club_vice_president']} />}>
              <Route path="/events/create"         element={<CreateEventPage />} />
              <Route path="/events/my-submitted"   element={<MySubmittedEventsPage />} />
              <Route path="/events/:id/edit"       element={<EditEventPage />} />
            </Route>

            {/* ── Faculty Routes ─────────────────────────────────────── */}
            <Route element={<RoleGuard allowedRoles={['faculty', 'hod']} />}>
              <Route path="/dashboard/faculty"  element={<FacultyDashboard />} />
              <Route path="/faculty/clubs"      element={<FacultyClubManagementPage />} />
              <Route path="/clubs/request"      element={<RequestClubPage />} />
              <Route path="/faculty/events"     element={<EventReviewPage />} />
              <Route path="/faculty/notices"    element={<FacultyNoticeManagement />} />
              <Route path="/profile/faculty"    element={<FacultyProfilePage />} />
            </Route>

            {/* ── Admin Routes ───────────────────────────────────────── */}
            <Route element={<RoleGuard allowedRoles={['admin', 'superadmin']} />}>
              <Route path="/dashboard/admin"       element={<AdminDashboard />} />
              <Route path="/admin/approvals"       element={<ApprovalCenter />} />
              <Route path="/admin/students"        element={<StudentManagementPage />} />
              <Route path="/admin/faculty"         element={<FacultyManagementPage />} />
              <Route path="/admin/clubs"           element={<ClubAdminPage />} />
              <Route path="/admin/club-leadership" element={<ClubLeadershipPage />} />
              <Route path="/admin/events"          element={<EventAdminPage />} />
              <Route path="/admin/notices"         element={<NoticeAdminPage />} />
              <Route path="/admin/registrations"   element={<RegistrationsAdminPage />} />
              <Route path="/admin/audit-logs"      element={<AuditLogPage />} />
              <Route path="/admin/integration-health" element={<IntegrationHealthPage />} />
              <Route path="/admin/students/upload" element={<StudentUploadPage />} />
              <Route path="/admin/faculty/upload"  element={<FacultyUploadPage />} />

              {/* Superadmin-only within admin guard */}
              <Route element={<RoleGuard allowedRoles={['superadmin']} />}>
                <Route path="/admin/admins" element={<AdminManagementPage />} />
                <Route path="/admin/stats" element={<PlatformStatsPage />} />
              </Route>
            </Route>

          </Route>
        </Route>

        {/* ── 404 Catch-all ───────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPageComponent />} />

      </Routes>
    </Suspense>
  );
};
