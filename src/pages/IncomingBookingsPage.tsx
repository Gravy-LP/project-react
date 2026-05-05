import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';
import '../styles/incoming-bookings.css';
import '../styles/modal.css';

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

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings');
      const json = await res.json();
      setAllBookings(json.bookings || []);
    } catch {
      showToast('Errore nel caricamento', 'error');
    }
  }, [showToast]);

  useEffect(() => { 
    fetchBookings(); 

    const channel = supabase
      .channel('incoming-booking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

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
    const search = searchQuery.toLowerCase().trim();
    if (!search) return true;
    const name = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
    const contact = `${b.e_mail || ''} ${b.phone_number || ''}`.toLowerCase();
    return name.includes(search) || contact.includes(search);
  });

  const pendingBookings = filteredBookings.filter((b) => b.booking_accepted === null);
  const acceptedBookings = filteredBookings.filter((b) => b.booking_accepted === true);
  const refusedBookings = filteredBookings.filter((b) => b.booking_accepted === false);

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

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
      message: "Sei sicuro di voler eliminare questa prenotazione? L'azione non può essere annullata.",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || "Errore durante l'eliminazione", 'error');
        return;
      }
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      showToast('Prenotazione eliminata con successo!', 'success');
      setAllBookings((prev) => prev.filter((b) => b.booking_id_db !== id));
    } catch {
      showToast('Errore di rete', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: boolean | null) => {
    try {
      const res = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_accepted: status }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || "Errore durante l'aggiornamento", 'error');
        return;
      }
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast(
        `Prenotazione ${status === null ? 'ripristinata' : status ? 'accettata' : 'rifiutata'} con successo!`,
        'success'
      );
      // Refresh data
      fetchBookings();
    } catch {
      showToast('Errore di rete', 'error');
    }
  };

  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      first_name: formData.get('first_name') as string,
      last_name: (formData.get('last_name') as string) || null,
      e_mail: (formData.get('e_mail') as string) || null,
      phone_number: (formData.get('phone_number') as string) || null,
      booking_date: formData.get('booking_date') as string || null,
      type: formData.get('type') as string || null,
      booking_accepted: null,
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || 'Errore nella creazione', 'error');
        return;
      }
      showToast('Prenotazione creata con successo!', 'success');
      setShowNewBookingModal(false);
      fetchBookings();
    } catch {
      showToast('Errore di rete', 'error');
    }
  };

  const renderBookingRow = (booking: Booking, showFullActions: boolean = false) => (
    <tr id={`booking-${booking.booking_id_db}`} key={booking.booking_id_db}>
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
            <div className="phone">{booking.phone_number}</div>
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
      <td>
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
                pendingBookings.map((b) => renderBookingRow(b, true))
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
                  acceptedBookings.map((b) => renderBookingRow(b, false))
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
                  refusedBookings.map((b) => renderBookingRow(b, false))
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
            <div className="form-group">
              <label>Data e Ora Prenotazione</label>
              <input type="datetime-local" name="booking_date" required />
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
    </Layout>
  );
}
