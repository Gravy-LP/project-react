import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';
import { createBooking, searchBookings, type BookingPayload } from '../lib/api';
import { getInitials } from '../lib/formatters';
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

import BookingFields from './BookingFields';

import { useTranslation } from '../context/LanguageContext';

export default function BookingModal({ isOpen, onClose, initialDate, initialTime, onSuccess }: BookingModalProps) {
  const { showToast } = useToast();
  const { language, t } = useTranslation();
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '');
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookingPayload[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date().toLocaleDateString('en-CA');
      setDate(d);
      setTime(initialTime || '');
      setType('');
      setNotes('');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialDate, initialTime]);

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
    showToast(t('modal.contact_loaded').replace('{name}', contact.first_name || ''), 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName || null,
      e_mail: formData.email || null,
      phone_number: formData.phone || null,
      booking_date: `${date}T${time}:00`,
      type: type || null,
      notes: notes || null,
      booking_accepted: true
    };

    if (!payload.first_name || !payload.booking_date || !time) {
      showToast(t('modal.required_fields'), 'error');
      return;
    }

    try {
      const res = await createBooking(payload);
      if (!res.success) {
        showToast(res.error || t('common.error'), 'error');
        return;
      }
      showToast(t('booking.success'), 'success');
      onSuccess?.();
      onClose();
    } catch {
      showToast(t('common.error'), 'error');
    }
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="appt-form-header">
        <div className="appt-form-icon">
          <i className="ph ph-calendar-plus" />
        </div>
        <div>
          <h2>{t('modal.new_appointment')}</h2>
          <p>{t('modal.register_for')} <strong>{new Date(date).toLocaleDateString(getLocaleTag(language))}</strong></p>
        </div>
      </div>

      <div className="modal-search-section">
        <div className="search-input-wrapper active">
          <i className="ph ph-magnifying-glass search-icon" />
          <input 
            className="search-input" 
            style={{ opacity: 1, pointerEvents: 'auto' }}
            placeholder={t('modal.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && <div className="search-spinner active" style={{ position: 'absolute', right: '12px' }}><i className="ph ph-circle-notch" /></div>}
        </div>
        
        {searchResults.length > 0 && (
          <div className="modal-search-results glass-panel">
            {searchResults.slice(0, 5).map(res => (
              <div key={res.booking_id_db} className="search-item" onClick={() => selectContact(res)}>
                <div className="search-item-avatar">{getInitials(`${res.first_name} ${res.last_name || ''}`)}</div>
                <div className="search-item-info">
                  <div className="search-item-name">{res.first_name} {res.last_name}</div>
                  <div className="search-item-contact">{res.phone_number || res.e_mail || t('modal.no_contact_info')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="appt-form-grid">
          <div className="appt-form-group">
            <label>{t('calendar.first_name')} *</label>
            <input 
              name="firstName" 
              placeholder="es. Mario" 
              required 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>{t('calendar.last_name')}</label>
            <input 
              name="lastName" 
              placeholder="es. Rossi" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>{t('calendar.email')}</label>
            <input 
              name="email" 
              type="email" 
              placeholder="mario@esempio.it" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="appt-form-group">
            <label>{t('calendar.phone')}</label>
            <input 
              name="phone" 
              type="tel" 
              placeholder="+39 333 ..." 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <BookingFields 
            date={date} setDate={setDate}
            time={time} setTime={setTime}
            type={type} setType={setType}
            notes={notes} setNotes={setNotes}
          />
        </div>

        <div className="appt-form-actions">
          <span className="required-hint">{t('modal.required_hint')}</span>
          <div className="appt-form-btns">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">
              <i className="ph ph-check" /> {t('modal.save_appointment')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
