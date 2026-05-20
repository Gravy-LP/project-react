/**
 * Client-side API helpers.
 * Refactored to use Supabase directly for Netlify compatibility.
 */
import { supabase } from './supabase';

export interface BookingPayload {
  readonly booking_id_db?: string | null;
  first_name: string;
  last_name?: string | null;
  e_mail?: string | null;
  phone_number?: string | null;
  booking_date?: string | null;
  type?: string | null;
  booking_accepted?: boolean | null;
  notes?: string | null;
  appointment_complete?: boolean | null;
  is_deleted?: boolean | null;
  profile_id?: string | null;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  booking?: BookingPayload;
}

export async function createBooking(payload: BookingPayload): Promise<BookingResult> {
  try {
    const booking_id_db = payload.booking_id_db || (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          })
    );
    const { data, error } = await supabase
      .from('Booking')
      .insert([{
        ...payload,
        booking_id_db,
        booking_date: payload.booking_date ? new Date(payload.booking_date).toISOString() : null,
        is_deleted: false
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, booking: data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBooking(id: string): Promise<BookingResult> {
  try {
    const { error } = await supabase
      .from('Booking')
      .update({ is_deleted: true })
      .eq('booking_id_db', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function fetchBookings(incomingOnly: boolean = false): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    let query = supabase
      .from('Booking')
      .select('*')
      .eq('is_deleted', false);

    if (incomingOnly) {
      query = query.or('booking_accepted.is.null,booking_accepted.eq.false');
    }

    const { data, error } = await query.order('booking_date', { ascending: true });
    if (error) return { error: error.message };
    return { bookings: data || [] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function fetchUserBookings(profileId: string): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('Booking')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_deleted', false)
      .order('booking_date', { ascending: true });
    if (error) return { error: error.message };
    return { bookings: data || [] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateBookingStatus(id: string, accepted: boolean): Promise<BookingResult> {
  return updateBooking(id, { booking_accepted: accepted });
}

export async function updateBooking(id: string, data: Partial<BookingPayload>): Promise<BookingResult> {
  try {
    const updateData = { ...data };
    if (data.booking_date) {
      updateData.booking_date = new Date(data.booking_date).toISOString();
    }

    const { data: updated, error } = await supabase
      .from('Booking')
      .update(updateData)
      .eq('booking_id_db', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, booking: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function searchBookings(queryStr: string): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    // Search in Bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('Booking')
      .select('*')
      .eq('is_deleted', false)
      .or(`first_name.ilike.%${queryStr}%,last_name.ilike.%${queryStr}%,e_mail.ilike.%${queryStr}%,phone_number.ilike.%${queryStr}%`)
      .order('booking_date', { ascending: true });

    if (bookingsError) return { error: bookingsError.message };

    // Search in Patients to find those without bookings
    const { data: patientsData, error: patientsError } = await supabase
      .from('PatientProfile')
      .select('*')
      .or(`first_name.ilike.%${queryStr}%,last_name.ilike.%${queryStr}%,e_mail.ilike.%${queryStr}%,phone_number.ilike.%${queryStr}%`)
      .limit(10);

    if (patientsError) return { error: patientsError.message };

    // Merge: For each patient, if they don't have a booking in bookingsData, add a dummy booking entry pointing to their profile
    const mergedResults: BookingPayload[] = [...(bookingsData || [])];
    
    const existingPatientIds = new Set(mergedResults.map(b => b.profile_id).filter(Boolean));

    patientsData?.forEach(p => {
      if (!existingPatientIds.has(p.id)) {
        mergedResults.push({
          booking_id_db: `p-${p.id}`, // Virtual ID
          first_name: p.first_name,
          last_name: p.last_name,
          e_mail: p.e_mail,
          phone_number: p.phone_number,
          profile_id: p.id,
          booking_accepted: true, // Mark as "accepted" so it shows a neutral/good status
          type: 'Profilo'
        });
      }
    });

    return { bookings: mergedResults };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function fetchBin(): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('Booking')
      .select('*')
      .eq('is_deleted', true)
      .order('booking_date', { ascending: false });

    if (error) return { error: error.message };
    return { bookings: data || [] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function restoreBooking(id: string): Promise<BookingResult> {
  return updateBooking(id, { is_deleted: false });
}

export interface PatientProfile {
  id: string;
  auth_id?: string | null;
  role?: 'owner' | 'administrator' | 'manager' | 'viewer' | 'user' | null;
  first_name: string;
  last_name: string | null;
  e_mail: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  notes: string | null;
  booking_ids: string[] | null;
  created_at: string;
}

export async function fetchPatients(): Promise<{ patients?: PatientProfile[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('PatientProfile')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) return { error: error.message };
    return { patients: data || [] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deletePatient(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('PatientProfile')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function fetchPatientById(id: string): Promise<{ patient?: PatientProfile, error?: string }> {
  try {
    const { data, error } = await supabase
      .from('PatientProfile')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { error: error.message };
    return { patient: data };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updatePatient(id: string, data: Partial<PatientProfile>): Promise<{ success: boolean; patient?: PatientProfile; error?: string }> {
  try {
    const { data: updated, error } = await supabase
      .from('PatientProfile')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, patient: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createPatient(data: Partial<PatientProfile>): Promise<{ success: boolean; patient?: PatientProfile; error?: string }> {
  try {
    const { data: created, error } = await supabase
      .from('PatientProfile')
      .insert([data])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, patient: created };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
export async function ensurePatientProfileForBooking(booking: any): Promise<{ profileId?: string, error?: string }> {
  try {
    if (booking.profile_id) return { profileId: booking.profile_id };

    // Check if patient exists by email or phone
    const { data: existing } = await supabase
      .from('PatientProfile')
      .select('id')
      .or(`e_mail.eq.${booking.e_mail || booking.email},phone_number.eq.${booking.phone_number || booking.phone}`)
      .maybeSingle();

    let profileId = existing?.id;

    if (!profileId) {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('PatientProfile')
        .insert([{
          first_name: booking.first_name,
          last_name: booking.last_name,
          e_mail: booking.e_mail || booking.email,
          phone_number: booking.phone_number || booking.phone,
          notes: booking.notes,
          booking_ids: [booking.booking_id_db]
        }])
        .select('id')
        .single();
      
      if (createError) return { error: createError.message };
      profileId = newProfile.id;
    }

    if (profileId) {
      // Link booking to profile
      await supabase
        .from('Booking')
        .update({ profile_id: profileId })
        .eq('booking_id_db', booking.booking_id_db);
      
      return { profileId };
    }

    return { error: 'Could not resolve profile' };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
