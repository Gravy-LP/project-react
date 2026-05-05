import { Router } from 'express';
import { supabase } from '../utils/supabase.js';

const router = Router();

// ── GET: fetch all patient profiles ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const searchQuery = req.query.search as string | undefined;
  const profileId   = req.query.id as string | undefined;

  // Single-profile lookup (used when navigating via booking → profile)
  if (profileId) {
    const { data, error } = await supabase
      .from('PatientProfile')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
    return res.json({ patient: data });
  }

  let query = supabase
    .from('PatientProfile')
    .select('*')
    .order('created_at', { ascending: false });

  if (searchQuery) {
    const clean = searchQuery.trim();
    if (clean) {
      query = query.or(
        `first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,e_mail.ilike.%${clean}%,phone_number.ilike.%${clean}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ patients: data });
});

// ── PATCH: update a patient profile by id (?id=<uuid>) ──────────────────────
router.patch('/', async (req, res) => {
  const patientId = req.query.id as string;
  if (!patientId) {
    return res.status(400).json({ error: 'Query param ?id= (UUID) is required.' });
  }

  const body = req.body;

  // Only allow updating contact/name fields — never id or booking_ids directly
  const allowed = ['first_name', 'last_name', 'e_mail', 'phone_number'] as const;
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key] ?? null;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided.' });
  }

  const { data, error } = await supabase
    .from('PatientProfile')
    .update(updateData)
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] PatientProfile update error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, patient: data });
});

// ── DELETE: remove a patient profile by id (?id=<uuid>) ─────────────────────
router.delete('/', async (req, res) => {
  const patientId = req.query.id as string;
  if (!patientId) {
    return res.status(400).json({ error: 'Query param ?id= (UUID) is required.' });
  }

  const { error } = await supabase
    .from('PatientProfile')
    .delete()
    .eq('id', patientId);

  if (error) {
    console.error('[Supabase] PatientProfile delete error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, message: 'Patient profile deleted.' });
});

export default router;
