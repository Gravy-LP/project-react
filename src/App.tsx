import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import IncomingBookingsPage from './pages/IncomingBookingsPage';
import RubricaPage from './pages/RubricaPage';
import ProfilePage from './pages/ProfilePage';
import BinPage from './pages/BinPage';
import LoginPage from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <ThemeProvider>
        <ToastProvider>
        <AuthProvider>
          <ConfirmProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/incoming-bookings" element={<ProtectedRoute><IncomingBookingsPage /></ProtectedRoute>} />
              <Route path="/rubrica" element={<ProtectedRoute><RubricaPage /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/bin" element={<ProtectedRoute><BinPage /></ProtectedRoute>} />
            </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
