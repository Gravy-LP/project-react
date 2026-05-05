import { Router } from 'express';
import { supabase } from '../utils/supabase.js';
import { resolveContactProfile } from '../utils/contact_profile.js';
import crypto from 'crypto';

const router = Router();

// ── DELETE: remove a booking permanently or mark as deleted ─────────────────
router.delete('/', async (req, res) => {
  const bookingId = req.query.id as string;
  const permanent = req.query.permanent === 'true';

  if (!bookingId) {
    return res.status(400).json({ error: 'Query param ?id= (UUID) is required.' });
  }

  if (permanent) {
    // 1. Get the booking to find its profile_id
    const { data: booking } = await supabase
      .from('Booking')
      .select('profile_id')
      .eq('booking_id_db', bookingId)
      .single();

    // 2. Remove this booking ID from the associated PatientProfile
    if (booking?.profile_id) {
      const { data: profile } = await supabase
        .from('PatientProfile')
        .select('booking_ids')
        .eq('id', booking.profile_id)
        .single();

      if (profile?.booking_ids) {
        const updatedIds = profile.booking_ids.filter((id: string) => id !== bookingId);
        await supabase
          .from('PatientProfile')
          .update({ booking_ids: updatedIds })
          .eq('id', booking.profile_id);
      }
    }

    const { error } = await supabase
      .from('Booking')
      .delete()
      .eq('booking_id_db', bookingId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: 'Booking permanently deleted.' });
  } else {
    // Attempt soft delete
    const { error } = await supabase
      .from('Booking')
      .update({ is_deleted: true })
      .eq('booking_id_db', bookingId);

    if (error) {
      // Fallback: If is_deleted column is missing, perform permanent delete
      if (error.message.includes('column') || error.message.includes('is_deleted')) {
        console.warn(`[Supabase] is_deleted column missing, falling back to permanent delete for ID: ${bookingId}`);
        const { error: delError } = await supabase
          .from('Booking')
          .delete()
          .eq('booking_id_db', bookingId);
        
        if (delError) return res.status(500).json({ error: delError.message });
        return res.json({ success: true, message: 'Booking permanently deleted (fallback).' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, message: 'Booking moved to bin.' });
  }
});

// ── GET: fetch deleted bookings (Bin) ────────────────────────────────────────
router.get('/bin', async (req, res) => {
  const { data, error } = await supabase
    .from('Booking')
    .select('*')
    .eq('is_deleted', true)
    .order('booking_date', { ascending: false });

  if (error) {
    if (error.message.includes('column') || error.message.includes('is_deleted')) {
      console.warn('[Supabase] is_deleted column missing, returning empty bin');
      return res.json({ bookings: [] });
    }
    return res.status(500).json({ error: error.message });
  }
  return res.json({ bookings: data });
});

// ── DELETE: empty the bin ────────────────────────────────────────────────────
router.delete('/bin', async (req, res) => {
  const { error } = await supabase
    .from('Booking')
    .delete()
    .eq('is_deleted', true);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, message: 'Bin emptied successfully.' });
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
    if (error.message.includes('column') || error.message.includes('not found')) {
      return res.status(500).json({ 
        error: 'Errore Database: Possibile mancanza di colonne. Hai eseguito la migrazione SQL?',
        details: error.message 
      });
    }
    return res.status(500).json({ error: error.message });
  }

  // ── Auto-upsert PatientProfile on creation if already approved ─────────────
  if (booking_accepted === true && data) {
    try {
      await resolveContactProfile({
        first_name:   data.first_name,
        last_name:    data.last_name    ?? null,
        e_mail:       data.e_mail       ?? null,
        phone_number: data.phone_number ?? null,
        booking_id:   data.booking_id_db,
      });
    } catch (profileErr) {
      console.error('[PatientProfile] Error during profile resolution on POST:', profileErr);
    }
  }

  console.log(`[Booking] Created: ${data.first_name} ${data.last_name || ''} (${data.booking_id_db})`);

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
  if ('appointment_complete' in body) updateData.appointment_complete = body.appointment_complete;
  if ('is_deleted' in body) updateData.is_deleted = body.is_deleted;

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
    if (error.message.includes('column') || error.message.includes('appointment_complete') || error.message.includes('is_deleted')) {
      return res.status(500).json({ 
        error: 'Errore Database: Colonne mancanti. Esegui la migrazione SQL.',
        details: error.message 
      });
    }
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

  const performQuery = async (withBinFilter: boolean) => {
    let q = supabase
      .from('Booking')
      .select('*')
      .order('booking_date', { ascending: true });

    if (withBinFilter) {
      q = q.not('is_deleted', 'eq', true);
    }

    if (incomingOnly) {
      q = q.or('booking_accepted.is.null,booking_accepted.eq.false');
    }

    if (searchQuery) {
      const cleanSearch = searchQuery.trim();
      if (cleanSearch) {
        q = q.or(`first_name.ilike.%${cleanSearch}%,last_name.ilike.%${cleanSearch}%,e_mail.ilike.%${cleanSearch}%,phone_number.ilike.%${cleanSearch}%`);
      }
    }
    return await q;
  };

  let { data, error } = await performQuery(true);

  // Fallback: If is_deleted column is missing, try without the filter
  if (error && error.message.includes('is_deleted')) {
    console.warn('[Supabase] is_deleted column missing, falling back to unfiltered query');
    const retry = await performQuery(false);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ bookings: data });
});

export default router;
