import { Router } from 'express';
import { supabase } from '../utils/supabase.js';
import { resolveContactProfile } from '../utils/contact_profile.js';
import crypto from 'crypto';

const router = Router();

// ── DELETE: remove a booking by booking_id_db (?id=<uuid>) ───────────────────
router.delete('/', async (req, res) => {
  const bookingId = req.query.id as string;
  if (!bookingId) {
    return res.status(400).json({ error: 'Query param ?id= (UUID) is required for deletion.' });
  }

  const { error } = await supabase
    .from('Booking')
    .delete()
    .eq('booking_id_db', bookingId);

  if (error) {
    console.error('[Supabase] Delete error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, message: 'Booking deleted successfully.' });
});

// ── POST: create a new booking ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  const body = req.body;

  const { first_name, last_name, e_mail, phone_number, booking_date, type, booking_accepted, notes } = body;

  if (!first_name) {
    return res.status(400).json({ error: 'Il nome del paziente è obbligatorio.' });
  }

  const booking_id_db = crypto.randomUUID();

  const { data, error } = await supabase
    .from('Booking')
    .insert([{
      booking_id_db,
      first_name,
      last_name:        last_name        ?? null,
      e_mail:           e_mail           ?? null,
      phone_number:     phone_number     ?? null,
      booking_date:     booking_date ? new Date(booking_date as string).toISOString() : null,
      type:             type             ?? null,
      booking_accepted: booking_accepted ?? null,
      notes:            notes            ?? null,
    }])
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ success: true, booking: data });
});

// ── PATCH: update a booking by booking_id_db (?id=<uuid>) ───────────────────
router.patch('/', async (req, res) => {
  const bookingId = req.query.id as string;
  if (!bookingId) {
    return res.status(400).json({ error: 'Query param ?id= (UUID) is required.' });
  }

  const body = req.body;

  const updateData: Record<string, any> = {};

  if ('first_name' in body) updateData.first_name = body.first_name;
  if ('last_name' in body) updateData.last_name = body.last_name;
  if ('e_mail' in body) updateData.e_mail = body.e_mail;
  if ('phone_number' in body) updateData.phone_number = body.phone_number;
  if ('booking_date' in body) {
    updateData.booking_date = body.booking_date ? new Date(body.booking_date as string).toISOString() : null;
  }
  if ('type' in body) updateData.type = body.type;
  if ('booking_accepted' in body) updateData.booking_accepted = body.booking_accepted;
  if ('notes' in body) updateData.notes = body.notes;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "Nessun dato fornito per l'aggiornamento." });
  }

  const { data, error } = await supabase
    .from('Booking')
    .update(updateData)
    .eq('booking_id_db', bookingId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Update error:', error);
    return res.status(500).json({ error: error.message });
  }

  // ── Auto-upsert PatientProfile on approval ─────────────────────────────────
  if (body.booking_accepted === true && data) {
    const { first_name, last_name, e_mail, phone_number, booking_id_db } = data;

    try {
      const resolution = await resolveContactProfile({
        first_name,
        last_name:    last_name    ?? null,
        e_mail:       e_mail       ?? null,
        phone_number: phone_number ?? null,
        booking_id:   booking_id_db,
      });

      console.log(`[PatientProfile] action=${resolution.action} profile=${resolution.profile.id}`);
      if (resolution.action === 'merged') {
        console.log(`[PatientProfile] Removed duplicate profile ${resolution.mergedId}`);
      }
    } catch (profileErr) {
      // Non-blocking: booking approval already succeeded
      console.error('[PatientProfile] Unexpected error during profile resolution:', profileErr);
    }
  }

  return res.json({ success: true, booking: data });
});

// ── GET: fetch all bookings ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const incomingOnly = req.query.incoming === 'true';
  const searchQuery = req.query.search as string | undefined;

  let query = supabase
    .from('Booking')
    .select('*')
    .order('booking_date', { ascending: true });

  if (incomingOnly) {
    query = query.or('booking_accepted.is.null,booking_accepted.eq.false');
  }

  if (searchQuery) {
    const cleanSearch = searchQuery.trim();
    if (cleanSearch) {
      query = query.or(`first_name.ilike.%${cleanSearch}%,last_name.ilike.%${cleanSearch}%,e_mail.ilike.%${cleanSearch}%,phone_number.ilike.%${cleanSearch}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ bookings: data });
});

export default router;
