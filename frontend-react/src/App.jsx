import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LogoutPage from './pages/LogoutPage';
import TrackCasePage from './pages/TrackCasePage';
import CaseHistoryPage from './pages/CaseHistoryPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import FileCase from './pages/dashboard/FileCase';
import SearchCases from './pages/dashboard/SearchCases';
import CaseDetail from './pages/dashboard/CaseDetail';
import ManageCases from './pages/dashboard/ManageCases';
import HearingsOrdersPage from './pages/dashboard/HearingsOrdersPage';
import UserManagement from './pages/dashboard/UserManagement';
import ProfilePage from './pages/dashboard/ProfilePage';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
      <Route path="/track-case" element={<TrackCasePage />} />
      <Route path="/track-case/:caseNumber" element={<CaseHistoryPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="file-case" element={<FileCase />} />
        <Route path="search" element={<SearchCases />} />
        <Route path="case/:caseNumber" element={<CaseDetail />} />
        <Route path="manage" element={<ManageCases />} />
        <Route path="hearings" element={<HearingsOrdersPage />} />
        <Route path="orders" element={<HearingsOrdersPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      {user && <Sidebar />}
      <main className="main-content">
        <AppRoutes />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
