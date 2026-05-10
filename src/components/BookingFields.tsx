import React, { useState, useEffect } from 'react';
import { getAvailableSlots } from '../lib/booking-utils';
import { useTranslation } from '../context/LanguageContext';
import DatePicker from './DatePicker';

interface BookingFieldsProps {
  date: string;
  setDate: (date: string) => void;
  time: string;
  setTime: (time: string) => void;
  type: string;
  setType: (type: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  ignoreBookingId?: string;
  children?: React.ReactNode;
}

export default function BookingFields({ 
  date, setDate, 
  time, setTime, 
  type, setType, 
  notes, setNotes,
  ignoreBookingId,
  children
}: BookingFieldsProps) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isTimeMinimized, setIsTimeMinimized] = useState(!!time);
  const { t } = useTranslation();

  useEffect(() => {
    if (!time) {
      setIsTimeMinimized(false);
    }
  }, [time]);

  const serviceOptions = [
    { value: '', label: t('booking.services.select') },
    { value: 'odontoiatria', label: t('booking.services.odontoiatria') },
    { value: 'igiene', label: t('booking.services.igiene') },
    { value: 'sbiancamento', label: t('booking.services.sbiancamento') },
    { value: 'ortodonzia', label: t('booking.services.ortodonzia') },
    { value: 'implantologia', label: t('booking.services.implantologia') },
    { value: 'estetica', label: t('booking.services.estetica') },
    { value: 'ginecologia', label: t('booking.services.ginecologia') },
    { value: 'altro', label: t('booking.services.altro') },
  ];

  useEffect(() => {
    if (date) {
      updateSlots(date);
    }
  }, [date, ignoreBookingId]);

  const updateSlots = async (selectedDate: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(selectedDate, ignoreBookingId);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };


  return (
    <div className="booking-fields-container animate-in">
      <DatePicker 
        date={date} 
        setDate={setDate} 
        label={t('booking.date')} 
        required 
      />

      <div className="appt-form-group span-2">
        <label>{t('booking.time')} *</label>
        
        {isTimeMinimized && time ? (
          <div className="mini-calendar-summary" onClick={() => setIsTimeMinimized(false)}>
            <div className="summary-date">
              <i className="ph ph-clock" />
              <span>{time}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm">{t('calendar.change')}</button>
          </div>
        ) : (
          <>
            {isLoadingSlots ? (
              <div className="slot-hint">{t('common.loading')}</div>
            ) : (
              <div className="slot-grid-compact animate-in">
                {/* If editing and current time is not in available slots, show it anyway as selected */}
                {time && !availableSlots.includes(time) && (
                  <button type="button" className="slot-chip active">{time}</button>
                )}
                {availableSlots.length > 0 ? (
                  availableSlots.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`slot-chip ${time === s ? 'active' : ''}`}
                      onClick={() => {
                        setTime(s);
                        setIsTimeMinimized(true);
                      }}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="slot-hint" style={{gridColumn: 'span 4'}}>{t('booking.no_slots')}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="appt-form-group span-2">
        <label>{t('booking.service')}</label>
        <select 
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {serviceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="appt-form-group span-2">
        <label>{t('booking.notes')}</label>
        <textarea 
          rows={3} 
          placeholder={t('booking.notes_placeholder')} 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {children}
    </div>
  );
}
