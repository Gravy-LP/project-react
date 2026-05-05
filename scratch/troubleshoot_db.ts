import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function troubleshoot() {
  console.log('--- Database Troubleshooting Script ---');
  
  // 1. Check if Booking table exists and has columns
  const { data: bData, error: bErr } = await supabase.from('Booking').select('*').limit(1);
  if (bErr) {
    console.error('Booking Table Error:', bErr.message);
  } else {
    console.log('Booking Table: OK');
  }

  // 2. Check PatientProfile
  const { data: pData, error: pErr } = await supabase.from('PatientProfile').select('*').limit(1);
  if (pErr) {
    console.error('PatientProfile Table Error:', pErr.message);
  } else {
    console.log('PatientProfile Table: OK');
  }

  // 3. Create a test patient and appointments
  const pid = crypto.randomUUID();
  const bid_pending = crypto.randomUUID();
  const bid_confirmed = crypto.randomUUID();
  const bid_completed = crypto.randomUUID();
  const bid_rejected = crypto.randomUUID();
  const bid_deleted = crypto.randomUUID();

  console.log('\nCreating Test Patient: Mario Troubleshoot...');
  
  // Create Patient Profile
  const { data: patient, error: pCreateErr } = await supabase.from('PatientProfile').insert([{
    first_name: 'Mario',
    last_name: 'Troubleshoot',
    e_mail: 'mario.test@example.com',
    phone_number: '+39 000 111 222',
    date_of_birth: '1985-05-15',
    notes: 'Paziente di test per troubleshooting.',
    booking_ids: []
  }]).select().single();

  if (pCreateErr) {
    console.error('Failed to create patient profile:', pCreateErr.message);
    return;
  }
  console.log('Patient Profile Created:', patient.id);

  const bookings = [
    { id: bid_pending, status: 'Pending', accepted: null, complete: false, deleted: false, date: '2026-07-01T10:00:00' },
    { id: bid_confirmed, status: 'Confirmed', accepted: true, complete: false, deleted: false, date: '2026-07-02T11:00:00' },
    { id: bid_completed, status: 'Completed', accepted: true, complete: true, deleted: false, date: '2026-05-01T09:00:00' },
    { id: bid_rejected, status: 'Rejected', accepted: false, complete: false, deleted: false, date: '2026-07-03T12:00:00' },
    { id: bid_deleted, status: 'Deleted (Bin)', accepted: true, complete: false, deleted: true, date: '2026-07-04T13:00:00' },
  ];

  for (const b of bookings) {
    console.log(`Creating Booking: ${b.status}...`);
    const payload: any = {
      booking_id_db: b.id,
      first_name: 'Mario',
      last_name: 'Troubleshoot',
      e_mail: 'mario.test@example.com',
      phone_number: '+39 000 111 222',
      booking_date: b.date,
      type: 'Visita',
      booking_accepted: b.accepted,
      notes: `Test Booking: ${b.status}`
    };

    // Only add new columns if they exist? 
    // We try to add them, if it fails, we know for sure.
    payload.appointment_complete = b.complete;
    payload.is_deleted = b.deleted;

    const { error: bCreateErr } = await supabase.from('Booking').insert([payload]);
    if (bCreateErr) {
      console.error(`Failed to create ${b.status} booking:`, bCreateErr.message);
    } else {
      console.log(`${b.status} Booking Created.`);
    }
  }

  console.log('\n--- Troubleshooting Complete ---');
}

troubleshoot();
