import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBookings, type BookingPayload } from '../lib/api';
import '../styles/search.css';

export default function GlobalSearch() {
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookingPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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
      setShowDropdown(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => performSearch(query.trim()), 500);
    } else {
      setShowDropdown(false);
      setResults([]);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsActive(false);
        setShowDropdown(false);
        setQuery('');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getInitials = (first: string, last: string) =>
    ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();

  const handleResultClick = (b: BookingPayload) => {
    setShowDropdown(false);
    setIsActive(false);
    setQuery('');
    if (b.booking_accepted === null) {
      navigate(`/incoming-bookings?highlight=${b.booking_id_db}`);
    } else if (b.booking_accepted === true) {
      navigate(`/?highlight=${b.booking_id_db}`);
    } else {
      navigate(`/incoming-bookings?highlight=${b.booking_id_db}`);
    }
  };

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className={`search-input-wrapper ${isActive ? 'active' : ''} ${query ? 'has-text' : ''}`}>
        <i
          className="ph ph-magnifying-glass search-icon"
          onClick={() => {
            setIsActive(true);
            inputRef.current?.focus();
          }}
        />
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
            if (b.booking_accepted === null) {
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
                <div className="search-item-avatar">{getInitials(first, last)}</div>
                <div className="search-item-info">
                  <div className="search-item-name">{first} {last}</div>
                  <div className="search-item-contact">
                    {b.e_mail || b.phone_number || 'Nessun contatto'}
                  </div>
                </div>
                <div className="search-item-meta">
                  {statusHtml}
                  <div>{dateStr}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
