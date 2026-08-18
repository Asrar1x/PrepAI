import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RoleExplorer from './pages/RoleExplorer';
import AptitudeTest from './pages/AptitudeTest';
import MockInterview from './pages/MockInterview';
import Dashboard from './pages/Dashboard';
import FeedbackReport from './pages/FeedbackReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<RoleExplorer />} />
          <Route path="/aptitude" element={<AptitudeTest />} />
          <Route path="/mock-interview" element={<MockInterview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/feedback" element={<FeedbackReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
