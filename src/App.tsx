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
                  <Route path="/" element={<ProtectedRoute allowedRoles={['owner']}><DashboardPage /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute allowedRoles={['owner']}><CalendarPage /></ProtectedRoute>} />
                  <Route path="/incoming-bookings" element={<ProtectedRoute allowedRoles={['owner']}><IncomingBookingsPage /></ProtectedRoute>} />
                  <Route path="/rubrica" element={<ProtectedRoute allowedRoles={['owner']}><RubricaPage /></ProtectedRoute>} />
                  <Route path="/book" element={<ProtectedRoute allowedRoles={['owner', 'user']}><UserBookingPage /></ProtectedRoute>} />
                  <Route path="/profile/:id" element={<ProtectedRoute allowedRoles={['owner', 'user']}><ProfilePage /></ProtectedRoute>} />
                  <Route path="/profilo" element={<ProtectedRoute allowedRoles={['owner', 'user']}><ProfilePage /></ProtectedRoute>} />
                  <Route path="/bin" element={<ProtectedRoute allowedRoles={['owner']}><BinPage /></ProtectedRoute>} />
                </Routes>
              </ConfirmProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
