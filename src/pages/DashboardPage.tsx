import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import BookingModal from '../components/BookingModal';
import { supabase } from '../lib/supabase';
import { generateAllSlots } from '../lib/booking-utils';
import { getInitials } from '../lib/formatters';
import { useTranslation } from '../context/LanguageContext';
import '../styles/dashboard.css';
import '../styles/timeline.css';

interface Booking {
  booking_id_db: string;
  first_name: string;
  last_name: string | null;
  booking_date: string | null;
  type: string | null;
  booking_accepted: boolean | null;
  profile_id: string | null;
}

export default function DashboardPage() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [tomorrowBookings, setTomorrowBookings] = useState<Booking[]>([]);
  const [timeline, setTimeline] = useState<{ time: string, booking?: Booking }[]>([]);
  const [allSlotsCount, setAllSlotsCount] = useState(0);
  const [searchParams] = useSearchParams();
  const { language, t } = useTranslation();
  
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, time: string } | null>(null);

  const fetchDashboardData = async () => {
    const today = new Date();
    const ds = today.toLocaleDateString('en-CA'); // YYYY-MM-DD local

    
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tsTomorrow = tomorrow.toLocaleDateString('en-CA');


    const { data: dataToday } = await supabase
      .from('Booking')
      .select('*')
      .eq('is_deleted', false)
      .gte('booking_date', `${ds}T00:00:00Z`)
      .lte('booking_date', `${ds}T23:59:59Z`);

    const { data: dataTomorrow } = await supabase
      .from('Booking')
      .select('*')
      .eq('is_deleted', false)
      .gte('booking_date', `${tsTomorrow}T00:00:00Z`)
      .lte('booking_date', `${tsTomorrow}T23:59:59Z`);

    const tBookings = dataToday || [];
    const mBookings = dataTomorrow || [];
    
    setTodayBookings(tBookings);
    setTomorrowBookings(mBookings);

    const allSlots = generateAllSlots();
    setAllSlotsCount(allSlots.length);

    const merged = allSlots.map(slot => {
      const found = tBookings.find(b => {
        const bt = new Date(b.booking_date!).toTimeString().slice(0, 5);
        return bt === slot;
      });
      return { time: slot, booking: found };
    });
    setTimeline(merged);
  };

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel(`dashboard-changes-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking' }, () => fetchDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openBookingModal = (time: string) => {
    setSelectedSlot({
      date: new Date().toLocaleDateString('en-CA'),
      time: time
    });
    setIsBookingOpen(true);
  };


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

  return (
    <Layout>
      <div className="dashboard-content animate-in">
        
        <div className="dashboard-top-grid">
          <div className="dashboard-main-card glass-panel">
            <div className="card-header-simple">
              <div className="header-title-group">
                <i className="ph-fill ph-calendar-check" />
                <h2>{t('dashboard.title')}</h2>
              </div>
              <span className="current-date-pill">
                {new Date().toLocaleDateString(getLocaleTag(language), { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            
            <div className="timeline-container">
              <div className="timeline-track">
                {timeline.map((item, idx) => (
                  <div key={idx} className={`timeline-slot ${item.booking ? 'occupied' : 'available'}`}>
                    <div className="slot-time">{item.time}</div>
                    {item.booking ? (
                      <div className="slot-content">
                        <div className="slot-avatar">{getInitials(`${item.booking.first_name} ${item.booking.last_name || ''}`)}</div>
                        <div className="slot-info">
                          <span className="slot-name">{item.booking.first_name} {item.booking.last_name?.[0]}.</span>
                          <span className="slot-type">{item.booking.type || t('booking.services.odontoiatria')}</span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="slot-book-btn" 
                        onClick={() => openBookingModal(item.time)}
                      >
                        <i className="ph ph-plus" /> {t('dashboard.book')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-mock-card glass-panel">
            <div className="card-header-simple">
              <div className="header-title-group">
                <i className="ph-fill ph-chart-line-up" />
                <h2>{t('dashboard.stats')}</h2>
              </div>
            </div>
            <div className="mock-content">
              <div className="stats-section">
                <div className="stats-group">
                  <h3>{t('dashboard.today')}</h3>
                  <div className="stat-row">
                    <span className="stat-label">{t('dashboard.booked')}</span>
                    <span className="stat-value">{todayBookings.length}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">{t('dashboard.available')}</span>
                    <span className="stat-value">{Math.max(0, allSlotsCount - todayBookings.length)}</span>
                  </div>
                </div>
                
                <div className="stats-group divider-top">
                  <h3>{t('dashboard.tomorrow')}</h3>
                  <div className="stat-row">
                    <span className="stat-label">{t('dashboard.booked')}</span>
                    <span className="stat-value">{tomorrowBookings.length}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">{t('dashboard.available')}</span>
                    <span className="stat-value">{Math.max(0, allSlotsCount - tomorrowBookings.length)}</span>
                  </div>
                </div>
              </div>
              
              <div className="stats-footer">
                <Link to="/calendar" className="view-more-btn">
                  {t('dashboard.view_calendar')} <i className="ph ph-arrow-right" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-bottom-card glass-panel">
          <div className="card-header-simple">
            <div className="header-title-group">
              <i className="ph-fill ph-activity" />
              <h2>{t('dashboard.recent_activity')}</h2>
            </div>
          </div>
          <div className="activity-placeholder">
            <div className="activity-item">
              <i className="ph ph-info" />
              <p>{t('dashboard.sync_note')}</p>
            </div>
            <div className="activity-item">
              <i className="ph ph-clock-counter-clockwise" />
              <p>{t('dashboard.backup_note')}</p>
            </div>
          </div>
        </div>

      </div>

      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)}
        initialDate={selectedSlot?.date}
        initialTime={selectedSlot?.time}
        onSuccess={fetchDashboardData}
      />
    </Layout>
  );
}
