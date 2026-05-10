import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  label?: string;
  required?: boolean;
}

export default function DatePicker({ date, setDate, label, required }: DatePickerProps) {
  const { t } = useTranslation();
  const [isCalMinimized, setIsCalMinimized] = useState(!!date);

  const monthNames = t('calendar.months') as unknown as string[];
  const weekdaysShort = t('calendar.weekdays_short') as unknown as string[];

  const renderMiniCalendar = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (isCalMinimized && date) {
      const [yy, mm, dd] = date.split('-');
      return (
        <div className="mini-calendar-summary" onClick={() => setIsCalMinimized(false)}>
          <div className="summary-date">
            <i className="ph ph-calendar" />
            <span>{dd}/{mm}/{yy}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm">{t('calendar.change')}</button>
        </div>
      );
    }

    const vd = new Date(date || todayStr);
    const vy = vd.getFullYear(), vm = vd.getMonth();
    const vfd = new Date(vy, vm, 1).getDay();
    const vdim = new Date(vy, vm + 1, 0).getDate();
    const voff = vfd === 0 ? 6 : vfd - 1;
    
    const days = [];
    for (let i = 0; i < voff; i++) days.push(<div key={`e-${i}`} className="mini-day empty"></div>);
    
    for (let d = 1; d <= vdim; d++) {
      const ds = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(vy, vm, d);
      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
      const isSelected = date === ds;
      
      days.push(
        <button
          key={ds}
          type="button"
          className={`mini-day ${isWeekend ? 'weekend' : ''} ${isSelected ? 'active' : ''}`}
          onClick={() => {
            setDate(ds);
            setIsCalMinimized(true);
          }}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="mini-calendar animate-in">
        <div className="mini-calendar-header">
          {monthNames[vm]} {vy}
        </div>
        <div className="mini-calendar-weekdays">
          {weekdaysShort.map((w: string, i: number) => <span key={`${w}-${i}`}>{w}</span>)}
        </div>
        <div className="mini-calendar-grid">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="appt-form-group span-2">
      {label && <label>{label}{required && ' *'}</label>}
      {renderMiniCalendar()}
      <input type="hidden" value={date} required={required} />
    </div>
  );
}
