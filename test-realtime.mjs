import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://loqsrkrtonwmorbvnlwj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcXNya3J0b253bW9yYnZubHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODExMjAsImV4cCI6MjA5MTc1NzEyMH0.Pw2fntoJ8TdT7xrNDgrVXL6D49dkmi3arAzIKAO8c1I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Connecting to Supabase Realtime...');

const channel = supabase.channel('test-channel-' + Date.now())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking' }, (payload) => {
    console.log('RECEIVED CHANGE!', payload);
  })
  .subscribe((status, err) => {
    console.log('Status:', status);
    if (err) console.error('Error:', err);
    
    if (status === 'SUBSCRIBED') {
      console.log('Subscribed successfully! Now inserting a test record to trigger a change...');
      // Insert a dummy record and delete it immediately
      supabase.from('Booking').insert([{
        booking_id_db: crypto.randomUUID(),
        first_name: 'Realtime',
        last_name: 'Test',
        is_deleted: true
      }]).then(({ error }) => {
        if (error) console.error('Insert error:', error);
        else console.log('Insert successful! Waiting for realtime event...');
      });
    }
  });

setTimeout(() => {
  console.log('Timeout reached. Exiting.');
  process.exit(0);
}, 10000);
