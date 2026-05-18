import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLongPress } from '../hooks/useLongPress';
import { supabase } from '../lib/supabase';
import { fetchBookings, deleteBooking, updateBooking } from '../lib/api';
import { formatPhoneNumber, getInitials } from '../lib/formatters';
import BookingModal from '../components/BookingModal';
import { useTranslation } from '../context/LanguageContext';
import '../styles/incoming-bookings.css';
import '../styles/modal.css';
import '../styles/touch-menu.css';

interface Booking {
  booking_id_db: string;
  first_name: string;
  last_name: string | null;
  e_mail: string | null;
  phone_number: string | null;
  booking_date: string | null;
  type: string | null;
  booking_accepted: boolean | null;
  notes: string | null;
  profile_id: string | null;
}

export default function IncomingBookingsPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightId = searchParams.get('highlight');
  const [activeMenuBooking, setActiveMenuBooking] = useState<{id: string, x: number, y: number} | null>(null);

  const fetchBookingsData = useCallback(async () => {
    const { bookings, error } = await fetchBookings(false);
    if (error) {
      showToast('Errore nel caricamento', 'error');
    } else {
      setAllBookings((bookings as Booking[]) || []);
    }
  }, [showToast]);

  useEffect(() => { 
    fetchBookingsData(); 

    const channel = supabase
      .channel(`incoming-booking-changes-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => fetchBookingsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookingsData]);

  // Highlight effect
  useEffect(() => {
    if (highlightId && allBookings.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`booking-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          window.history.replaceState({}, document.title, '/incoming-bookings');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
        }
      }, 300);
    }
  }, [highlightId, allBookings]);

  const filteredBookings = allBookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
    const email = (b.e_mail || '').toLowerCase();
    const phone = (b.phone_number || '').replace(/\s+/g, '');
    const cleanQuery = q.replace(/\s+/g, '');

    return name.includes(q) || email.includes(q) || phone.includes(cleanQuery);
  });

  const pendingBookings = filteredBookings.filter((b) => b.booking_accepted === null);
  const acceptedBookings = filteredBookings.filter((b) => b.booking_accepted === true);
  const refusedBookings = filteredBookings.filter((b) => b.booking_accepted === false);


  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Elimina prenotazione?',
      message: "Sei sicuro di voler spostare questa prenotazione nel cestino?",
    });
    if (!confirmed) return;

    const res = await deleteBooking(id);
    if (res.success) {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      showToast('Prenotazione spostata nel cestino!', 'success');
      setAllBookings((prev) => prev.filter((b) => b.booking_id_db !== id));
    } else {
      showToast(res.error || "Errore durante l'eliminazione", 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: boolean | null) => {
    try {
      // 1. Update the booking status
      const res = await updateBooking(id, { booking_accepted: status });
      if (!res.success) {
        showToast(res.error || t('common.error'), 'error');
        return;
      }

      // 2. If accepted, ensure a PatientProfile exists
      if (status === true) {
        const booking = allBookings.find(b => b.booking_id_db === id);
        if (booking) {
          const { ensurePatientProfileForBooking } = await import('../lib/api');
          await ensurePatientProfileForBooking(booking);
        }
      }

      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast(
        `Prenotazione ${status === null ? 'ripristinata' : status ? 'accettata' : 'rifiutata'} con successo!`,
        'success'
      );
      fetchBookingsData();
    } catch (err) {
      showToast(t('common.error'), 'error');
    }
  };

  const BookingRow = ({ booking, showFullActions }: { booking: Booking, showFullActions: boolean }) => {
    const longPressProps = useLongPress({
      onLongPress: (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setActiveMenuBooking({ id: booking.booking_id_db, x: clientX, y: clientY });
        if (window.navigator.vibrate) window.navigator.vibrate(20);
      }
    });

    return (
      <tr 
        id={`booking-${booking.booking_id_db}`} 
        key={booking.booking_id_db}
        {...longPressProps}
        className={activeMenuBooking?.id === booking.booking_id_db ? 'row-active' : ''}
      >
        <td>
          <div className="user-identity">
            <div className="user-initials" aria-hidden="true">
              {getInitials(`${booking.first_name} ${booking.last_name || ''}`)}
            </div>
            <div>
              <div 
                className="user-name" 
                style={booking.profile_id ? { cursor: 'pointer', color: 'var(--color-accent)', textDecoration: 'underline' } : {}}
                onClick={() => booking.profile_id && navigate(`/profile/${booking.profile_id}`)}
              >
                {booking.first_name} {booking.last_name}
              </div>
              <div className="user-id">#{booking.booking_id_db.slice(0, 8)}</div>
            </div>
          </div>
        </td>
        {showFullActions && (
          <td>
            <div className="contact-info">
              <div className="email">{booking.e_mail}</div>
              <div className="phone">{formatPhoneNumber(booking.phone_number)}</div>
            </div>
          </td>
        )}
        <td>
          <span className="visit-date">{formatDate(booking.booking_date)}</span>
        </td>
        {showFullActions && (
          <td>
            <span className="booking-type">{booking.type || 'N/A'}</span>
          </td>
        )}
        <td>
          <span className={`status ${booking.booking_accepted === null ? 'pending' : booking.booking_accepted ? 'accepted' : 'rejected'}`}>
            {booking.booking_accepted === null ? 'In Attesa' : booking.booking_accepted ? 'Accettata' : 'Rifiutata'}
          </span>
        </td>
        <td className="hide-mobile">
          <div className="table-actions">
            {booking.booking_accepted !== true && (
              <button className="btn btn-success btn-icon" title={t('incoming.status_accepted').split(' ')[0]} onClick={() => handleUpdateStatus(booking.booking_id_db, true)}>
                <i className="ph ph-check" />
              </button>
            )}
            {booking.booking_accepted !== false && (
              <button className="btn btn-danger btn-icon" title={t('incoming.status_rejected').split(' ')[0]} onClick={() => handleUpdateStatus(booking.booking_id_db, false)}>
                <i className="ph ph-x" />
              </button>
            )}
            {booking.booking_accepted !== null && (
              <button className="btn btn-ghost btn-icon" title={t('calendar.status_pending')} onClick={() => handleUpdateStatus(booking.booking_id_db, null)}>
                <i className="ph ph-clock-counter-clockwise" />
              </button>
            )}
            <button className="btn btn-ghost btn-icon text-danger" title={t('common.delete')} onClick={() => handleDelete(booking.booking_id_db)}>
              <i className="ph ph-trash" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <Layout headerActions={
      <button className="btn btn-primary" onClick={() => setShowNewBookingModal(true)}>
        <i className="ph ph-plus" /> Nuova Prenotazione
      </button>
    }>
      <div className="glass-panel content-card">
        <div className="card-header">
          <h2>Prenotazioni in Arrivo</h2>
          <div className="filters">
            <div className="local-search-wrapper">
              <i className="ph ph-magnifying-glass" />
              <input
                type="text"
                placeholder="Cerca prenotazione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost btn-sm"><i className="ph ph-funnel" /> Filtra</button>
          </div>
        </div>

        <div className="booking-table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Paziente</th>
                <th>Contatti</th>
                <th>Data Prenotazione</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th className="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.length > 0 ? (
                pendingBookings.map((b) => <BookingRow booking={b} showFullActions={true} key={b.booking_id_db} />)
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                    Nessuna prenotazione in arrivo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="history-grid">
        <div className="glass-panel content-card">
          <div className="card-header"><h2>Accettate</h2></div>
          <div className="booking-table-wrapper">
            <table className="booking-table">
              <thead>
                <tr><th>Paziente</th><th>Data</th><th>Stato</th><th className="text-right">Azioni</th></tr>
              </thead>
              <tbody>
                {acceptedBookings.length > 0 ? (
                  acceptedBookings.map((b) => <BookingRow booking={b} showFullActions={false} key={b.booking_id_db} />)
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Nessuna prenotazione accettata</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel content-card">
          <div className="card-header"><h2>Rifiutate</h2></div>
          <div className="booking-table-wrapper">
            <table className="booking-table">
              <thead>
                <tr><th>Paziente</th><th>Data</th><th>Stato</th><th className="text-right">Azioni</th></tr>
              </thead>
              <tbody>
                {refusedBookings.length > 0 ? (
                  refusedBookings.map((b) => <BookingRow booking={b} showFullActions={false} key={b.booking_id_db} />)
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Nessuna prenotazione rifiutata</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BookingModal 
        isOpen={showNewBookingModal} 
        onClose={() => setShowNewBookingModal(false)}
        onSuccess={fetchBookingsData}
      />

      {/* Floating Touch Menu */}
      {activeMenuBooking && (
        <div className="touch-menu-overlay" onClick={() => setActiveMenuBooking(null)}>
          <div 
            className="touch-menu glass-panel animate-scale"
            style={{ 
              top: Math.min(activeMenuBooking.y, window.innerHeight - 200), 
              left: Math.min(activeMenuBooking.x, window.innerWidth - 180) 
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="touch-menu-header">Azioni rapida</div>
            {(() => {
              const b = allBookings.find(x => x.booking_id_db === activeMenuBooking.id);
              if (!b) return null;
              return (
                <>
                  {b.booking_accepted !== true && (
                    <button className="touch-menu-item" onClick={() => { handleUpdateStatus(b.booking_id_db, true); setActiveMenuBooking(null); }}>
                      <i className="ph ph-check-circle" /> {t('incoming.status_accepted').split(' ')[0]}
                    </button>
                  )}
                  {b.booking_accepted !== false && (
                    <button className="touch-menu-item" onClick={() => { handleUpdateStatus(b.booking_id_db, false); setActiveMenuBooking(null); }}>
                      <i className="ph ph-x-circle" /> {t('incoming.status_rejected').split(' ')[0]}
                    </button>
                  )}
                  {b.booking_accepted !== null && (
                    <button className="touch-menu-item" onClick={() => { handleUpdateStatus(b.booking_id_db, null); setActiveMenuBooking(null); }}>
                      <i className="ph ph-clock-counter-clockwise" /> {t('calendar.status_pending')}
                    </button>
                  )}
                </>
              );
            })()}
            <div className="touch-menu-divider"></div>
            <button className="touch-menu-item danger" onClick={() => { handleDelete(activeMenuBooking.id); setActiveMenuBooking(null); }}>
              <i className="ph ph-trash" /> Elimina
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
