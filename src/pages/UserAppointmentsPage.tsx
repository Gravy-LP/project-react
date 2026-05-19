import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { fetchBookings } from '../lib/api';

export default function UserAppointmentsPage() {
  const { profile } = useAuth();
  const { language, t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!profile) return;
    
    const loadBookings = async () => {
      setLoading(true);
      const { bookings: allBookings } = await fetchBookings();
      if (allBookings) {
        const patientBookings = allBookings.filter(b =>
          (profile.booking_ids && b.booking_id_db && profile.booking_ids.includes(b.booking_id_db)) ||
          (b.profile_id === profile.id) ||
          (b.first_name === profile.first_name && b.last_name === profile.last_name)
        );
        setBookings(patientBookings);
      }
      setLoading(false);
    };

    loadBookings();

    const bookingChannel = supabase
      .channel(`user-appointments-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking' }, () => loadBookings())
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [profile]);

  return (
    <Layout>
      <div className="profile-container animate-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <header className="profile-header-main" style={{ marginBottom: '32px' }}>
          <div className="profile-title-section">
            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Le mie Prenotazioni</h1>
            <p className="profile-role-tag" style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--color-accent-transparent)', color: 'var(--color-accent)', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stato Appuntamenti</p>
          </div>
        </header>

        <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-xl)' }}>
          {loading ? (
            <div className="loading-container" style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '16px' }}>{t('common.loading')}</p>
            </div>
          ) : bookings.length > 0 ? (
            <div className="appointments-list">
              {[...bookings].sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()).map(appt => (
                <div key={appt.booking_id_db} className="appointment-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--color-border)', transition: 'transform 0.2s ease', cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>
                        {new Date(appt.booking_date || '').toLocaleDateString(getLocaleTag(language), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="ph ph-clock" /> {new Date(appt.booking_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`status-badge ${appt.booking_accepted ? 'accepted' : appt?.booking_accepted === false ? 'rejected' : 'pending'}`} style={{ fontSize: '0.95rem', padding: '6px 16px', borderRadius: '20px', fontWeight: 600 }}>
                      {appt.booking_accepted ? 'Accettato' : appt.booking_accepted === false ? 'Rifiutato' : 'In attesa'}
                    </span>
                  </div>
                  {appt.type && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                      <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}><strong>Prestazione:</strong> {appt.type}</p>
                    </div>
                  )}
                  {appt.notes && (
                    <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ph ph-info" /> {appt.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
              <i className="ph ph-calendar-blank" style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: '1.1rem' }}>Non hai ancora effettuato nessuna prenotazione.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
