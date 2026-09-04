import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RoleExplorer from './pages/RoleExplorer';
import AptitudeTest from './pages/AptitudeTest';
import MockInterview from './pages/MockInterview';
import MockInterviewVoice from './pages/MockInterviewVoice';
import Dashboard from './pages/Dashboard';
import FeedbackReport from './pages/FeedbackReport';
import ResumeIntelligence from './pages/ResumeIntelligence';
import AdminPanel from './pages/AdminPanel';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import { IntelligenceHub } from './features/intelligence/IntelligenceHub';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<RoleExplorer />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/intelligence" element={<IntelligenceHub />} />
            <Route path="/intelligence/companies/:slug" element={<IntelligenceHub />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/aptitude" element={<AptitudeTest />} />
              <Route path="/mock-interview" element={<MockInterviewVoice />} />
              <Route path="/mock-interview/chat" element={<MockInterview />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/feedback/:id" element={<FeedbackReport />} />
              <Route path="/resume" element={<ResumeIntelligence />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
