import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import '../styles/calendar.css';
import '../styles/modal.css';

interface Appointment {
  id: number;
  booking_id_db: string | null;
  first_name: string;
  last_name: string;
  e_mail: string;
  phone_number: string;
  type: string;
  booking_accepted: boolean | null;
  notes: string;
  patient: string;
  date: string;
  time: string;
  service: string;
  status: string;
}

const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
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

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

export default function Calendar() {
  const [apts, setApts] = useState<Appointment[]>([]);
  const [curDate, setCurDate] = useState(new Date());
  const [selDay, setSelDay] = useState<string | null>(null);
  const [selApt, setSelApt] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDay, setShowDay] = useState(false);
  const [showDet, setShowDet] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchApts = useCallback(async () => {
    try {
      const r = await fetch('/api/bookings');
      const j = await r.json();
      const b = (j.bookings || []).filter((x: any) => x.booking_accepted === true);
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
          time: dt ? `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '',
          service: row.type ?? '—', status: 'Confirmed',
        };
      }));
    } catch { showToast('Errore caricamento', 'error'); }
  }, [showToast]);

  useEffect(() => { fetchApts(); }, [fetchApts]);

  const y = curDate.getFullYear(), m = curDate.getMonth();
  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const off = fd === 0 ? 6 : fd - 1;
  const pmd = new Date(y, m, 0).getDate();
  const t = new Date();
  const ts = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;

  const ga = (ds: string) => apts.filter(a => a.date === ds);
  const dayApts = selDay ? ga(selDay).sort((a,b) => a.time.localeCompare(b.time)) : [];
  const fsd = selDay ? (() => { const [yy,mm,dd] = selDay.split('-'); return `${dd} ${monthNames[parseInt(mm)-1]} ${yy}`; })() : '';

  const handleNewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const gv = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.value?.trim() || '';
    const fn = gv('firstName'), ln = gv('lastName')||null, em = gv('email')||null;
    const ph = gv('phone')||null, d = gv('date'), ti = gv('time');
    const tp = (f.elements.namedItem('type') as HTMLSelectElement)?.value||null;
    const nt = (f.elements.namedItem('notes') as HTMLTextAreaElement)?.value?.trim()||null;
    if (!fn||!d||!ti) return;
    try {
      const r = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({first_name:fn,last_name:ln,e_mail:em,phone_number:ph,booking_date:`${d}T${ti}:00`,type:tp,notes:nt,booking_accepted:true})});
      if (!r.ok) { const j=await r.json(); showToast(j.error??'Errore','error'); return; }
      showToast(`Appuntamento salvato!`,'success'); setShowNew(false); fetchApts();
    } catch { showToast('Errore di rete','error'); }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selApt?.booking_id_db) return;
    const f = e.currentTarget;
    const gv = (n: string) => (f.elements.namedItem(n) as HTMLInputElement)?.value?.trim() || '';
    const fn=gv('eFn'), ln=gv('eLn')||null, em=gv('eEm')||null, ph=gv('ePh')||null;
    const d=gv('eDt'), ti=gv('eTm');
    const tp=(f.elements.namedItem('eTp') as HTMLSelectElement)?.value||null;
    const nt=(f.elements.namedItem('eNt') as HTMLTextAreaElement)?.value?.trim()||null;
    const av=(f.elements.namedItem('eAc') as HTMLSelectElement)?.value;
    const ba = av==='true'?true:av==='false'?false:null;
    if (!fn||!d||!ti) return;
    try {
      const r = await fetch(`/api/bookings?id=${encodeURIComponent(selApt.booking_id_db)}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({first_name:fn,last_name:ln,e_mail:em,phone_number:ph,booking_date:`${d}T${ti}:00`,type:tp,booking_accepted:ba,notes:nt})});
      if (!r.ok) { const j=await r.json(); showToast(j.error??'Errore','error'); return; }
      showToast('Aggiornato!','success'); setShowDet(false); setEditing(false); fetchApts();
    } catch { showToast('Errore di rete','error'); }
  };

  const handleDel = async (a: Appointment) => {
    if (!a.booking_id_db) return;
    const ok = await confirm({title:'Elimina?',message:`Eliminare l'appuntamento di ${a.patient}?`});
    if (!ok) return;
    try {
      const r = await fetch(`/api/bookings?id=${encodeURIComponent(a.booking_id_db)}`,{method:'DELETE'});
      if (!r.ok) { showToast('Errore','error'); return; }
      showToast('Eliminato!','success'); setShowDet(false); fetchApts();
    } catch { showToast('Errore di rete','error'); }
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header glass-panel">
        <div className="current-month">{monthNames[m]} {y}</div>
        <div className="calendar-actions">
          <button className="cal-nav-btn" onClick={()=>setCurDate(new Date(y,m-1,1))}><i className="ph ph-caret-left"/></button>
          <button className="today-btn" onClick={()=>setCurDate(new Date())}>Oggi</button>
          <button className="cal-nav-btn" onClick={()=>setCurDate(new Date(y,m+1,1))}><i className="ph ph-caret-right"/></button>
        </div>
      </div>

      <div className="calendar-grid-container glass-panel">
        <div className="weekday-header">
          {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d=><span key={d}>{d}</span>)}
        </div>
        <div className="days-grid">
          {Array.from({length:off},(_,i)=>(
            <div key={`p${i}`} className="day-cell other-month"><span className="day-num">{pmd-off+1+i}</span></div>
          ))}
          {Array.from({length:dim},(_,i)=>{
            const day=i+1;
            const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const da=ga(ds); const lim=da.length>3?2:3; const disp=da.slice(0,lim); const rem=da.length-lim;
            return (
              <div key={ds} className={`day-cell${ds===ts?' today':''}`} onClick={()=>{setSelDay(ds);setShowDay(true);}}>
                <span className="day-num">{day}</span>
                {da.length>0&&(
                  <div className="events-container">
                    {disp.map(a=>(
                      <div key={a.id} className={`event-item ${a.status.toLowerCase()}`}
                        onClick={e=>{e.stopPropagation();setSelApt(a);setEditing(false);setShowDet(true);}}>
                        <span className="event-time">{a.time}</span><span className="event-name">{a.patient}</span>
                      </div>
                    ))}
                    {rem>0&&<div className="more-events" onClick={e=>{e.stopPropagation();setSelDay(ds);setShowDay(true);}}><i className="ph ph-plus-circle"/> {rem} altri</div>}
                  </div>
                )}
              </div>
            );
          })}
          {Array.from({length:42-off-dim},(_,i)=>(
            <div key={`n${i}`} className="day-cell other-month"><span className="day-num">{i+1}</span></div>
          ))}
        </div>
      </div>

      {/* Day Schedule */}
      <Modal isOpen={showDay} onClose={()=>setShowDay(false)}>
        <div className="schedule-header"><h2>Agenda del Giorno</h2><p className="schedule-date">{fsd}</p></div>
        <div className="schedule-list">
          {dayApts.length>0?dayApts.map(a=>(
            <div key={a.id} className="schedule-item glass-panel" onClick={()=>{setSelApt(a);setEditing(false);setShowDet(true);}}>
              <div className="schedule-time"><i className="ph ph-clock"/> {a.time}</div>
              <div className="schedule-patient"><div className="appt-initials-sm">{getInitials(a.patient)}</div><div><span className="sched-patient-name">{a.patient}</span><span className="service-name">{a.service}</span></div></div>
              <span className={`status-indicator ${a.status.toLowerCase()}`}/>
            </div>
          )):<div className="empty-schedule"><i className="ph ph-calendar-blank"/><p>Nessun appuntamento</p></div>}
        </div>
        <button className="add-appt-btn btn btn-primary" onClick={()=>setShowNew(true)}><i className="ph ph-plus"/> Nuovo Appuntamento</button>
      </Modal>

      {/* Detail / Edit */}
      <Modal isOpen={showDet} onClose={()=>{setShowDet(false);setEditing(false);}}>
        {selApt&&!editing?(
          <>
            <div className="modal-header"><div className="appt-initials-lg">{getInitials(selApt.patient)}</div><div><h2>{selApt.patient}</h2><p className="service-tag">{selApt.service}</p></div></div>
            <div className="modal-info">
              <div className="info-item"><i className="ph ph-calendar"/><span>{selApt.date}</span></div>
              <div className="info-item"><i className="ph ph-clock"/><span>{selApt.time}</span></div>
              <div className="info-item"><i className="ph ph-tag"/><span className={`status-pill ${selApt.status.toLowerCase()}`}>{selApt.status}</span></div>
              <div className="info-item"><i className="ph ph-envelope"/><span>{selApt.e_mail||'—'}</span></div>
              <div className="info-item"><i className="ph ph-phone"/><span>{selApt.phone_number||'—'}</span></div>
              <div className="info-item"><i className="ph ph-stethoscope"/><span>{selApt.type||'—'}</span></div>
            </div>
            {selApt.notes&&<div className="modal-notes"><div className="notes-label"><i className="ph ph-note"/> Note</div><p>{selApt.notes}</p></div>}
            <div className="modal-footer"><button className="btn btn-primary" onClick={()=>setEditing(true)}>Modifica</button><button className="btn btn-secondary" onClick={()=>setShowDet(false)}>Chiudi</button></div>
          </>
        ):selApt&&editing?(
          <>
            <div className="appt-form-header"><div className="appt-form-icon"><i className="ph ph-pencil-simple"/></div><div><h2>Modifica</h2><p>Aggiorna i dati di <strong>{selApt.patient}</strong>.</p></div></div>
            <form onSubmit={handleEditSubmit}>
              <div className="appt-form-grid">
                <div className="appt-form-group"><label>Nome *</label><input name="eFn" defaultValue={selApt.first_name} required/></div>
                <div className="appt-form-group"><label>Cognome</label><input name="eLn" defaultValue={selApt.last_name}/></div>
                <div className="appt-form-group"><label>Email</label><input name="eEm" type="email" defaultValue={selApt.e_mail}/></div>
                <div className="appt-form-group"><label>Telefono</label><input name="ePh" type="tel" defaultValue={selApt.phone_number}/></div>
                <div className="appt-form-group"><label>Data *</label><input name="eDt" type="date" defaultValue={selApt.date} required/></div>
                <div className="appt-form-group"><label>Orario *</label><input name="eTm" type="time" defaultValue={selApt.time} required/></div>
                <div className="appt-form-group span-2"><label>Tipo</label><select name="eTp" defaultValue={selApt.type}>{serviceOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div className="appt-form-group span-2"><label>Stato</label><select name="eAc" defaultValue={String(selApt.booking_accepted)}><option value="null">In attesa</option><option value="true">Accettato</option><option value="false">Rifiutato</option></select></div>
                <div className="appt-form-group span-2"><label>Note</label><textarea name="eNt" rows={3} defaultValue={selApt.notes}/></div>
              </div>
              <div className="appt-form-actions">
                <button type="button" className="btn btn-ghost text-danger" onClick={()=>handleDel(selApt)}><i className="ph ph-trash"/> Elimina</button>
                <div className="appt-form-btns"><button type="button" className="btn btn-ghost" onClick={()=>setEditing(false)}>Annulla</button><button type="submit" className="btn btn-primary"><i className="ph ph-floppy-disk"/> Salva</button></div>
              </div>
            </form>
          </>
        ):null}
      </Modal>

      {/* New */}
      <Modal isOpen={showNew} onClose={()=>setShowNew(false)}>
        <div className="appt-form-header"><div className="appt-form-icon"><i className="ph ph-calendar-plus"/></div><div><h2>Nuovo Appuntamento</h2><p>Compila i campi per registrare.</p></div></div>
        <form onSubmit={handleNewSubmit}>
          <div className="appt-form-grid">
            <div className="appt-form-group"><label>Nome *</label><input name="firstName" placeholder="es. Mario" required/></div>
            <div className="appt-form-group"><label>Cognome</label><input name="lastName" placeholder="es. Rossi"/></div>
            <div className="appt-form-group"><label>Email</label><input name="email" type="email" placeholder="mario@esempio.it"/></div>
            <div className="appt-form-group"><label>Telefono</label><input name="phone" type="tel" placeholder="+39 333 ..."/></div>
            <div className="appt-form-group"><label>Data *</label><input name="date" type="date" defaultValue={selDay||''} required/></div>
            <div className="appt-form-group"><label>Orario *</label><input name="time" type="time" required/></div>
            <div className="appt-form-group span-2"><label>Tipo</label><select name="type">{serviceOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="appt-form-group span-2"><label>Note</label><textarea name="notes" rows={3} placeholder="Info aggiuntive..."/></div>
          </div>
          <div className="appt-form-actions">
            <span className="required-hint"><span className="required-star">*</span> obbligatori</span>
            <div className="appt-form-btns"><button type="button" className="btn btn-ghost" onClick={()=>setShowNew(false)}>Annulla</button><button type="submit" className="btn btn-primary"><i className="ph ph-check"/> Salva</button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
