import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';
import { fetchPatientById, updatePatient, fetchBookings, updateBooking, deleteBooking, createBooking, deletePatient, type PatientProfile, type BookingPayload } from '../lib/api';
import { formatPhoneNumber } from '../lib/formatters';
import Modal from '../components/Modal';
import BookingFields from '../components/BookingFields';
import '../styles/profile.css';
import '../styles/calendar.css';
import '../styles/modal.css';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [curDate, setCurDate] = useState(new Date());

  // Standardized booking state
  const [bDate, setBDate] = useState('');
  const [bTime, setBTime] = useState('');
  const [bType, setBType] = useState('');
  const [bStatus, setBStatus] = useState('null');
  const [bComplete, setBComplete] = useState(false);
  const [bNotes, setBNotes] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { patient: data, error } = await fetchPatientById(id);
      if (error) {
        showToast('Errore nel caricamento profilo', 'error');
        setLoading(false);
        return;
      }
      if (data) {
        setPatient(data);
        setNote(data.notes || '');
        
        // Load bookings for this patient
        const { bookings: allBookings } = await fetchBookings();
        if (allBookings) {
          const patientBookings = allBookings.filter(b => 
            data.booking_ids?.includes(b.booking_id_db!) || 
            (b.first_name === data.first_name && b.last_name === data.last_name)
          );
          setBookings(patientBookings);
        }
      }
      setLoading(false);
    }
    load();

    // Real-time listeners
    const profileChannel = supabase
      .channel(`profile-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PatientProfile', filter: `id=eq.${id}` }, () => load())
      .subscribe();

    const bookingChannel = supabase
      .channel(`profile-bookings-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking' }, () => refreshBookings())
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [id, showToast]);

  const refreshBookings = async () => {
    const { bookings: allBookings } = await fetchBookings();
    if (allBookings && patient) {
      const patientBookings = allBookings.filter(b => 
        patient.booking_ids?.includes(b.booking_id_db!) || 
        (b.first_name === patient.first_name && b.last_name === patient.last_name)
      );
      setBookings(patientBookings);
    }
  };

  useEffect(() => {
    if (showBookingModal && selectedBooking) {
      setBDate(selectedBooking.booking_date.split('T')[0]);
      setBTime(selectedBooking.booking_date.split('T')[1].slice(0, 5));
      setBType(selectedBooking.type || '');
      setBStatus(String(selectedBooking.booking_accepted));
      setBComplete(!!selectedBooking.appointment_complete);
      setBNotes(selectedBooking.notes || '');
    }
  }, [showBookingModal, selectedBooking]);

  useEffect(() => {
    if (showNewBookingModal) {
      setBDate(new Date().toISOString().split('T')[0]);
      setBTime('');
      setBType('');
      setBStatus('null');
      setBComplete(false);
      setBNotes('');
    }
  }, [showNewBookingModal]);

  const handleSaveNote = async () => {
    if (!id || !patient) return;
    setSaving(true);
    const { success, error } = await updatePatient(id, { notes: note });
    setSaving(false);
    if (success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast('Nota salvata con successo', 'success');
    } else {
      showToast(error || 'Errore durante il salvataggio', 'error');
    }
  };

  const handleShare = () => {
    if (!patient) return;
    const shareText = `Paziente: ${patient.first_name} ${patient.last_name || ''}\nEmail: ${patient.e_mail || 'N/A'}\nTelefono: ${patient.phone_number || 'N/A'}\n\nNote:\n${note}`;
    navigator.clipboard.writeText(shareText);
    showToast('Informazioni copiate negli appunti', 'success');
  };

  const handleUpdateBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBooking?.booking_id_db) return;
    
    const updateData = {
      booking_date: `${bDate}T${bTime}:00`,
      type: bType,
      notes: bNotes,
      booking_accepted: bStatus === 'true' ? true : bStatus === 'false' ? false : null,
      appointment_complete: bComplete
    };

    const res = await updateBooking(selectedBooking.booking_id_db, updateData);
    if (res.success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast('Prenotazione aggiornata', 'success');
      setShowBookingModal(false);
      refreshBookings();
    } else {
      showToast(res.error || 'Errore', 'error');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient) return;

    const res = await createBooking({
      first_name: patient.first_name,
      last_name: patient.last_name || '',
      e_mail: patient.e_mail || '',
      phone_number: patient.phone_number || '',
      booking_date: `${bDate}T${bTime}:00`,
      type: bType,
      notes: bNotes,
      booking_accepted: bStatus === 'true' ? true : bStatus === 'false' ? false : null
    });

    if (res.success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast('Prenotazione creata', 'success');
      setShowNewBookingModal(false);
      refreshBookings();
    } else {
      showToast(res.error || 'Errore', 'error');
    }
  };

  const handleDeleteBooking = async (bid: string) => {
    const ok = await confirm({ title: 'Elimina?', message: 'Eliminare questa prenotazione?' });
    if (!ok) return;
    const res = await deleteBooking(bid);
    if (res.success) {
      if (window.navigator.vibrate(50)) window.navigator.vibrate(50);
      showToast('Prenotazione eliminata', 'success');
      refreshBookings();
    } else {
      showToast(res.error || 'Errore', 'error');
    }
  };

  const handleDeletePatient = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Eliminare questo profilo paziente?',
      message: "L'azione non può essere annullata.",
    });
    if (!confirmed) return;

    const { success, error } = await deletePatient(id);
    if (!success) {
      showToast(error || "Errore durante l'eliminazione", 'error');
      return;
    }
    showToast('Profilo eliminato', 'success');
    navigate('/rubrica');
  };

  // Mini Calendar Logic
  const y = curDate.getFullYear(), m = curDate.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const fd = new Date(y, m, 1).getDay();
  const off = fd === 0 ? 6 : fd - 1;
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const hasAppointment = (day: number) => {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return bookings.some(b => b.booking_date?.startsWith(ds) && b.booking_accepted === true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loader"></div>
          <p>Caricamento profilo...</p>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="error-container">
          <i className="ph ph-warning-circle" />
          <h3>Profilo non trovato</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/rubrica')}>Torna alla rubrica</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerActions={
      <button className="btn btn-ghost" onClick={() => navigate('/rubrica')}>
        <i className="ph ph-arrow-left" />
        Torna alla Rubrica
      </button>
    }>
      <div className="profile-container">
        {/* Top Header */}
        <div className="profile-header-premium glass-panel">
          <div className="profile-main-info">
            <div className="profile-avatar-large">
              {(patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')}
            </div>
            <div>
              <h1>{patient.first_name} {patient.last_name}</h1>
              <div className="profile-badges">
                <span className="badge badge-id">ID: {patient.id.slice(0,8)}</span>
                <span className="badge badge-date">Paziente dal {new Date(patient.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="profile-header-actions">
            <button className="btn btn-secondary" onClick={handleShare}>
              <i className="ph ph-share-network" /> Condividi
            </button>
            <button className="btn btn-primary" onClick={handleSaveNote} disabled={saving}>
              {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph ph-floppy-disk" />}
              {saving ? 'Salvataggio...' : 'Salva Note'}
            </button>
            <button className="btn btn-danger" onClick={handleDeletePatient}>
              <i className="ph ph-trash" /> Elimina Paziente
            </button>
          </div>
        </div>

        <div className="profile-content-layout">
          {/* Main Column */}
          <div className="profile-main-col">
            
            {/* Stats Grid */}
            <div className="stats-grid-large">
              <div className="stat-card glass-panel">
                <div className="stat-icon purple"><i className="ph ph-calendar-check" /></div>
                <div className="stat-content">
                  <span className="stat-label">Prenotazioni Totali</span>
                  <span className="stat-value">{bookings.length}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon green"><i className="ph ph-check-circle" /></div>
                <div className="stat-content">
                  <span className="stat-label">Completate</span>
                  <span className="stat-value">{bookings.filter(b => b.booking_accepted === true).length}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon orange"><i className="ph ph-clock-countdown" /></div>
                <div className="stat-content">
                  <span className="stat-label">In Sospeso</span>
                  <span className="stat-value">{bookings.filter(b => b.booking_accepted === null).length}</span>
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="profile-section glass-panel">
              <div className="section-header">
                <h3><i className="ph ph-list-bullets" /> Storico Prenotazioni</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewBookingModal(true)}>
                  <i className="ph ph-plus" /> Nuova
                </button>
              </div>
              <div className="bookings-list">
                {bookings.length > 0 ? (
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bookings].sort((a,b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()).map(b => (
                        <tr key={b.booking_id_db}>
                          <td>{new Date(b.booking_date).toLocaleDateString()} {new Date(b.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td>{b.type || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`status-pill ${b.booking_accepted === null ? 'pending' : b.booking_accepted ? 'accepted' : 'rejected'}`}>
                                {b.booking_accepted === null ? 'In attesa' : b.booking_accepted ? 'Accettato' : 'Rifiutato'}
                              </span>
                              {b.appointment_complete && (
                                <span className="status-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                  <i className="ph ph-check-circle" /> Completata
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button onClick={() => { setSelectedBooking(b); setShowBookingModal(true); }} className="btn btn-ghost btn-icon"><i className="ph ph-pencil" /></button>
                              <button onClick={() => handleDeleteBooking(b.booking_id_db)} className="btn btn-ghost btn-icon text-danger"><i className="ph ph-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">Nessuna prenotazione trovata</div>
                )}
              </div>
            </div>

            {/* Notes Area */}
            <div className="profile-section glass-panel">
              <div className="section-header">
                <h3><i className="ph ph-note-pencil" /> Note Cliniche</h3>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Inserisci note relative al paziente..."
                className="notes-textarea-large"
              />
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="profile-sidebar-col">
            
            {/* Contact Card */}
            <div className="sidebar-card glass-panel">
              <h3>Contatti</h3>
              <div className="contact-details">
                <div className="c-item">
                  <i className="ph ph-calendar" />
                  <div><label>Data di Nascita</label><span>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
                </div>
                <div className="c-item">
                  <i className="ph ph-envelope" />
                  <div><label>Email</label><span>{patient.e_mail || 'N/A'}</span></div>
                </div>
                <div className="c-item">
                  <i className="ph ph-phone" />
                  <div><label>Telefono</label><span>{formatPhoneNumber(patient.phone_number)}</span></div>
                </div>
              </div>
            </div>

            {/* Mini Calendar */}
            <div className="sidebar-card glass-panel">
              <div className="mini-cal-header">
                <h3>Calendario</h3>
                <div className="mini-cal-nav">
                  <button onClick={() => setCurDate(new Date(y, m-1, 1))}><i className="ph ph-caret-left" /></button>
                  <span>{monthNames[m]}</span>
                  <button onClick={() => setCurDate(new Date(y, m+1, 1))}><i className="ph ph-caret-right" /></button>
                </div>
              </div>
              <div className="mini-cal-grid">
                {['L','M','M','G','V','S','D'].map(d => <div key={d} className="mini-cal-day-label">{d}</div>)}
                {Array.from({length: off}).map((_, i) => <div key={`p${i}`} className="mini-cal-day empty" />)}
                {Array.from({length: dim}).map((_, i) => (
                  <div key={i+1} className={`mini-cal-day ${hasAppointment(i+1) ? 'has-event' : ''}`}>
                    {i+1}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Booking Edit Modal */}
      <Modal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)}>
        {selectedBooking && (
          <div className="booking-edit-form">
            <div className="appt-form-header">
              <div className="appt-form-icon"><i className="ph ph-pencil-simple" /></div>
              <div>
                <h2>Modifica Prenotazione</h2>
                <p>Aggiorna l'appuntamento di <strong>{patient.first_name}</strong>.</p>
              </div>
            </div>
            <form onSubmit={handleUpdateBooking}>
              <div className="appt-form-grid">
                <BookingFields 
                  date={bDate} setDate={setBDate}
                  time={bTime} setTime={setBTime}
                  type={bType} setType={setBType}
                  notes={bNotes} setNotes={setBNotes}
                  ignoreBookingId={selectedBooking.booking_id_db}
                />
                <div className="appt-form-group span-2">
                  <label>Stato</label>
                  <select value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
                    <option value="null">In attesa</option>
                    <option value="true">Accettato</option>
                    <option value="false">Rifiutato</option>
                  </select>
                </div>
                <div className="appt-form-group span-2">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={bComplete} onChange={(e) => setBComplete(e.target.checked)} />
                    <span className="slider"></span>
                    <span className="toggle-label">Visita Completata</span>
                  </label>
                </div>
              </div>
              <div className="appt-form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBookingModal(false)}>Annulla</button>
                <button type="submit" className="btn btn-primary">Salva Modifiche</button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* New Booking Modal */}
      <Modal isOpen={showNewBookingModal} onClose={() => setShowNewBookingModal(false)}>
        <div className="booking-edit-form">
          <div className="appt-form-header">
            <div className="appt-form-icon"><i className="ph ph-calendar-plus" /></div>
            <div>
              <h2>Nuova Prenotazione</h2>
              <p>Registra un nuovo appuntamento per <strong>{patient.first_name}</strong>.</p>
            </div>
          </div>
          <form onSubmit={handleCreateBooking}>
            <div className="appt-form-grid">
              <BookingFields 
                date={bDate} setDate={setBDate}
                time={bTime} setTime={setBTime}
                type={bType} setType={setBType}
                notes={bNotes} setNotes={setBNotes}
              />
              <div className="appt-form-group span-2">
                <label>Stato Iniziale</label>
                <select value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
                  <option value="null">In attesa</option>
                  <option value="true">Accettato</option>
                  <option value="false">Rifiutato</option>
                </select>
              </div>
            </div>
            <div className="appt-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNewBookingModal(false)}>Annulla</button>
              <button type="submit" className="btn btn-primary">Crea Prenotazione</button>
            </div>
          </form>
        </div>
      </Modal>
    </Layout>
  );
}
