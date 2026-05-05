import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import IncomingBookingsPage from './pages/IncomingBookingsPage';
import RubricaPage from './pages/RubricaPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/incoming-bookings" element={<IncomingBookingsPage />} />
            <Route path="/rubrica" element={<RubricaPage />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
