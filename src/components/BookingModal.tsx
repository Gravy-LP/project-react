import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';
import { createBooking, searchBookings, type BookingPayload } from '../lib/api';
import { getAvailableSlots } from '../lib/booking-utils';
import '../styles/calendar.css';
import '../styles/modal.css';
import '../styles/search.css';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:mm
  onSuccess?: () => void;
}

const serviceOptions = [
  { value: '', label: 'Seleziona...' },
  { value: 'odontoiatria', label: 'Odontoiatria' },
  { value: 'igiene', label: 'Igiene Orale' },
  { value: 'sbiancamento', label: 'Sbiancamento' },
  { value: 'ortodonzia', label: 'Ortodonzia' },
  { value: 'implantologia', label: 'Implantologia' },
  { value: 'estetica', label: 'Medicina Estetica' },
  { value: 'ginecologia', label: 'Ginecologia' },
  { value: 'altro', label: 'Altro' },
];

export default function BookingModal({ isOpen, onClose, initialDate, initialTime, onSuccess }: BookingModalProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: '',
    notes: ''
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookingPayload[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date().toISOString().split('T')[0];
      setDate(d);
      setTime(initialTime || '');
      updateSlots(d);
      // Reset form on open
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: '',
        notes: ''
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialDate, initialTime]);

  const updateSlots = async (selectedDate: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(selectedDate);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { bookings } = await searchBookings(q);
    setSearchResults(bookings || []);
    setIsSearching(false);
  };

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = window.setTimeout(() => handleSearch(searchQuery), 400);
    } else {
      setSearchResults([]);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const selectContact = (contact: BookingPayload) => {
    setFormData({
      ...formData,
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      email: contact.e_mail || '',
      phone: contact.phone_number || ''
    });
    setSearchQuery('');
    setSearchResults([]);
    showToast(`Caricato profilo di ${contact.first_name}`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName || null,
      e_mail: formData.email || null,
      phone_number: formData.phone || null,
      booking_date: `${date}T${time}:00`,
      type: formData.type || null,
      notes: formData.notes || null,
      booking_accepted: true
    };

    if (!payload.first_name || !payload.booking_date || !time) {
      showToast('Compila i campi obbligatori', 'error');
      return;
    }

    try {
      const res = await createBooking(payload);
      if (!res.success) {
        showToast(res.error || 'Errore', 'error');
        return;
      }
      showToast('Appuntamento registrato!', 'success');
      onSuccess?.();
      onClose();
    } catch {
      showToast('Errore di rete', 'error');
    }
  };

  const getInitials = (first: string, last: string | null | undefined) =>
    ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="appt-form-header">
        <div className="appt-form-icon">
          <i className="ph ph-calendar-plus" />
        </div>
        <div>
          <h2>Nuovo Appuntamento</h2>
          <p>Registra un appuntamento per il <strong>{new Date(date).toLocaleDateString('it-IT')}</strong></p>
        </div>
      </div>

      <div className="modal-search-section">
        <div className="search-input-wrapper active">
          <i className="ph ph-magnifying-glass search-icon" />
          <input 
            className="search-input" 
            style={{ opacity: 1, pointerEvents: 'auto' }}
            placeholder="Cerca paziente esistente per auto-completare..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && <div className="search-spinner active" style={{ position: 'absolute', right: '12px' }}><i className="ph ph-circle-notch" /></div>}
        </div>
        
        {searchResults.length > 0 && (
          <div className="modal-search-results glass-panel">
            {searchResults.slice(0, 5).map(res => (
              <div key={res.booking_id_db} className="search-item" onClick={() => selectContact(res)}>
                <div className="search-item-avatar">{getInitials(res.first_name, res.last_name)}</div>
                <div className="search-item-info">
                  <div className="search-item-name">{res.first_name} {res.last_name}</div>
                  <div className="search-item-contact">{res.phone_number || res.e_mail || 'Nessun recapito'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="appt-form-grid">
          <div className="appt-form-group">
            <label>Nome *</label>
            <input 
              name="firstName" 
              placeholder="es. Mario" 
              required 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>Cognome</label>
            <input 
              name="lastName" 
              placeholder="es. Rossi" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>Email</label>
            <input 
              name="email" 
              type="email" 
              placeholder="mario@esempio.it" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>Telefono</label>
            <input 
              name="phone" 
              type="tel" 
              placeholder="+39 333 ..." 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="appt-form-group span-2">
            <label>Orario Selezionato: <strong style={{color: 'var(--color-accent)'}}>{time || 'Nessuno'}</strong></label>
            {isLoadingSlots ? (
              <div className="slot-hint">Caricamento orari...</div>
            ) : (
              <div className="slot-grid-compact">
                {time && !availableSlots.includes(time) && (
                  <button type="button" className="slot-chip active">{time}</button>
                )}
                {availableSlots.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`slot-chip ${time === s ? 'active' : ''}`}
                    onClick={() => setTime(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="appt-form-group span-2">
            <label>Tipo di Visita</label>
            <select 
              name="type"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              {serviceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="appt-form-group span-2">
            <label>Note</label>
            <textarea 
              name="notes" 
              rows={3} 
              placeholder="Aggiungi dettagli extra..." 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        <div className="appt-form-actions">
          <span className="required-hint">* campi obbligatori</span>
          <div className="appt-form-btns">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn-primary">
              <i className="ph ph-check" /> Salva Appuntamento
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
