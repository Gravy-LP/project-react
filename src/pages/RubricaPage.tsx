import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { fetchPatients, createPatient, createBooking, type PatientProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { formatPhoneNumber } from '../lib/formatters';
import Modal from '../components/Modal';
import BookingFields from '../components/BookingFields';
import { useLongPress } from '../hooks/useLongPress';
import { useTranslation } from '../context/LanguageContext';
import '../styles/rubrica.css';
import '../styles/modal.css';
import '../styles/touch-menu.css';

interface PatientCardProps {
  patient: PatientProfile;
  active: boolean;
  onActivateMenu: (info: { id: string; x: number; y: number }) => void;
  onNavigate: (path: string) => void;
}

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

function PatientCard({ patient, active, onActivateMenu, onNavigate }: PatientCardProps) {
  const { language, t } = useTranslation();
  const longPressProps = useLongPress({
    onLongPress: (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      onActivateMenu({ id: patient.id, x: clientX, y: clientY });
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    },
  });

  const initials = ((patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')).toUpperCase();
  const formattedDate = patient.created_at
    ? new Date(patient.created_at).toLocaleDateString(getLocaleTag(language), { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div
      className={`patient-card glass-panel ${active ? 'row-active' : ''}`}
      {...longPressProps}
      onClick={() => onNavigate(`/profile/${patient.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="patient-card-body">
        <div className="patient-card-header">
          <div className="patient-avatar">{initials}</div>
          <div className="patient-card-info">
            <div className="patient-card-name">
              {patient.first_name} {patient.last_name || ''}
            </div>
            <div className="patient-card-date">
              <i className="ph ph-calendar-blank" />
              {t('rubrica.added_on')} {formattedDate}
            </div>
            {patient.booking_ids && patient.booking_ids.length > 0 && (
              <div className="patient-booking-count">
                <i className="ph ph-ticket" />
                {patient.booking_ids.length} {patient.booking_ids.length === 1 ? t('rubrica.booking') : t('rubrica.bookings')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="patient-card-footer">
        <div className="patient-card-contacts">
          {patient.e_mail ? (
            <a href={`mailto:${patient.e_mail}`} className="contact-chip email-chip">
              <i className="ph ph-envelope-simple" />
              <span>{patient.e_mail}</span>
            </a>
          ) : null}
          {patient.phone_number ? (
            <a href={`tel:${patient.phone_number}`} className="contact-chip phone-chip">
              <i className="ph ph-phone" />
              <span>{formatPhoneNumber(patient.phone_number)}</span>
            </a>
          ) : null}
          {!patient.e_mail && !patient.phone_number ? (
            <span className="contact-chip empty-chip">
              <i className="ph ph-warning" />
              <span>{t('rubrica.no_contact')}</span>
            </span>
          ) : null}
        </div>
      </div>
      <i className="patient-card-arrow ph ph-arrow-right" />
    </div>
  );
}

export default function RubricaPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [withBooking, setWithBooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMenuPatient, setActiveMenuPatient] = useState<{id: string, x: number, y: number} | null>(null);

  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const loadPatients = useCallback(async () => {
    const { patients: data, error } = await fetchPatients();
    if (error) {
      showToast(t('common.error'), 'error');
      return;
    }
    setPatients(data || []);
  }, [showToast, t]);

  useEffect(() => {
    loadPatients();

    const channel = supabase
      .channel('patient-profile-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PatientProfile' },
        () => loadPatients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPatients]);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (!data.first_name || !data.last_name) {
      showToast(t('rubrica.name_required'), 'error');
      return;
    }
    if (!data.e_mail && !data.phone_number) {
      showToast(t('rubrica.contact_required'), 'error');
      return;
    }

    setLoading(true);

    try {
      if (withBooking) {
        const res = await createBooking({
          first_name: data.first_name as string,
          last_name: data.last_name as string,
          e_mail: data.e_mail as string,
          phone_number: data.phone_number as string,
          booking_date: `${bookingDate}T${bookingTime}:00`,
          type: bookingType,
          booking_accepted: true,
          notes: bookingNotes
        });

        if (!res.success) {
          showToast(res.error || t('common.error'), 'error');
        } else {
          showToast(t('rubrica.success_patient_booking'), 'success');
          setShowModal(false);
          loadPatients();
        }
      } else {
        const res = await createPatient({
          first_name: data.first_name as string,
          last_name: data.last_name as string,
          e_mail: data.e_mail as string,
          phone_number: data.phone_number as string,
          date_of_birth: data.date_of_birth as string,
          notes: data.notes as string
        });

        if (!res.success) {
          showToast(res.error || t('common.error'), 'error');
        } else {
          showToast(t('rubrica.success_patient'), 'success');
          setShowModal(false);
          loadPatients();
        }
      }
    } catch (err) {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = `${p.first_name} ${p.last_name || ''}`.toLowerCase();
    const email = (p.e_mail || '').toLowerCase();
    const phone = (p.phone_number || '').replace(/\s+/g, '');
    const cleanQuery = q.replace(/\s+/g, '');

    return name.includes(q) || email.includes(q) || phone.includes(cleanQuery);
  });

  return (
    <Layout headerActions={
      <div className="header-action-group">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="ph ph-plus" /> {t('rubrica.new_patient')}
        </button>
        <div className="patient-count-badge">
          <i className="ph ph-users" />
          <span>{patients.length} {t('rubrica.total_patients')}</span>
        </div>
      </div>
    }>
      <div className="glass-panel content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>{t('rubrica.title')}</h2>
            <p className="card-subtitle">{t('rubrica.subtitle')}</p>
          </div>
          <div className="filters">
            <div className="local-search-wrapper">
              <i className="ph ph-magnifying-glass" />
              <input
                type="text"
                placeholder={t('rubrica.filter_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="patients-grid">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                active={activeMenuPatient?.id === patient.id}
                onActivateMenu={setActiveMenuPatient}
                onNavigate={navigate}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state-container">
            <div className="empty-state-icon"><i className="ph ph-address-book" /></div>
            <h3>{t('rubrica.empty_title')}</h3>
            <p>{t('rubrica.empty_desc')}</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="patient-form-header">
          <h2>{t('rubrica.new_patient')}</h2>
          <p>{t('rubrica.form_header_desc')}</p>
        </div>

        <form className="patient-form" onSubmit={handleCreateSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>{t('calendar.first_name')} *</label>
              <input type="text" name="first_name" placeholder="es. Mario" required />
            </div>
            <div className="form-group">
              <label>{t('calendar.last_name')} *</label>
              <input type="text" name="last_name" placeholder="es. Rossi" required />
            </div>
            <div className="form-group">
              <label>{t('calendar.email')}</label>
              <input type="email" name="e_mail" placeholder="mario@esempio.it" />
            </div>
            <div className="form-group">
              <label>{t('calendar.phone')}</label>
              <input type="tel" name="phone_number" placeholder="+39 ..." />
            </div>
            <div className="form-group">
              <label>{t('rubrica.dob')}</label>
              <input type="date" name="date_of_birth" />
            </div>
            <div className="form-group full-width">
              <label>{t('rubrica.internal_notes')}</label>
              <textarea name="notes" placeholder={t('rubrica.notes_placeholder')} rows={3}></textarea>
            </div>
          </div>

          <div className="booking-toggle-section">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={withBooking} 
                onChange={(e) => setWithBooking(e.target.checked)} 
              />
              <span className="slider"></span>
              <span className="toggle-label">{t('rubrica.book_appointment')}</span>
            </label>
          </div>

          {withBooking && (
            <div className="booking-subform animate-in" style={{ marginTop: '20px' }}>
              <BookingFields 
                date={bookingDate} setDate={setBookingDate}
                time={bookingTime} setTime={setBookingTime}
                type={bookingType} setType={setBookingType}
                notes={bookingNotes} setNotes={setBookingNotes}
              />
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={loading}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph ph-user-plus" />}
              {loading ? t('rubrica.creating') : t('rubrica.create_patient')}
            </button>
          </div>
        </form>
      </Modal>

      {activeMenuPatient && (
        <div className="touch-menu-overlay" onClick={() => setActiveMenuPatient(null)}>
          <div 
            className="touch-menu glass-panel animate-scale"
            style={{ 
              top: Math.min(activeMenuPatient.y, window.innerHeight - 150), 
              left: Math.min(activeMenuPatient.x, window.innerWidth - 180) 
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="touch-menu-header">{t('rubrica.patient_options')}</div>
            <button className="touch-menu-item" onClick={() => { navigate(`/profile/${activeMenuPatient.id}`); setActiveMenuPatient(null); }}>
              <i className="ph ph-user" /> {t('rubrica.view_profile')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
