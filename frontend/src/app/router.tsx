import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePageMeta } from '../lib/usePageMeta';

// Layouts
import { StudentLayout } from '../components/layout/StudentLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Public & Auth Pages
import { Landing } from '../pages/landing/Landing';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { Privacy, Terms } from '../pages/legal/Legal';

// Roles & Companies
import { RoleExplorer } from '../pages/roles/RoleExplorer';
import { RoleDetail } from '../pages/roles/RoleDetail';
import { CompanyDetail } from '../pages/roles/CompanyDetail';
import { SkillGapAnalyzer } from '../pages/roles/SkillGapAnalyzer';

// Aptitude Suite
import { AptitudeConfig } from '../pages/aptitude/AptitudeConfig';
import { AptitudeTest } from '../pages/aptitude/AptitudeTest';
import { AptitudeResults } from '../pages/aptitude/AptitudeResults';
import { AptitudeHistory } from '../pages/aptitude/AptitudeHistory';
import { DailyQuest } from '../pages/aptitude/DailyQuest';

// Voice Mock Interview
import { InterviewConfig } from '../pages/interview/InterviewConfig';
import { InterviewSession } from '../pages/interview/InterviewSession';
import { InterviewEnd } from '../pages/interview/InterviewEnd';

// Resume & ATS Optimization
import { ResumeUpload } from '../pages/resume/ResumeUpload';
import { ATSScore } from '../pages/resume/ATSScore';
import { BulletGenerator } from '../pages/resume/BulletGenerator';

// Report
import { Report } from '../pages/report/Report';
import { SharedReport } from '../pages/report/SharedReport';

// Dashboard & Analytics
import { Dashboard } from '../pages/dashboard/Dashboard';
import { Progress } from '../pages/analytics/Progress';
import { Gamification } from '../pages/gamification/Gamification';
import { Profile } from '../pages/profile/Profile';
import { NotificationSettings } from '../pages/profile/NotificationSettings';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { BatchAnalytics } from '../pages/admin/BatchAnalytics';
import { StudentManagement } from '../pages/admin/StudentManagement';
import { QuestionUpload } from '../pages/admin/QuestionUpload';
import { DriveActivation } from '../pages/admin/DriveActivation';
import { InterviewEvents } from '../pages/admin/InterviewEvents';
import { ReportExport } from '../pages/admin/ReportExport';

import NotFound from '../pages/NotFound';

// Route Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !['admin', 'super_admin', 'placement_officer', 'recruiter'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  usePageMeta();
  return (
    <Routes>
      {/* 1. Public Standalone Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/report/shared/:token" element={<SharedReport />} />

      {/* 2. Student Platform Routes (under StudentLayout) */}
      <Route element={<StudentLayout />}>
        {/* Publicly Browsable Discovery */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/roles" element={<RoleExplorer />} />
        <Route path="/roles/:roleSlug" element={<RoleDetail />} />
        <Route path="/roles/:roleSlug/gap" element={<SkillGapAnalyzer />} />
        <Route path="/companies" element={<CompanyDetail />} />
        <Route path="/companies/:companySlug" element={<CompanyDetail />} />

        {/* Authenticated Student Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aptitude"
          element={
            <ProtectedRoute>
              <AptitudeConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aptitude/:sessionId"
          element={
            <ProtectedRoute>
              <AptitudeTest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aptitude/:sessionId/results"
          element={
            <ProtectedRoute>
              <AptitudeResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aptitude/history"
          element={
            <ProtectedRoute>
              <AptitudeHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aptitude/daily"
          element={
            <ProtectedRoute>
              <DailyQuest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interview"
          element={
            <ProtectedRoute>
              <InterviewConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:sessionId"
          element={
            <ProtectedRoute>
              <InterviewSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:sessionId/end"
          element={
            <ProtectedRoute>
              <InterviewEnd />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumeUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume/score"
          element={
            <ProtectedRoute>
              <ATSScore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume/bullets"
          element={
            <ProtectedRoute>
              <BulletGenerator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/report/:sessionId"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:sessionId"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:sessionId"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics/progress"
          element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gamification"
          element={
            <ProtectedRoute>
              <Gamification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/notifications"
          element={
            <ProtectedRoute>
              <NotificationSettings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 3. Admin Protected Routes (under AdminLayout) */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/batches" element={<BatchAnalytics />} />
        <Route path="/admin/students" element={<StudentManagement />} />
        <Route path="/admin/questions/upload" element={<QuestionUpload />} />
        <Route path="/admin/drives" element={<DriveActivation />} />
        <Route path="/admin/events" element={<InterviewEvents />} />
        <Route path="/admin/reports" element={<ReportExport />} />
      </Route>
    </Routes>
  );
};
