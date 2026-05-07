import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLongPress } from '../hooks/useLongPress';
import { supabase } from '../lib/supabase';
import { fetchBookings, deleteBooking, updateBooking, createBooking } from '../lib/api';
import { getAvailableSlots } from '../lib/booking-utils';
import { formatPhoneNumber } from '../lib/formatters';
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
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightId = searchParams.get('highlight');
  const [activeMenuBooking, setActiveMenuBooking] = useState<{id: string, x: number, y: number} | null>(null);
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isCalMinimized, setIsCalMinimized] = useState(false);

  const fetchAvailableSlots = async (date: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(date);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const renderMiniCalendar = (date: string, onSelect: (ds: string) => void) => {
    if (isCalMinimized && date) {
      const [yy, mm, dd] = date.split('-');
      return (
        <div className="mini-calendar-summary" onClick={() => setIsCalMinimized(false)}>
          <div className="summary-date">
            <i className="ph ph-calendar" />
            <span>{dd}/{mm}/{yy}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm">Cambia</button>
        </div>
      );
    }

    const vd = new Date(date || new Date());
    const vy = vd.getFullYear(), vm = vd.getMonth();
    const vfd = new Date(vy, vm, 1).getDay();
    const vdim = new Date(vy, vm + 1, 0).getDate();
    const voff = vfd === 0 ? 6 : vfd - 1;
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    
    const days = [];
    for (let i = 0; i < voff; i++) days.push(<div key={`e-${i}`} className="mini-day empty"></div>);
    
    for (let d = 1; d <= vdim; d++) {
      const ds = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(vy, vm, d);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const isSelected = date === ds;
      
      days.push(
        <button
          key={ds}
          type="button"
          className={`mini-day ${isWeekend ? 'weekend' : ''} ${isSelected ? 'active' : ''}`}
          onClick={() => {
            onSelect(ds);
            setIsCalMinimized(true);
          }}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="mini-calendar animate-in">
        <div className="mini-calendar-header">{monthNames[vm]} {vy}</div>
        <div className="mini-calendar-weekdays">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(w => <span key={w}>{w}</span>)}
        </div>
        <div className="mini-calendar-grid">{days}</div>
      </div>
    );
  };

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
      .channel('incoming-booking-changes')
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

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

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
    const res = await updateBooking(id, { booking_accepted: status });
    if (res.success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast(
        `Prenotazione ${status === null ? 'ripristinata' : status ? 'accettata' : 'rifiutata'} con successo!`,
        'success'
      );
      fetchBookingsData();
    } else {
      showToast(res.error || "Errore durante l'aggiornamento", 'error');
    }
  };

  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const datePart = (formData.get('booking_date_part') as string);
    const timePart = (formData.get('booking_time_part') as string);
    const booking_date = `${datePart}T${timePart}:00`;
    
    const data = {
      first_name: formData.get('first_name') as string,
      last_name: (formData.get('last_name') as string) || null,
      e_mail: (formData.get('e_mail') as string) || null,
      phone_number: (formData.get('phone_number') as string) || null,
      booking_date,
      type: (formData.get('type') as string) || 'Visita',
      booking_accepted: true,
    };

    const res = await createBooking(data);
    if (res.success) {
      showToast('Prenotazione creata con successo!', 'success');
      setShowNewBookingModal(false);
      fetchBookingsData();
    } else {
      showToast(res.error || 'Errore nella creazione', 'error');
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
            {showFullActions && (
              <>
                <button className="btn btn-success btn-icon" title="Accetta" onClick={() => handleUpdateStatus(booking.booking_id_db, true)}>
                  <i className="ph ph-check" />
                </button>
                <button className="btn btn-danger btn-icon" title="Rifiuta" onClick={() => handleUpdateStatus(booking.booking_id_db, false)}>
                  <i className="ph ph-x" />
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-icon text-danger" title="Elimina" onClick={() => handleDelete(booking.booking_id_db)}>
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

      {/* New Booking Modal */}
      <Modal isOpen={showNewBookingModal} onClose={() => setShowNewBookingModal(false)}>
        <div className="patient-form-header">
          <h2>Nuova Prenotazione</h2>
          <p>Inserisci i dettagli per creare una nuova prenotazione.</p>
        </div>
        <form className="patient-form" onSubmit={handleNewBookingSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome</label>
              <input type="text" name="first_name" placeholder="es. Mario" required />
            </div>
            <div className="form-group">
              <label>Cognome</label>
              <input type="text" name="last_name" placeholder="es. Rossi" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="e_mail" placeholder="mario@esempio.it" />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input type="tel" name="phone_number" placeholder="+39 ..." />
            </div>
            <div className="form-group full-width">
              <label>Data Prenotazione</label>
              {renderMiniCalendar(selectedDate, (ds) => {
                setSelectedDate(ds);
                fetchAvailableSlots(ds);
              })}
              <input type="hidden" name="booking_date_part" value={selectedDate} required />
            </div>
            <div className="form-group full-width">
              <label>Orario Disponibile</label>
              {selectedDate ? (
                isLoadingSlots ? (
                  <div className="slot-hint">Caricamento...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="slot-grid-compact">
                    {availableSlots.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`slot-chip ${(formData.get('booking_time_part') === s) ? 'active' : ''}`}
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const form = btn.closest('form');
                          if (form) {
                            const input = form.querySelector('input[name="booking_time_part"]') as HTMLInputElement;
                            if (input) input.value = s;
                            // Trigger re-render to show active chip
                            const chips = form.querySelectorAll('.slot-chip');
                            chips.forEach(c => c.classList.remove('active'));
                            btn.classList.add('active');
                          }
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="slot-hint error">Nessun slot disponibile</div>
                )
              ) : (
                <div className="slot-hint">Seleziona prima una data</div>
              )}
              <input type="hidden" name="booking_time_part" required />
            </div>
            <div className="form-group">
              <label>Tipo di Visita</label>
              <select name="type">
                <option value="Visita">Visita</option>
                <option value="Controllo">Controllo</option>
                <option value="Urgenza">Urgenza</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowNewBookingModal(false)}>Annulla</button>
            <button type="submit" className="btn btn-primary">Crea Prenotazione</button>
          </div>
        </form>
      </Modal>

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
            <button className="touch-menu-item" onClick={() => { handleUpdateStatus(activeMenuBooking.id, true); setActiveMenuBooking(null); }}>
              <i className="ph ph-check-circle" /> Accetta
            </button>
            <button className="touch-menu-item" onClick={() => { handleUpdateStatus(activeMenuBooking.id, false); setActiveMenuBooking(null); }}>
              <i className="ph ph-x-circle" /> Rifiuta
            </button>
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
