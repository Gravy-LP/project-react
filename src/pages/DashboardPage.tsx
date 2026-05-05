import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import { supabase } from '../lib/supabase';
import '../styles/dashboard.css';

interface Booking {
  booking_id_db: string;
  first_name: string;
  last_name: string | null;
  booking_date: string | null;
  type: string | null;
  booking_accepted: boolean | null;
}

export default function DashboardPage() {
  const [upcomingApts, setUpcomingApts] = useState<Booking[]>([]);
  const [incomingApts, setIncomingApts] = useState<Booking[]>([]);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    async function fetchData() {
      const now = new Date().toISOString();

      const { data: upcoming } = await supabase
        .from('Booking')
        .select('*')
        .eq('booking_accepted', true)
        .gte('booking_date', now)
        .order('booking_date', { ascending: true })
        .limit(5);

      const { data: incoming } = await supabase
        .from('Booking')
        .select('*')
        .or('booking_accepted.is.null,booking_accepted.eq.false')
        .order('booking_date', { ascending: true })
        .limit(5);

      setUpcomingApts(upcoming || []);
      setIncomingApts(incoming || []);
    }
    fetchData();
  }, []);

  // Highlight effect
  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`booking-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-pulse');
        window.history.replaceState({}, document.title, '/');
        setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
      }
    }
  }, [highlightId, upcomingApts]);

  const formatAptDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) +
      ' ' +
      date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getInitials = (first: string, last: string | null) =>
    ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();

  return (
    <Layout>
      <div className="dashboard-grid full-width">
        <div className="section-column">
          <GlassCard title="Prossimi Appuntamenti" icon="ph-calendar-check">
            <div className="appointments-list">
              {upcomingApts.length > 0 ? (
                upcomingApts.map((apt) => (
                  <div className="appointment-item" id={`booking-${apt.booking_id_db}`} key={apt.booking_id_db}>
                    <div className="patient-info">
                      <div className="initials-avatar">
                        {getInitials(apt.first_name, apt.last_name)}
                      </div>
                      <div>
                        <div className="patient-name">{apt.first_name} {apt.last_name || ''}</div>
                        <div className="appointment-service">{apt.type || 'Visita'}</div>
                      </div>
                    </div>
                    <div className="appointment-time">
                      <i className="ph ph-clock" />
                      {formatAptDate(apt.booking_date)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Nessun appuntamento confermato.</div>
              )}
            </div>
            <div className="card-footer">
              <Link to="/calendar" className="view-more-btn">
                Visualizza Calendario <i className="ph ph-arrow-right" />
              </Link>
            </div>
          </GlassCard>
        </div>

        <div className="section-column">
          <GlassCard title="Nuove Richieste" icon="ph-bell-ringing">
            <div className="appointments-list">
              {incomingApts.length > 0 ? (
                incomingApts.map((apt) => (
                  <div className="appointment-item" id={`booking-${apt.booking_id_db}`} key={apt.booking_id_db}>
                    <div className="patient-info">
                      <div className="initials-avatar incoming">
                        {getInitials(apt.first_name, apt.last_name)}
                      </div>
                      <div>
                        <div className="patient-name">{apt.first_name} {apt.last_name || ''}</div>
                        <div className="appointment-service">{apt.type || 'Richiesta'}</div>
                      </div>
                    </div>
                    <div className="appointment-time">
                      {apt.booking_accepted === false ? (
                        <span className="status-marker rejected">Rifiutata</span>
                      ) : (
                        <span className="status-marker pending">In Attesa</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Nessuna nuova richiesta.</div>
              )}
            </div>
            <div className="card-footer">
              <Link to="/incoming-bookings" className="view-more-btn">
                Gestisci Richieste <i className="ph ph-arrow-right" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}
