import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { fetchPatientById, updatePatient, fetchBookings, updateBooking, deleteBooking, createBooking, deletePatient, type PatientProfile } from '../lib/api';
import { formatPhoneNumber } from '../lib/formatters';
import Modal from '../components/Modal';
import BookingFields from '../components/BookingFields';
import { useTranslation } from '../context/LanguageContext';
import '../styles/my-profile.css';
import '../styles/profile.css';
import '../styles/calendar.css';
import '../styles/modal.css';

const getLocaleTag = (lang: string) => {
  switch (lang) {
    case 'IT': return 'it-IT';
    case 'EN': return 'en-US';
    case 'ES': return 'es-ES';
    case 'FR': return 'fr-FR';
    case 'ZH': return 'zh-CN';
    default: return 'it-IT';
  }
};

export default function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { profile: currentUserProfile, logout, role: currentUserRole } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const targetId = id || currentUserProfile?.id;
  const isOwnProfile = targetId === currentUserProfile?.id;
  const isAdmin = currentUserRole === 'administrator';
  const isViewer = currentUserRole === 'viewer';

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Edit Patient State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');

  const [bDate, setBDate] = useState('');
  const [bTime, setBTime] = useState('');
  const [bType, setBType] = useState('');
  const [bStatus, setBStatus] = useState('null');
  const [bComplete, setBComplete] = useState(false);
  const [bNotes, setBNotes] = useState('');

  useEffect(() => {
    async function load() {
      if (!targetId) return;
      setLoading(true);
      const { patient: data, error } = await fetchPatientById(targetId);
      if (error) {
        showToast(t('profile.loading_error'), 'error');
        setLoading(false);
        return;
      }
      if (data) {
        setPatient(data);
        setNote(data.notes || '');
        setEditFirstName(data.first_name || '');
        setEditLastName(data.last_name || '');
        setEditEmail(data.e_mail || '');
        setEditPhone(data.phone_number || '');
        setEditDob(data.date_of_birth || '');

        const { bookings: allBookings } = await fetchBookings();
        if (allBookings) {
          const patientBookings = allBookings.filter(b =>
            (data.booking_ids && b.booking_id_db && data.booking_ids.includes(b.booking_id_db)) ||
            (b.profile_id === data.id) ||
            (b.first_name === data.first_name && b.last_name === data.last_name)
          );
          setBookings(patientBookings);
        }
      }
      setLoading(false);
    }
    load();

    const profileChannel = supabase
      .channel(`profile-${targetId}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PatientProfile', filter: `id=eq.${targetId}` }, () => load())
      .subscribe();

    const bookingChannel = supabase
      .channel(`profile-bookings-${targetId}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking' }, () => refreshBookings())
      .subscribe();

    // Fallback polling for user bookings if Realtime RLS fails
    const pollInterval = setInterval(() => {
      refreshBookings();
    }, 4000);

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(bookingChannel);
      clearInterval(pollInterval);
    };
  }, [targetId, showToast, t]);

  const refreshBookings = async () => {
    const { bookings: allBookings } = await fetchBookings();
    if (allBookings && patient) {
      const patientBookings = allBookings.filter(b =>
        (patient.booking_ids && b.booking_id_db && patient.booking_ids.includes(b.booking_id_db)) ||
        (b.profile_id === patient.id) ||
        (b.first_name === patient.first_name && b.last_name === patient.last_name)
      );
      // Only update state if different
      setBookings(prev => JSON.stringify(prev) !== JSON.stringify(patientBookings) ? patientBookings : prev);
    }
  };

  useEffect(() => {
    if (showBookingModal && selectedBooking) {
      setBDate(selectedBooking.booking_date?.split('T')[0] || '');
      setBTime(selectedBooking.booking_date?.split('T')[1]?.slice(0, 5) || '');
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
    if (!targetId || !patient) return;
    setSaving(true);
    const { success, error } = await updatePatient(targetId, { notes: note });
    setSaving(false);
    if (success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast(t('profile.note_saved'), 'success');
    } else {
      showToast(error || t('common.error'), 'error');
    }
  };

  const handleUpdatePatientInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetId) return;
    
    setSaving(true);
    const { success, error } = await updatePatient(targetId, {
      first_name: editFirstName,
      last_name: editLastName,
      e_mail: editEmail,
      phone_number: editPhone,
      date_of_birth: editDob
    });
    setSaving(false);

    if (success) {
      if (window.navigator.vibrate) window.navigator.vibrate(30);
      showToast('Profilo aggiornato con successo!', 'success');
      setShowEditPatientModal(false);
    } else {
      showToast(error || t('common.error'), 'error');
    }
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
      booking_accepted: bStatus === 'true' ? true : bStatus === 'false' ? false : null,
      profile_id: patient.id
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
    if (!targetId) return;
    const confirmed = await confirm({
      title: t('profile.delete_patient_confirm'),
      message: t('profile.delete_patient_msg'),
    });
    if (!confirmed) return;

    const { success, error } = await deletePatient(targetId);
    if (!success) {
      showToast(error || t('common.error'), 'error');
      return;
    }
    showToast(t('profile.patient_deleted'), 'success');
    navigate('/rubrica');
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
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>{t('profile.back')}</button>
        </div>
      </Layout>
    );
  }

  const initials = ((patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')).toUpperCase();

  return (
    <Layout headerActions={
      !isOwnProfile && (
        <button className="btn btn-ghost" onClick={() => navigate('/rubrica')}>
          <i className="ph ph-arrow-left" />
          {t('profile.back')}
        </button>
      )
    }>
      <div className="profile-container animate-in">
        <header className="profile-header-main">
          <div className="profile-avatar-large">
            {initials}
            <div className="avatar-badge" style={{ background: 'var(--color-primary)' }}><i className="ph ph-folder-user" /></div>
          </div>
          <div className="profile-title-section">
            <h1>{patient.first_name} {patient.last_name}</h1>
            <p className="profile-role-tag">
              {patient.role === 'owner' || patient.role === 'administrator'
                ? t('my_profile.admin')
                : patient.role === 'viewer'
                ? t('my_profile.viewer')
                : t('common.user')}
            </p>
          </div>
        </header>

        <div className="profile-grid-layout">
          <div className="profile-main-column">
            <section className="profile-section-card glass-panel">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ph ph-user-circle" />
                  <h3>{t('my_profile.personal_info')}</h3>
                </div>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowEditPatientModal(true)}>
                    <i className="ph ph-pencil-simple" /> Modifica
                  </button>
                )}
              </div>
              <div className="info-grid-premium">
                <div className="info-box">
                  <label>{t('my_profile.email')}</label>
                  <span>{patient.e_mail || '—'}</span>
                </div>
                <div className="info-box">
                  <label>{t('calendar.phone')}</label>
                  <span>{patient.phone_number ? formatPhoneNumber(patient.phone_number) : '—'}</span>
                </div>
                <div className="info-box">
                  <label>{t('rubrica.dob')}</label>
                  <span>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString(getLocaleTag(language)) : '—'}</span>
                </div>
              </div>
            </section>

            {isAdmin && (
              <section className="profile-section-card glass-panel">
                <div className="section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="ph ph-calendar" />
                    <h3>I miei Appuntamenti</h3>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewBookingModal(true)}>
                    <i className="ph ph-plus" /> {t('profile.new')}
                  </button>
                </div>
                
                {bookings.length > 0 ? (
                  <div className="appointments-list">
                    {[...bookings].sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()).map(appt => (
                      <div key={appt.booking_id_db} className="appointment-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{new Date(appt.booking_date || '').toLocaleDateString(getLocaleTag(language))} {new Date(appt.booking_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`status-badge ${appt.booking_accepted ? 'accepted' : appt?.booking_accepted === false ? 'rejected' : 'pending'}`}>
                              {appt.booking_accepted ? 'Accettato' : appt.booking_accepted === false ? 'Rifiutato' : 'In attesa'}
                            </span>
                            <button onClick={() => { setSelectedBooking(appt); setShowBookingModal(true); }} className="btn btn-ghost btn-icon" style={{ padding: '4px', height: 'auto', minHeight: 'auto' }}><i className="ph ph-pencil" /></button>
                            <button onClick={() => handleDeleteBooking(appt.booking_id_db)} className="btn btn-ghost btn-icon text-danger" style={{ padding: '4px', height: 'auto', minHeight: 'auto' }}><i className="ph ph-trash" /></button>
                          </div>
                        </div>
                        {appt.type && <p style={{ margin: '5px 0 0', fontSize: '0.9rem', opacity: 0.8 }}>{appt.type}</p>}
                        {appt.notes && <p style={{ margin: '5px 0 0', fontSize: '0.85rem', opacity: 0.7 }}><i className="ph ph-info" /> {appt.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Nessun appuntamento registrato.</p>
                )}
              </section>
            )}
          </div>

          <div className="profile-side-column">
            {isAdmin && (
              <section className="profile-section-card glass-panel">
                <div className="section-header">
                  <i className="ph ph-note-pencil" />
                  <h3>{t('profile.clinical_notes')}</h3>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('profile.notes_placeholder')}
                  className="notes-textarea-large"
                  style={{ width: '100%', minHeight: '150px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', resize: 'vertical' }}
                />
                <button className="btn btn-primary btn-full" style={{ marginTop: '12px' }} onClick={handleSaveNote} disabled={saving}>
                  {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph ph-floppy-disk" />}
                  {saving ? t('profile.saving') : t('profile.save_notes')}
                </button>
              </section>
            )}

            {isOwnProfile && (
              <section className="profile-section-card glass-panel">
                <div className="section-header">
                  <i className="ph ph-gear" />
                  <h3>{t('my_profile.app_settings')}</h3>
                </div>

                <div className="setting-item-premium">
                  <div className="setting-info">
                    <i className={isDarkMode ? "ph ph-moon" : "ph ph-sun"} />
                    <span>{t('common.theme')} {isDarkMode ? t('common.dark') : t('common.light')}</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item-premium">
                  <div className="setting-info">
                    <i className="ph ph-translate" />
                    <span>{t('common.language')}</span>
                  </div>
                  <select
                    className="premium-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                  >
                    <option value="IT">Italiano</option>
                    <option value="EN">English</option>
                    <option value="ES">Español</option>
                    <option value="FR">Français</option>
                    <option value="ZH">中文</option>
                  </select>
                </div>

                <div className="divider-premium" />

                <button className="btn btn-danger btn-full" onClick={logout}>
                  <i className="ph ph-sign-out" /> {t('common.logout')}
                </button>
              </section>
            )}

            {isAdmin && !isOwnProfile && (
              <section className="profile-section-card glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div className="section-header text-danger">
                  <i className="ph ph-warning-circle" />
                  <h3>Zona Pericolosa</h3>
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '15px' }}>L'eliminazione del paziente rimuoverà tutti i suoi dati dal sistema. Questa azione è irreversibile.</p>
                <button className="btn btn-danger btn-full" onClick={handleDeletePatient}>
                  <i className="ph ph-trash" /> {t('profile.delete_patient')}
                </button>
              </section>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
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

          <Modal isOpen={showEditPatientModal} onClose={() => setShowEditPatientModal(false)}>
            <div className="booking-edit-form">
              <div className="appt-form-header">
                <div className="appt-form-icon"><i className="ph ph-user-gear" /></div>
                <div>
                  <h2>Modifica Profilo</h2>
                  <p>Aggiorna le informazioni personali del paziente.</p>
                </div>
              </div>
              <form onSubmit={handleUpdatePatientInfo}>
                <div className="appt-form-grid">
                  <div className="appt-form-group">
                    <label>Nome *</label>
                    <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                  </div>
                  <div className="appt-form-group">
                    <label>Cognome *</label>
                    <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                  </div>
                  <div className="appt-form-group span-2">
                    <label>Email</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div className="appt-form-group">
                    <label>Telefono</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                  <div className="appt-form-group span-2">
                    <label>{t('rubrica.dob')}</label>
                    <input 
                      type="date" 
                      value={editDob} 
                      onChange={(e) => setEditDob(e.target.value)} 
                      style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                    />
                  </div>
                </div>
                <div className="appt-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowEditPatientModal(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph ph-floppy-disk" />}
                    {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </>
      )}
    </Layout>
  );
}
