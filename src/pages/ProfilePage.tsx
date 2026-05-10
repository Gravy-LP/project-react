import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';
import { fetchPatientById, updatePatient, fetchBookings, updateBooking, deleteBooking, createBooking, deletePatient, type PatientProfile } from '../lib/api';
import { formatPhoneNumber } from '../lib/formatters';
import Modal from '../components/Modal';
import BookingFields from '../components/BookingFields';
import { useTranslation } from '../context/LanguageContext';
import '../styles/profile.css';
import '../styles/calendar.css';
import '../styles/modal.css';

const getLocaleTag = (lang: string) => {
  switch(lang) {
    case 'IT': return 'it-IT';
    case 'EN': return 'en-US';
    case 'ES': return 'es-ES';
    case 'FR': return 'fr-FR';
    case 'ZH': return 'zh-CN';
    default: return 'it-IT';
  }
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [curDate, setCurDate] = useState(new Date());

  const [bDate, setBDate] = useState('');
  const [bTime, setBTime] = useState('');
  const [bType, setBType] = useState('');
  const [bStatus, setBStatus] = useState('null');
  const [bComplete, setBComplete] = useState(false);
  const [bNotes, setBNotes] = useState('');

  const monthNames = t('calendar.months') as unknown as string[];
  const weekdaysShort = t('calendar.weekdays_short') as unknown as string[];

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { patient: data, error } = await fetchPatientById(id);
      if (error) {
        showToast(t('profile.loading_error'), 'error');
        setLoading(false);
        return;
      }
      if (data) {
        setPatient(data);
        setNote(data.notes || '');
        
        const { bookings: allBookings } = await fetchBookings();
        if (allBookings) {
          const patientBookings = allBookings.filter(b => 
            data.booking_id_db && (data.booking_ids?.includes(b.booking_id_db!) || 
            (b.first_name === data.first_name && b.last_name === data.last_name))
          );
          setBookings(patientBookings);
        }
      }
      setLoading(false);
    }
    load();

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
  }, [id, showToast, t]);

  const refreshBookings = async () => {
    const { bookings: allBookings } = await fetchBookings();
    if (allBookings && patient) {
      const patientBookings = allBookings.filter(b => 
        patient.booking_id_db && (patient.booking_ids?.includes(b.booking_id_db!) || 
        (b.first_name === patient.first_name && b.last_name === patient.last_name))
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
      setBDate(new Date().toLocaleDateString('en-CA'));
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
      showToast(t('profile.note_saved'), 'success');
    } else {
      showToast(error || t('common.error'), 'error');
    }
  };

  const handleShare = () => {
    if (!patient) return;
    const shareText = `${t('rubrica.title')}: ${patient.first_name} ${patient.last_name || ''}\nEmail: ${patient.e_mail || 'N/A'}\n${t('calendar.phone')}: ${patient.phone_number || 'N/A'}\n\n${t('profile.clinical_notes')}:\n${note}`;
    navigator.clipboard.writeText(shareText);
    showToast(t('profile.info_copied'), 'success');
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
      showToast(t('profile.booking_updated'), 'success');
      setShowBookingModal(false);
      refreshBookings();
    } else {
      showToast(res.error || t('common.error'), 'error');
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
      showToast(t('profile.booking_created'), 'success');
      setShowNewBookingModal(false);
      refreshBookings();
    } else {
      showToast(res.error || t('common.error'), 'error');
    }
  };

  const handleDeleteBooking = async (bid: string) => {
    const ok = await confirm({ title: t('calendar.delete_confirm_title'), message: t('profile.delete_booking_confirm') });
    if (!ok) return;
    const res = await deleteBooking(bid);
    if (res.success) {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      showToast(t('profile.booking_deleted'), 'success');
      refreshBookings();
    } else {
      showToast(res.error || t('common.error'), 'error');
    }
  };

  const handleDeletePatient = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: t('profile.delete_patient_confirm'),
      message: t('profile.delete_patient_msg'),
    });
    if (!confirmed) return;

    const { success, error } = await deletePatient(id);
    if (!success) {
      showToast(error || t('common.error'), 'error');
      return;
    }
    showToast(t('profile.patient_deleted'), 'success');
    navigate('/rubrica');
  };

  const y = curDate.getFullYear(), m = curDate.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const fd = new Date(y, m, 1).getDay();
  const off = fd === 0 ? 6 : fd - 1;

  const hasAppointment = (day: number) => {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return bookings.some(b => b.booking_date?.startsWith(ds) && b.booking_accepted === true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loader"></div>
          <p>{t('profile.loading')}</p>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="error-container">
          <i className="ph ph-warning-circle" />
          <h3>{t('profile.not_found')}</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/rubrica')}>{t('profile.back')}</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerActions={
      <button className="btn btn-ghost" onClick={() => navigate('/rubrica')}>
        <i className="ph ph-arrow-left" />
        {t('profile.back')}
      </button>
    }>
      <div className="profile-container">
        <div className="profile-header-premium glass-panel">
          <div className="profile-main-info">
            <div className="profile-avatar-large">
              {(patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')}
            </div>
            <div>
              <h1>{patient.first_name} {patient.last_name}</h1>
              <div className="profile-badges">
                <span className="badge badge-id">ID: {patient.id.slice(0,8)}</span>
                <span className="badge badge-date">{t('profile.patient_since')} {new Date(patient.created_at).toLocaleDateString(getLocaleTag(language))}</span>
              </div>
            </div>
          </div>
          <div className="profile-header-actions">
            <button className="btn btn-secondary" onClick={handleShare}>
              <i className="ph ph-share-network" /> {t('profile.share')}
            </button>
            <button className="btn btn-primary" onClick={handleSaveNote} disabled={saving}>
              {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph ph-floppy-disk" />}
              {saving ? t('profile.saving') : t('profile.save_notes')}
            </button>
            <button className="btn btn-danger" onClick={handleDeletePatient}>
              <i className="ph ph-trash" /> {t('profile.delete_patient')}
            </button>
          </div>
        </div>

        <div className="profile-content-layout">
          <div className="profile-main-col">
            <div className="stats-grid-large">
              <div className="stat-card glass-panel">
                <div className="stat-icon purple"><i className="ph ph-calendar-check" /></div>
                <div className="stat-content">
                  <span className="stat-label">{t('profile.total_bookings')}</span>
                  <span className="stat-value">{bookings.length}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon green"><i className="ph ph-check-circle" /></div>
                <div className="stat-content">
                  <span className="stat-label">{t('profile.completed')}</span>
                  <span className="stat-value">{bookings.filter(b => b.booking_accepted === true).length}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon orange"><i className="ph ph-clock-countdown" /></div>
                <div className="stat-content">
                  <span className="stat-label">{t('profile.pending')}</span>
                  <span className="stat-value">{bookings.filter(b => b.booking_accepted === null).length}</span>
                </div>
              </div>
            </div>

            <div className="profile-section glass-panel">
              <div className="section-header">
                <h3><i className="ph ph-list-bullets" /> {t('profile.history')}</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewBookingModal(true)}>
                  <i className="ph ph-plus" /> {t('profile.new')}
                </button>
              </div>
              <div className="bookings-list">
                {bookings.length > 0 ? (
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>{t('calendar.today')}</th>
                        <th>{t('booking.type')}</th>
                        <th>{t('calendar.status')}</th>
                        <th>{t('common.delete')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bookings].sort((a,b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()).map(b => (
                        <tr key={b.booking_id_db}>
                          <td>{new Date(b.booking_date).toLocaleDateString(getLocaleTag(language))} {new Date(b.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td>{b.type || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`status-pill ${b.booking_accepted === null ? 'pending' : b.booking_accepted ? 'accepted' : 'rejected'}`}>
                                {b.booking_accepted === null ? t('calendar.status_pending') : b.booking_accepted ? t('calendar.status_accepted') : t('calendar.status_rejected')}
                              </span>
                              {b.appointment_complete && (
                                <span className="status-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                  <i className="ph ph-check-circle" /> {t('calendar.visit_completed')}
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
                  <div className="empty-state">{t('profile.no_bookings')}</div>
                )}
              </div>
            </div>

            <div className="profile-section glass-panel">
              <div className="section-header">
                <h3><i className="ph ph-note-pencil" /> {t('profile.clinical_notes')}</h3>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('profile.notes_placeholder')}
                className="notes-textarea-large"
              />
            </div>
          </div>

          <div className="profile-sidebar-col">
            <div className="sidebar-card glass-panel">
              <h3>{t('profile.contacts')}</h3>
              <div className="contact-details">
                <div className="c-item">
                  <i className="ph ph-calendar" />
                  <div><label>{t('rubrica.dob')}</label><span>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString(getLocaleTag(language)) : 'N/A'}</span></div>
                </div>
                <div className="c-item">
                  <i className="ph ph-envelope" />
                  <div><label>{t('calendar.email')}</label><span>{patient.e_mail || 'N/A'}</span></div>
                </div>
                <div className="c-item">
                  <i className="ph ph-phone" />
                  <div><label>{t('calendar.phone')}</label><span>{formatPhoneNumber(patient.phone_number)}</span></div>
                </div>
              </div>
            </div>

            <div className="sidebar-card glass-panel">
              <div className="mini-cal-header">
                <h3>{t('profile.calendar')}</h3>
                <div className="mini-cal-nav">
                  <button onClick={() => setCurDate(new Date(y, m-1, 1))}><i className="ph ph-caret-left" /></button>
                  <span>{monthNames[m]}</span>
                  <button onClick={() => setCurDate(new Date(y, m+1, 1))}><i className="ph ph-caret-right" /></button>
                </div>
              </div>
              <div className="mini-cal-grid">
                {weekdaysShort.map(d => <div key={d} className="mini-cal-day-label">{d}</div>)}
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

      <Modal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)}>
        {selectedBooking && (
          <div className="booking-edit-form">
            <div className="appt-form-header">
              <div className="appt-form-icon"><i className="ph ph-pencil-simple" /></div>
              <div>
                <h2>{t('profile.edit_booking')}</h2>
                <p>{t('profile.update_for')} <strong>{patient.first_name}</strong>.</p>
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
                >
                  <div className="appt-form-group span-2">
                    <label>{t('calendar.status')}</label>
                    <select value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
                      <option value="null">{t('calendar.status_pending')}</option>
                      <option value="true">{t('calendar.status_accepted')}</option>
                      <option value="false">{t('calendar.status_rejected')}</option>
                    </select>
                  </div>
                  <div className="appt-form-group span-2">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={bComplete} onChange={(e) => setBComplete(e.target.checked)} />
                      <span className="slider"></span>
                      <span className="toggle-label">{t('calendar.visit_completed')}</span>
                    </label>
                  </div>
                </BookingFields>
              </div>
              <div className="appt-form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBookingModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('profile.save_changes')}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <Modal isOpen={showNewBookingModal} onClose={() => setShowNewBookingModal(false)}>
        <div className="booking-edit-form">
          <div className="appt-form-header">
            <div className="appt-form-icon"><i className="ph ph-calendar-plus" /></div>
            <div>
              <h2>{t('profile.new_booking')}</h2>
              <p>{t('profile.register_for')} <strong>{patient.first_name}</strong>.</p>
            </div>
          </div>
          <form onSubmit={handleCreateBooking}>
            <div className="appt-form-grid">
              <BookingFields 
                date={bDate} setDate={setBDate}
                time={bTime} setTime={setBTime}
                type={bType} setType={setBType}
                notes={bNotes} setNotes={setBNotes}
              >
                <div className="appt-form-group span-2">
                  <label>{t('calendar.status')}</label>
                  <select value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
                    <option value="null">{t('calendar.status_pending')}</option>
                    <option value="true">{t('calendar.status_accepted')}</option>
                    <option value="false">{t('calendar.status_rejected')}</option>
                  </select>
                </div>
              </BookingFields>
            </div>
            <div className="appt-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNewBookingModal(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('profile.create_booking')}</button>
            </div>
          </form>
        </div>
      </Modal>
    </Layout>
  );
}
