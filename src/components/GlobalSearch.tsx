import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBookings, type BookingPayload } from '../lib/api';
import { getInitials } from '../lib/formatters';
import '../styles/search.css';

interface GlobalSearchProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function GlobalSearch({ isOpen, setIsOpen }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookingPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number>();
  const navigate = useNavigate();

  const performSearch = useCallback(async (q: string) => {
    setIsLoading(true);
    const { bookings } = await searchBookings(q);
    setResults(bookings || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => performSearch(query.trim()), 500);
    } else {
      setResults([]);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, performSearch]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const showDropdown = isOpen && query.trim().length > 0;


  const handleResultClick = (b: BookingPayload) => {
    setIsOpen(false);
    setQuery('');

    // If it's a virtual booking pointing to a profile
    if (b.booking_id_db?.startsWith('p-') && b.profile_id) {
      navigate(`/profile/${b.profile_id}`);
      return;
    }

    if (b.booking_accepted === null) {
      navigate(`/incoming-bookings?highlight=${b.booking_id_db}`);
    } else if (b.booking_accepted === true) {
      navigate(`/?highlight=${b.booking_id_db}`);
    } else {
      navigate(`/incoming-bookings?highlight=${b.booking_id_db}`);
    }
  };

  return (
    <div className={`global-search-container ${isOpen ? 'active' : ''}`} ref={containerRef}>
      <div className={`search-input-wrapper ${isOpen ? 'active' : ''} ${query ? 'has-text' : ''}`}>
        <button 
          type="button"
          className="search-trigger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Apri ricerca"
        >
          <i className="ph ph-magnifying-glass search-icon" />
        </button>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Cerca per nome, email o tel..."
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="search-clear-btn"
          aria-label="Cancella ricerca"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
        >
          <i className="ph ph-x" />
        </button>
      </div>

      <div className={`search-results-dropdown glass-panel ${showDropdown ? 'open' : ''}`}>
        <div className="search-results-header">
          <span>
            {isLoading
              ? 'Ricerca in corso...'
              : `${results.length} risultat${results.length === 1 ? 'o' : 'i'}`}
          </span>
          {isLoading && (
            <div className="search-spinner active">
              <i className="ph ph-spinner-gap" />
            </div>
          )}
        </div>
        <div className="search-results-body">
          {results.length === 0 && !isLoading && (
            <div className="search-empty-state active">
              <i className="ph ph-magnifying-glass" />
              <span>Nessun risultato trovato.</span>
            </div>
          )}
          {results.map((b) => {
            const first = b.first_name || '';
            const last = (b.last_name as string) || '';
            const dateStr = b.booking_date
              ? new Date(b.booking_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
              : 'N/A';

            let statusHtml: React.ReactNode;
            let dateDisplay = dateStr;

            if (b.booking_id_db?.startsWith('p-')) {
              statusHtml = <span className="search-item-status status-profile">Paziente</span>;
              dateDisplay = 'Profilo';
            } else if (b.booking_accepted === null) {
              statusHtml = <span className="search-item-status status-pending">In Attesa</span>;
            } else if (b.booking_accepted === true) {
              statusHtml = <span className="search-item-status status-accepted">Accettata</span>;
            } else {
              statusHtml = <span className="search-item-status status-rejected">Rifiutata</span>;
            }

            return (
              <div
                key={b.booking_id_db}
                className="search-item"
                onClick={() => handleResultClick(b)}
              >
                <div className="search-item-avatar">{getInitials(`${first} ${last}`)}</div>
                <div className="search-item-info">
                  <div className="search-item-name">{first} {last}</div>
                  <div className="search-item-contact">
                    {b.e_mail || b.phone_number || 'Nessun contatto'}
                  </div>
                </div>
                <div className="search-item-meta">
                  {statusHtml}
                  <div className="search-item-date">{dateDisplay}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
