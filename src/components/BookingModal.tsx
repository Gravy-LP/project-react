import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';
import { createBooking } from '../lib/api';
import { getAvailableSlots } from '../lib/booking-utils';
import '../styles/calendar.css';
import '../styles/modal.css';

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

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date().toISOString().split('T')[0];
      setDate(d);
      setTime(initialTime || '');
      updateSlots(d);
    }
  }, [isOpen, initialDate, initialTime]);

  const updateSlots = async (selectedDate: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(selectedDate);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const gv = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.value?.trim() || '';
    
    const payload = {
      first_name: gv('firstName'),
      last_name: gv('lastName') || null,
      e_mail: gv('email') || null,
      phone_number: gv('phone') || null,
      booking_date: `${date}T${time}:00`,
      type: (f.elements.namedItem('type') as HTMLSelectElement)?.value || null,
      notes: (f.elements.namedItem('notes') as HTMLTextAreaElement)?.value?.trim() || null,
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

      <form onSubmit={handleSubmit}>
        <div className="appt-form-grid">
          <div className="appt-form-group">
            <label>Nome *</label>
            <input name="firstName" placeholder="es. Mario" required />
          </div>
          <div className="appt-form-group">
            <label>Cognome</label>
            <input name="lastName" placeholder="es. Rossi" />
          </div>
          <div className="appt-form-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="mario@esempio.it" />
          </div>
          <div className="appt-form-group">
            <label>Telefono</label>
            <input name="phone" type="tel" placeholder="+39 333 ..." />
          </div>

          <div className="appt-form-group span-2">
            <label>Orario Selezionato: <strong style={{color: 'var(--color-accent)'}}>{time || 'Nessuno'}</strong></label>
            {isLoadingSlots ? (
              <div className="slot-hint">Caricamento orari...</div>
            ) : (
              <div className="slot-grid-compact">
                {/* Ensure the initial time is shown as an option even if not in "available" list (e.g. if it's already booked but we want to show it as selected) */}
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
            <select name="type">
              {serviceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="appt-form-group span-2">
            <label>Note</label>
            <textarea name="notes" rows={3} placeholder="Aggiungi dettagli extra..." />
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
