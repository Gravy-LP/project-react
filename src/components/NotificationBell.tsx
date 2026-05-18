import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { fetchBookings, updateBooking, deleteBooking } from '../lib/api';
import { getInitials } from '../lib/formatters';
import '../styles/notifications.css';

interface Booking {
  booking_id_db: string;
  first_name: string;
  last_name: string | null;
  booking_date: string | null;
  type: string | null;
  booking_accepted: boolean | null;
}

interface NotificationBellProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function NotificationBell({ isOpen, setIsOpen }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Fetch pending bookings
  useEffect(() => {
    async function fetchNotifications() {
      const { bookings, error } = await fetchBookings(true);
      if (!error) {
        setNotifications((bookings as Booking[]) || []);
      }
    }
    fetchNotifications();

    const channel = supabase
      .channel(`notification-changes-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [setIsOpen]);


  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) +
      ' ' +
      date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'accept' || action === 'refuse') {
        const accepted = action === 'accept';
        const res = await updateBooking(id, { booking_accepted: accepted });
        if (!res.success) {
          showToast(res.error || 'Errore', 'error');
          return;
        }
        showToast(accepted ? 'Prenotazione accettata!' : 'Prenotazione rifiutata!', 'success');
      } else if (action === 'delete') {
        const res = await deleteBooking(id);
        if (!res.success) {
          showToast(res.error || 'Errore', 'error');
          return;
        }
        showToast('Prenotazione eliminata!', 'success');
      }

      // Remove from list
      setNotifications((prev) => prev.filter((n) => n.booking_id_db !== id));
    } catch {
      showToast('Errore di rete', 'error');
    }
  };

  const totalCount = notifications.length;
  const displayedNotifications = notifications.slice(0, 2);
  const hasMore = totalCount > 2;

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        className="notification-bell-btn"
        aria-label="Notifiche"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
      >
        <i className="ph ph-bell" />
        {totalCount > 0 && (
          <span className="notification-badge">{totalCount > 99 ? '99+' : totalCount}</span>
        )}
      </button>

      <div className={`notifications-dropdown glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="dropdown-header">
          <h3>Notifiche</h3>
          <span className="notif-count-label">{totalCount} nuove</span>
        </div>

        <div className="dropdown-body">
          {displayedNotifications.length > 0 ? (
            displayedNotifications.map((notif) => (
              <div className="notif-item" key={notif.booking_id_db}>
                <div className="notif-main">
                  <Link
                    to={`/incoming-bookings?highlight=${notif.booking_id_db}`}
                    className="notif-left"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="notif-avatar">
                      {getInitials(`${notif.first_name} ${notif.last_name || ''}`)}
                    </div>
                    <div className="notif-details">
                      <div className="notif-name">
                        {notif.first_name} {notif.last_name || ''}
                      </div>
                      <div className="notif-meta">
                        <span className="notif-type">{notif.type || 'Richiesta'}</span>
                        <span className="notif-separator">·</span>
                        <span className="notif-time">
                          <i className="ph ph-clock" />
                          {formatDate(notif.booking_date)}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    className={`notif-expand-btn ${expandedId === notif.booking_id_db ? 'expanded' : ''}`}
                    aria-label="Espandi azioni"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expandedId === notif.booking_id_db ? null : notif.booking_id_db);
                    }}
                  >
                    <i className="ph ph-caret-down" />
                  </button>
                </div>

                <div className={`notif-actions ${expandedId === notif.booking_id_db ? 'expanded' : ''}`}>
                  <button className="notif-action-btn accept" title="Accetta" onClick={() => handleAction('accept', notif.booking_id_db)}>
                    <i className="ph ph-check" />
                  </button>
                  <button className="notif-action-btn refuse" title="Rifiuta" onClick={() => handleAction('refuse', notif.booking_id_db)}>
                    <i className="ph ph-x" />
                  </button>
                  <button className="notif-action-btn delete" title="Elimina" onClick={() => handleAction('delete', notif.booking_id_db)}>
                    <i className="ph ph-trash" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="notif-empty">
              <i className="ph ph-bell-slash" />
              <span>Nessuna nuova notifica</span>
            </div>
          )}

          {hasMore && (
            <Link to="/incoming-bookings" className="notif-view-more" onClick={() => setIsOpen(false)}>
              <i className="ph ph-dots-three" />
              Visualizza tutte ({totalCount})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
