/**
 * contact_profile.ts
 *
 * Server-side utility for resolving / merging PatientProfiles.
 *
 * Matching strategy (called every time a booking is approved):
 *
 *  ┌─ email match? ─┬─ phone match? ─┬─ result ─────────────────────────────────────────┐
 *  │  yes           │  yes           │  same UUID  → link booking to that profile        │
 *  │  yes           │  yes           │  diff UUID  → merge both into the older one       │
 *  │  yes           │  no / absent   │  link booking to the email-matched profile         │
 *  │  no / absent   │  yes           │  link booking to the phone-matched profile         │
 *  │  no            │  no            │  create a brand-new profile                        │
 *  └────────────────┴────────────────┴──────────────────────────────────────────────────┘
 *
 * The PatientProfile table is expected to have:
 *   id            uuid  PK (auto-generated)
 *   first_name    text
 *   last_name     text | null
 *   e_mail        text | null
 *   phone_number  text | null
 *   booking_ids   text[] | null   ← array of booking_id_db UUIDs
 *   created_at    timestamptz (auto)
 */

import { supabase } from './supabase.js';

export interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  e_mail: string | null;
  phone_number: string | null;
  booking_ids: string[] | null;
  created_at: string;
}

export interface ContactInfo {
  first_name: string;
  last_name?: string | null;
  e_mail?: string | null;
  phone_number?: string | null;
  booking_id: string; // The UUID of the booking being approved
}

type ProfileResolution =
  | { action: 'linked';   profile: PatientProfile }
  | { action: 'merged';   profile: PatientProfile; mergedId: string }
  | { action: 'created';  profile: PatientProfile };

/**
 * Adds a booking UUID to a profile's booking_ids array (no-op if already present).
 */
async function appendBookingId(profileId: string, bookingId: string, current: string[]): Promise<void> {
  if (current.includes(bookingId)) return;
  const updated = [...current, bookingId];
  const { error } = await supabase
    .from('PatientProfile')
    .update({ booking_ids: updated })
    .eq('id', profileId);
  if (error) throw new Error(`[contact_profile] appendBookingId failed: ${error.message}`);
}

/**
 * Merges `source` into `target`:
 *  - Combines booking_ids arrays (deduped)
 *  - Fills in missing contact fields on target
 *  - Deletes the source profile
 */
async function mergeProfiles(
  target: PatientProfile,
  source: PatientProfile,
  newBookingId: string,
): Promise<PatientProfile> {
  const mergedBookingIds = Array.from(
    new Set([...(target.booking_ids ?? []), ...(source.booking_ids ?? []), newBookingId]),
  );

  // Fill missing fields from source if target lacks them
  const updatePayload: Record<string, unknown> = {
    booking_ids: mergedBookingIds,
  };
  if (!target.e_mail && source.e_mail)       updatePayload.e_mail       = source.e_mail;
  if (!target.phone_number && source.phone_number) updatePayload.phone_number = source.phone_number;
  if (!target.last_name && source.last_name) updatePayload.last_name    = source.last_name;

  const { data: updatedTarget, error: updateErr } = await supabase
    .from('PatientProfile')
    .update(updatePayload)
    .eq('id', target.id)
    .select()
    .single();

  if (updateErr) throw new Error(`[contact_profile] merge update failed: ${updateErr.message}`);

  // Delete the now-redundant source profile
  const { error: deleteErr } = await supabase
    .from('PatientProfile')
    .delete()
    .eq('id', source.id);

  if (deleteErr) {
    console.warn(`[contact_profile] Could not delete merged source profile ${source.id}: ${deleteErr.message}`);
  } else {
    console.log(`[contact_profile] Merged profile ${source.id} → ${target.id}, deleted source.`);
  }

  return updatedTarget as PatientProfile;
}

/**
 * Main entry-point.
 *
 * Given the contact information from an approved booking, finds the correct
 * PatientProfile (creating or merging as needed) and links the booking UUID to it.
 *
 * @returns A description of the action taken plus the final profile.
 */
export async function resolveContactProfile(info: ContactInfo): Promise<ProfileResolution> {
  const { first_name, last_name, e_mail, phone_number, booking_id } = info;

  // ── 1. Look up profiles by email and phone independently ──────────────────
  let emailProfile: PatientProfile | null = null;
  let phoneProfile: PatientProfile | null = null;

  if (e_mail) {
    const { data } = await supabase
      .from('PatientProfile')
      .select('*')
      .eq('e_mail', e_mail)
      .limit(1)
      .maybeSingle();
    emailProfile = (data as PatientProfile) ?? null;
  }

  if (phone_number) {
    const { data } = await supabase
      .from('PatientProfile')
      .select('*')
      .eq('phone_number', phone_number)
      .limit(1)
      .maybeSingle();
    phoneProfile = (data as PatientProfile) ?? null;
  }

  // ── 2. Resolve matching results ────────────────────────────────────────────

  // Case A: Both email and phone found a profile
  if (emailProfile && phoneProfile) {
    if (emailProfile.id === phoneProfile.id) {
      // Same profile — just link the booking
      console.log(`[contact_profile] Email & phone both match same profile ${emailProfile.id}. Linking booking.`);
      await appendBookingId(emailProfile.id, booking_id, emailProfile.booking_ids ?? []);
      return { action: 'linked', profile: { ...emailProfile, booking_ids: [...(emailProfile.booking_ids ?? []), booking_id] } };
    } else {
      // Different profiles — merge. Keep the older one (lower created_at) as target.
      const [olderProfile, newerProfile] =
        new Date(emailProfile.created_at) <= new Date(phoneProfile.created_at)
          ? [emailProfile, phoneProfile]
          : [phoneProfile, emailProfile];

      console.log(`[contact_profile] Email matches ${emailProfile.id}, phone matches ${phoneProfile.id}. Merging ${newerProfile.id} → ${olderProfile.id}.`);
      const merged = await mergeProfiles(olderProfile, newerProfile, booking_id);
      return { action: 'merged', profile: merged, mergedId: newerProfile.id };
    }
  }

  // Case B: Only one of them matched
  const singleMatch = emailProfile ?? phoneProfile;
  if (singleMatch) {
    console.log(`[contact_profile] Single profile match ${singleMatch.id}. Linking booking.`);
    await appendBookingId(singleMatch.id, booking_id, singleMatch.booking_ids ?? []);
    return { action: 'linked', profile: { ...singleMatch, booking_ids: [...(singleMatch.booking_ids ?? []), booking_id] } };
  }

  // Case C: No match — create a new profile
  console.log(`[contact_profile] No existing profile for ${first_name}. Creating new.`);
  const { data: created, error: insertErr } = await supabase
    .from('PatientProfile')
    .insert([{
      first_name,
      last_name:    last_name    ?? null,
      e_mail:       e_mail       ?? null,
      phone_number: phone_number ?? null,
      booking_ids:  [booking_id],
    }])
    .select()
    .single();

  if (insertErr) throw new Error(`[contact_profile] insert failed: ${insertErr.message}`);
  return { action: 'created', profile: created as PatientProfile };
}
