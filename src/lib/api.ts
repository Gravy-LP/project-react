/**
 * Client-side API helpers.
 * All write operations go through the Express API server.
 */

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
}

export interface BookingResult {
  success: boolean;
  error?: string;
  booking?: BookingPayload;
}

export async function createBooking(payload: BookingPayload): Promise<BookingResult> {
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:       payload.first_name,
        last_name:        payload.last_name        ?? null,
        e_mail:           payload.e_mail           ?? null,
        phone_number:     payload.phone_number     ?? null,
        booking_date:     payload.booking_date     ?? null,
        type:             payload.type             ?? null,
        booking_accepted: payload.booking_accepted ?? null,
        notes:            payload.notes            ?? null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? `HTTP ${res.status}` };
    return { success: true, booking: json.booking };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBooking(id: string): Promise<BookingResult> {
  try {
    const res = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? `HTTP ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function fetchBookings(incomingOnly: boolean = false): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    const url = incomingOnly ? '/api/bookings?incoming=true' : '/api/bookings';
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
    return { bookings: json.bookings };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateBookingStatus(id: string, accepted: boolean): Promise<BookingResult> {
  try {
    const res = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_accepted: accepted }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? `HTTP ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateBooking(id: string, data: Partial<BookingPayload>): Promise<BookingResult> {
  try {
    const res = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? `HTTP ${res.status}` };
    return { success: true, booking: json.booking };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function searchBookings(query: string): Promise<{ bookings?: BookingPayload[], error?: string }> {
  try {
    const res = await fetch(`/api/bookings?search=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
    return { bookings: json.bookings };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  e_mail: string | null;
  phone_number: string | null;
  booking_ids: string[] | null;
  created_at: string;
}

export async function fetchPatients(): Promise<{ patients?: PatientProfile[], error?: string }> {
  try {
    const res = await fetch('/api/patients');
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
    return { patients: json.patients };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deletePatient(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/patients?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? `HTTP ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
