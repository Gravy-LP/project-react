import { supabase } from './supabase';

export const SCHEDULE = {
  morning: { start: '07:30', end: '14:30' },
  afternoon: { start: '16:00', end: '19:30' }
};

export const SLOT_DURATION = 30; // minutes

/**
 * Generates all possible 30-minute slots based on the schedule.
 */
export function generateAllSlots(): string[] {
  const slots: string[] = [];
  const sessions = [SCHEDULE.morning, SCHEDULE.afternoon];
  
  sessions.forEach(session => {
    let current = new Date(`2000-01-01T${session.start}:00`);
    const end = new Date(`2000-01-01T${session.end}:00`);
    
    while (current < end) {
      slots.push(current.toTimeString().slice(0, 5));
      current.setMinutes(current.getMinutes() + SLOT_DURATION);
    }
  });
  return slots;
}

/**
 * Fetches available slots for a given date, excluding taken times.
 * If ignoreBookingId is provided, it will treat that specific booking's time as available 
 * (useful for editing an existing booking).
 */
export async function getAvailableSlots(dateStr: string, ignoreBookingId?: string): Promise<string[]> {
  const dateObj = new Date(dateStr);
  const day = dateObj.getDay();
  
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return [];

  try {
    const startOfDay = `${dateStr}T00:00:00Z`;
    const endOfDay = `${dateStr}T23:59:59Z`;

    let query = supabase
      .from('Booking')
      .select('booking_id_db, booking_date')
      .eq('is_deleted', false)
      .gte('booking_date', startOfDay)
      .lte('booking_date', endOfDay);

    if (ignoreBookingId) {
      query = query.neq('booking_id_db', ignoreBookingId);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    const takenTimes = bookings.map(b => {
      const d = new Date(b.booking_date);
      return d.toTimeString().slice(0, 5);
    });

    const allSlots = generateAllSlots();
    return allSlots.filter(slot => !takenTimes.includes(slot));
  } catch (err) {
    console.error('Error fetching available slots:', err);
    return [];
  }
}
