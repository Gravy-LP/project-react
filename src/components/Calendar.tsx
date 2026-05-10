import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';
import { fetchBookings, updateBooking, deleteBooking, ensurePatientProfileForBooking } from '../lib/api';
import { getAvailableSlots } from '../lib/booking-utils';
import { formatPhoneNumber, getInitials } from '../lib/formatters';
import { useSwipe } from '../hooks/useSwipe';
import Modal from './Modal';
import BookingFields from './BookingFields';
import BookingModal from './BookingModal';
import '../styles/calendar.css';
import '../styles/modal.css';

interface Appointment {
  id: number;
  booking_id_db: string | null;
  patient: string;
  first_name: string;
  last_name: string;
  e_mail: string;
  phone_number: string;
  date: string;
  time: string;
  service: string;
  status: string;
  type: string | null;
  notes: string | null;
  booking_accepted: boolean | null;
  appointment_complete: boolean;
  profile_id: string | null;
}

export default function Calendar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [apts, setApts] = useState<Appointment[]>([]);
  const [curDate, setCurDate] = useState(new Date());
  const [selDay, setSelDay] = useState<string | null>(null);
  const [selApt, setSelApt] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isCalMinimized, setIsCalMinimized] = useState(false);
  const [slideDir, setSlideDir] = useState<'slide-left' | 'slide-right' | ''>('');
  const [showNew, setShowNew] = useState(false);
  const [showDay, setShowDay] = useState(false);
  const [showDet, setShowDet] = useState(false);
  
  const [eDate, setEDate] = useState('');
  const [eTime, setETime] = useState('');
  const [eType, setEType] = useState('');
  const [eStatus, setEStatus] = useState('null');
  const [eComplete, setEComplete] = useState(false);
  const [eNotes, setENotes] = useState('');
  const [eFn, setEFn] = useState('');
  const [eLn, setELn] = useState('');
  const [eEm, setEEm] = useState('');
  const [ePh, setEPh] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const monthNames = t('calendar.months') as unknown as string[];
  const weekdays = t('calendar.weekdays') as unknown as string[];
  const weekdaysShort = t('calendar.weekdays_short') as unknown as string[];

  const fetchApts = useCallback(async () => {
    try {
      const { bookings, error } = await fetchBookings(false);
      if (error) throw new Error(error);
      const b = (bookings || []).filter((x: any) => x.booking_accepted !== false);
      setApts(b.map((row: any, i: number) => {
        const dt = row.booking_date ? new Date(row.booking_date) : null;
        return {
          id: i + 1, booking_id_db: row.booking_id_db ?? null,
          first_name: row.first_name, last_name: row.last_name ?? '',
          e_mail: row.e_mail ?? '', phone_number: row.phone_number ?? '',
          type: row.type ?? '', booking_accepted: row.booking_accepted ?? null,
          notes: row.notes ?? '',
          patient: [row.first_name, row.last_name].filter(Boolean).join(' '),
          date: dt ? dt.toISOString().split('T')[0] : '',
          time: dt ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` : '',
          service: row.type ?? '—', 
          status: row.booking_accepted === true ? 'confirmed' : 'pending',
          appointment_complete: row.appointment_complete ?? false,
          profile_id: row.profile_id ?? null,
        };
      }));
    } catch { showToast(t('common.error'), 'error'); }
  }, [showToast, t]);

  useEffect(() => { 
    fetchApts(); 

    const channel = supabase
      .channel('calendar-booking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => fetchApts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApts]);

  const y = curDate.getFullYear(), m = curDate.getMonth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (showNew) {
      const initialDate = selDay || todayStr;
      setNewDate(initialDate);
      setIsCalMinimized(false);
      updateAvailableSlots(initialDate, 'new');
    }
  }, [showNew, selDay, todayStr]);

  useEffect(() => {
    if (editing && selApt) {
      setEDate(selApt.date);
      setETime(selApt.time);
      setEType(selApt.type || '');
      setEStatus(String(selApt.booking_accepted));
      setEComplete(selApt.appointment_complete);
      setENotes(selApt.notes || '');
      setEFn(selApt.first_name);
      setELn(selApt.last_name || '');
      setEEm(selApt.e_mail || '');
      setEPh(selApt.phone_number || '');
      setIsCalMinimized(true);
    }
  }, [editing, selApt]);

  const updateAvailableSlots = async (date: string, mode: 'new' | 'edit', ignoreId?: string) => {
    setIsLoadingSlots(true);
    const slots = await getAvailableSlots(date, ignoreId);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  };

  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const off = fd === 0 ? 6 : fd - 1;
  const pmd = new Date(y, m, 0).getDate();

  const ga = (ds: string) => apts.filter(a => a.date === ds);
  const dayApts = selDay ? ga(selDay).sort((a, b) => a.time.localeCompare(b.time)) : [];
  const fsd = selDay ? (() => { const [yy, mm, dd] = selDay.split('-'); return `${dd} ${monthNames[parseInt(mm) - 1]} ${yy}`; })() : '';

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selApt?.booking_id_db) return;
    if (!eFn || !eDate || !eTime) return;
    try {
      const res = await updateBooking(selApt.booking_id_db, { 
        first_name: eFn, 
        last_name: eLn || null, 
        e_mail: eEm || null, 
        phone_number: ePh || null, 
        booking_date: `${eDate}T${eTime}:00`, 
        type: eType || null, 
        booking_accepted: eStatus === 'true' ? true : eStatus === 'false' ? false : null, 
        appointment_complete: eComplete, 
        notes: eNotes 
      });
      if (!res.success) { showToast(res.error ?? t('common.error'), 'error'); return; }
      
      // Ensure patient profile if accepted
      if (eStatus === 'true') {
        await ensurePatientProfileForBooking({
          booking_id_db: selApt.booking_id_db,
          first_name: eFn,
          last_name: eLn,
          e_mail: eEm,
          phone_number: ePh,
          notes: eNotes
        });
      }

      showToast(t('calendar.update_success'), 'success'); setShowDet(false); setEditing(false); fetchApts();
    } catch { showToast(t('common.error'), 'error'); }
  };

  const { onTouchStart, onTouchEnd } = useSwipe({
    onSwipeLeft: () => changeMonth(1),
    onSwipeRight: () => changeMonth(-1),
  });

  const handleDel = async (a: Appointment) => {
    if (!a.booking_id_db) return;
    const ok = await confirm({ title: t('calendar.delete_confirm_title'), message: t('calendar.delete_confirm_msg').replace('{name}', a.patient) });
    if (!ok) return;
    try {
      const res = await deleteBooking(a.booking_id_db);
      if (!res.success) { showToast(res.error || t('common.error'), 'error'); return; }
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      showToast(t('calendar.delete_success'), 'success'); setShowDet(false); fetchApts();
    } catch { showToast(t('common.error'), 'error'); }
  };

  const changeMonth = (offset: number) => {
    const dir = offset > 0 ? 'slide-left' : 'slide-right';
    setSlideDir(dir);
    setIsAnimating(true);
    
    setTimeout(() => {
      setCurDate(new Date(y, m + offset, 1));
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDir('');
      }, 300);
    }, 50);
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header glass-panel">
        <div className="current-month">{monthNames[m]} {y}</div>
        <div className="calendar-actions">
          <button className="btn btn-ghost btn-icon" onClick={() => changeMonth(-1)}><i className="ph ph-caret-left" /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSlideDir(''); setCurDate(new Date()); }}>{t('calendar.today')}</button>
          <button className="btn btn-ghost btn-icon" onClick={() => changeMonth(1)}><i className="ph ph-caret-right" /></button>
        </div>
      </div>

      <div 
        className={`calendar-grid-container glass-panel ${isAnimating ? slideDir : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="weekday-header">
          {weekdays.map(d => <span key={d}>{d}</span>)}
        </div>
        <div className="days-grid">
          {Array.from({ length: off }, (_, i) => (
            <div key={`p${i}`} className="day-cell other-month"><span className="day-num">{pmd - off + 1 + i}</span></div>
          ))}
          {Array.from({ length: dim }, (_, i) => {
            const day = i + 1;
            const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const da = ga(ds); const lim = da.length > 3 ? 2 : 3; const disp = da.slice(0, lim); const rem = da.length - lim;
            return (
              <div key={ds} className={`day-cell${ds === todayStr ? ' today' : ''}`} onClick={() => { setSelDay(ds); setShowDay(true); }}>
                <span className="day-num">{day}</span>
                {da.length > 0 && (
                  <div className="events-container">
                    {disp.map(a => (
                      <div key={a.id} className={`event-item ${a.status.toLowerCase()}`}
                        onClick={e => { e.stopPropagation(); setSelApt(a); setEditing(false); setShowDet(true); }}>
                        <span className="event-time">{a.time}</span><span className="event-name">{a.patient}</span>
                      </div>
                    ))}
                    {rem > 0 && <div className="more-events" onClick={e => { e.stopPropagation(); setSelDay(ds); setShowDay(true); }}><i className="ph ph-plus-circle" /> {rem} {t('calendar.others')}</div>}
                  </div>
                )}
              </div>
            );
          })}
          {Array.from({ length: 42 - off - dim }, (_, i) => (
            <div key={`n${i}`} className="day-cell other-month"><span className="day-num">{i + 1}</span></div>
          ))}
        </div>
      </div>

      <Modal isOpen={showDay} onClose={() => setShowDay(false)}>
        <div className="schedule-header"><h2>{t('calendar.agenda_title')}</h2><p className="schedule-date">{fsd}</p></div>
        <div className="schedule-list">
          {dayApts.length > 0 ? dayApts.map(a => (
            <div key={a.id} className="schedule-item glass-panel" onClick={() => { setSelApt(a); setEditing(false); setShowDet(true); }}>
              <div className="schedule-time"><i className="ph ph-clock" /> {a.time}</div>
              <div className="schedule-patient"><div className="appt-initials-sm">{getInitials(a.patient)}</div><div><span className="sched-patient-name">{a.patient}</span><span className="service-name">{a.service}</span></div></div>
              <span className={`status-indicator ${a.status.toLowerCase()}`} />
            </div>
          )) : <div className="empty-schedule"><i className="ph ph-calendar-blank" /><p>{t('calendar.no_appointments')}</p></div>}
        </div>
        <button className="add-appt-btn btn btn-primary" onClick={() => setShowNew(true)}><i className="ph ph-plus" /> {t('calendar.new_appointment')}</button>
      </Modal>

      <Modal isOpen={showDet} onClose={() => { setShowDet(false); setEditing(false); }}>
        {selApt && !editing ? (
          <>
            <div className="modal-header"><div className="appt-initials-lg">{getInitials(selApt.patient)}</div><div><h2>{selApt.patient}</h2><p className="service-tag">{selApt.service}</p></div></div>
            <div className="modal-info">
              <div className="info-item"><i className="ph ph-calendar" /><span>{selApt.date}</span></div>
              <div className="info-item"><i className="ph ph-clock" /><span>{selApt.time}</span></div>
              <div className="info-item"><i className="ph ph-tag" /><span className={`status-pill ${selApt.status.toLowerCase()}`}>{t(`calendar.status_${selApt.status.toLowerCase()}`)}</span></div>
              <div className="info-item"><i className="ph ph-envelope" /><span>{selApt.e_mail || '—'}</span></div>
              <div className="info-item"><i className="ph ph-phone" /><span>{formatPhoneNumber(selApt.phone_number)}</span></div>
              <div className="info-item"><i className="ph ph-stethoscope" /><span>{selApt.type || '—'}</span></div>
            </div>
            {selApt.notes && <div className="modal-notes"><div className="notes-label"><i className="ph ph-note" /> {t('booking.notes')}</div><p>{selApt.notes}</p></div>}
            <div className="modal-footer">
              {selApt.profile_id && (
                <button className="btn btn-ghost" onClick={() => navigate(`/profile/${selApt.profile_id}`)}>
                  <i className="ph ph-user" /> {t('calendar.go_to_profile')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setEditing(true)}>{t('calendar.edit_title')}</button>
              <button className="btn btn-secondary" onClick={() => setShowDet(false)}>{t('common.cancel')}</button>
            </div>
          </>
        ) : selApt && editing ? (
          <>
            <div className="appt-form-header"><div className="appt-form-icon"><i className="ph ph-pencil-simple" /></div><div><h2>{t('calendar.edit_title')}</h2><p>{t('calendar.update_data')} <strong>{selApt.patient}</strong>.</p></div></div>
            <form onSubmit={handleEditSubmit}>
              <div className="appt-form-grid">
                <div className="appt-form-group"><label>{t('calendar.first_name')} *</label><input value={eFn} onChange={e => setEFn(e.target.value)} required /></div>
                <div className="appt-form-group"><label>{t('calendar.last_name')}</label><input value={eLn} onChange={e => setELn(e.target.value)} /></div>
                <div className="appt-form-group"><label>{t('calendar.email')}</label><input type="email" value={eEm} onChange={e => setEEm(e.target.value)} /></div>
                <div className="appt-form-group"><label>{t('calendar.phone')}</label><input type="tel" value={ePh} onChange={e => setEPh(e.target.value)} /></div>
                
                <BookingFields 
                  date={eDate} setDate={setEDate}
                  time={eTime} setTime={setETime}
                  type={eType} setType={setEType}
                  notes={eNotes} setNotes={setENotes}
                  ignoreBookingId={selApt.booking_id_db || undefined}
                >
                  <div className="appt-form-group span-2"><label>{t('calendar.status')}</label><select value={eStatus} onChange={e => setEStatus(e.target.value)}><option value="null">{t('calendar.status_pending')}</option><option value="true">{t('calendar.status_accepted')}</option><option value="false">{t('calendar.status_rejected')}</option></select></div>
                  <div className="appt-form-group span-2">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={eComplete} onChange={e => setEComplete(e.target.checked)} />
                      <span className="slider"></span>
                      <span className="toggle-label">{t('calendar.visit_completed')}</span>
                    </label>
                  </div>
                </BookingFields>
              </div>
              <div className="appt-form-actions">
                <button type="button" className="btn btn-ghost text-danger" onClick={() => handleDel(selApt)}><i className="ph ph-trash" /> {t('common.delete')}</button>
                <div className="appt-form-btns"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</button><button type="submit" className="btn btn-primary"><i className="ph ph-floppy-disk" /> {t('common.save')}</button></div>
              </div>
            </form>
          </>
        ) : null}
      </Modal>

      <BookingModal 
        isOpen={showNew} 
        onClose={() => setShowNew(false)}
        initialDate={selDay || todayStr}
        onSuccess={fetchApts}
      />
    </div>
  );
}
