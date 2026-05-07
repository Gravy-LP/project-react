import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getAvailableSlots } from '../../lib/booking-utils';
import './PublicBookingForm.css';

// These should be your public Supabase credentials
// For an external site, you'd typically pass these as props or use env vars
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SCHEDULE = {
  morning: { start: '07:30', end: '14:30' },
  afternoon: { start: '16:00', end: '19:30' }
};

const SLOT_DURATION = 30; // minutes

export default function PublicBookingForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    type: 'Consultazione',
    notes: ''
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [viewDate, setViewDate] = useState(new Date());

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  const changeMonth = (offset: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + offset);
    setViewDate(d);
  };

  const renderCalendarDays = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < offset; i++) {
      days.push(<div key={`empty-${i}`} className="day empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = date < today;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isSelected = formData.date === ds;
      
      days.push(
        <button
          key={d}
          type="button"
          className={`day ${isPast || isWeekend ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
          disabled={isPast || isWeekend}
          onClick={() => {
            setFormData(prev => ({ ...prev, date: ds, time: '' }));
            fetchAvailableSlots(ds);
          }}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  // Generate all possible slots for a day
  const generateAllSlots = () => {
    const slots: string[] = [];
    const sessions = [SCHEDULE.morning, SCHEDULE.afternoon];
    
    sessions.forEach(session => {
      let current = new Date(`2000-01-01T${session.start}:00`);
      const end = new Date(`2000-01-01T${session.end}:00`);
      
      while (current < end) {
        slots.push(current.toTimeString().slice(0, 5));
        current.setMinutes(current.getMinutes() + SLOT_DURATION);
      }
    });
    return slots;
  };

  const fetchAvailableSlots = async (selectedDate: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(selectedDate);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'date' && value) {
      fetchAvailableSlots(value);
      setFormData(prev => ({ ...prev, time: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading' });

    try {
      const { error } = await supabase
        .from('Booking')
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          e_mail: formData.email,
          phone_number: formData.phone,
          booking_date: `${formData.date}T${formData.time}:00`,
          type: formData.type,
          notes: formData.notes,
          booking_accepted: null, // Pending by default
          is_deleted: false
        }]);

      if (error) throw error;

      setStatus({ type: 'success', message: 'Richiesta inviata con successo! Ti contatteremo presto.' });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        type: 'Consultazione',
        notes: ''
      });
    } catch (err) {
      console.error('Booking Error:', err);
      setStatus({ type: 'error', message: 'Si è verificato un errore. Per favore riprova più tardi.' });
    }
  };

  if (status.type === 'success') {
    return (
      <div className="public-form-container success">
        <div className="success-icon">✓</div>
        <h2>Grazie!</h2>
        <p>{status.message}</p>
        <button onClick={() => setStatus({ type: 'idle' })} className="btn-reset">Invia un'altra richiesta</button>
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <form onSubmit={handleSubmit} className="public-booking-form">
        <div className="form-header">
          <h2>Prenota un Appuntamento</h2>
          <p>Compila il modulo per richiedere una visita.</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Nome *</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="Es: Mario" />
          </div>
          <div className="form-group">
            <label>Cognome *</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Es: Rossi" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="mario.rossi@esempio.it" />
          </div>
          <div className="form-group">
            <label>Telefono</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+39 333 123 4567" />
          </div>
        </div>

        <div className="form-group">
          <label>Data Preferita *</label>
          <div className="custom-calendar">
            <div className="calendar-nav">
              <button type="button" onClick={() => changeMonth(-1)}>&lt;</button>
              <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
              <button type="button" onClick={() => changeMonth(1)}>&gt;</button>
            </div>
            <div className="calendar-weekdays">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="calendar-days">
              {renderCalendarDays()}
            </div>
          </div>
          <input type="hidden" name="date" value={formData.date} required />
        </div>

        <div className="form-group">
          <label>Orario Disponibile *</label>
          {formData.date ? (
            isLoadingSlots ? (
              <div className="slots-loader">Caricamento orari...</div>
            ) : availableSlots.length > 0 ? (
              <div className="time-slots-grid">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    className={`time-chip ${formData.time === slot ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <div className="no-slots-message">Nessun orario disponibile per questa data.</div>
            )
          ) : (
            <div className="no-date-selected">Scegli prima una data per vedere gli orari.</div>
          )}
          <input type="hidden" name="time" value={formData.time} required />
        </div>

        <div className="form-group">
          <label>Tipo di Prestazione</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="Consultazione">Consultazione Generale</option>
            <option value="Visita Specialistica">Visita Specialistica</option>
            <option value="Controllo">Controllo</option>
            <option value="Altro">Altro</option>
          </select>
        </div>

        <div className="form-group">
          <label>Note Aggiuntive</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Descrivi brevemente il motivo della visita..." rows={3} />
        </div>

        {status.type === 'error' && <div className="form-error">{status.message}</div>}

        <button type="submit" className="submit-btn" disabled={status.type === 'loading'}>
          {status.type === 'loading' ? 'Invio in corso...' : 'Invia Richiesta'}
        </button>
      </form>
    </div>
  );
}
