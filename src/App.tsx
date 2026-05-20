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
import UserBookingPage from './pages/UserBookingPage';
import UserAppointmentsPage from './pages/UserAppointmentsPage';
import BinPage from './pages/BinPage';
import LoginPage from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import LandingPage from './pages/LandingPage';

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
                  <Route path="/land" element={<LandingPage />} />

                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer']}><DashboardPage /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer']}><CalendarPage /></ProtectedRoute>} />
                  <Route path="/incoming-bookings" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer']}><IncomingBookingsPage /></ProtectedRoute>} />
                  <Route path="/rubrica" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer']}><RubricaPage /></ProtectedRoute>} />
                  <Route path="/book" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer', 'user']}><UserBookingPage /></ProtectedRoute>} />
                  <Route path="/my-appointments" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer', 'user']}><UserAppointmentsPage /></ProtectedRoute>} />
                  <Route path="/profile/:id" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer', 'user']}><ProfilePage /></ProtectedRoute>} />
                  <Route path="/profilo" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer', 'user']}><ProfilePage /></ProtectedRoute>} />
                  <Route path="/bin" element={<ProtectedRoute allowedRoles={['administrator', 'manager', 'viewer']}><BinPage /></ProtectedRoute>} />
                </Routes>
              </ConfirmProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
