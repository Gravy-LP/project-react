import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { fetchBin, restoreBooking, deleteBooking, type BookingPayload } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';

export default function BinPage() {
  const [items, setItems] = useState<BookingPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const loadBin = async () => {
    setLoading(true);
    const { bookings, error } = await fetchBin();
    if (error) {
      showToast('Errore nel caricamento cestino', 'error');
    } else {
      setItems(bookings || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBin();

    const channel = supabase
      .channel('bin-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => loadBin()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRestore = async (id: string) => {
    const res = await restoreBooking(id);
    if (res.success) {
      showToast('Prenotazione ripristinata', 'success');
      setItems(prev => prev.filter(b => b.booking_id_db !== id));
    } else {
      showToast(res.error || 'Errore', 'error');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminazione definitiva?',
      message: 'Questa azione non può essere annullata. La prenotazione verrà rimossa per sempre.',
    });
    if (!ok) return;

    // We need to add permanent=true query param support or update the deleteBooking function
    // For now, let's call fetch directly or assume deleteBooking handles it if we update it
    try {
      const { error } = await supabase
        .from('Booking')
        .delete()
        .eq('booking_id_db', id);

      if (error) throw error;
      showToast('Prenotazione eliminata definitivamente', 'success');
      setItems(prev => prev.filter(b => b.booking_id_db !== id));
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Errore durante l\'eliminazione', 'error');
    }
  };

  return (
    <Layout>
      <div className="glass-panel content-card" style={{ padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Cestino</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Prenotazioni eliminate che possono essere ripristinate o rimosse definitivamente.</p>
          </div>
          {items.length > 0 && (
            <button 
              className="btn btn-ghost text-danger" 
              onClick={async () => {
                const ok = await confirm({ title: 'Svuotare il cestino?', message: 'Tutte le prenotazioni verranno eliminate definitivamente.' });
                if (!ok) return;
                try {
                  const { error } = await supabase
                    .from('Booking')
                    .delete()
                    .eq('is_deleted', true);
                  
                  if (error) throw error;
                  showToast('Cestino svuotato', 'success');
                  setItems([]);
                } catch (err) {
                  console.error('Empty bin error:', err);
                  showToast('Errore durante lo svuotamento', 'error');
                }
              }}
            >
              <i className="ph ph-trash-simple" /> Svuota Cestino
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Caricamento...</div>
        ) : items.length > 0 ? (
          <div className="bookings-list">
            <table className="mini-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px' }}>Paziente</th>
                  <th style={{ padding: '12px' }}>Data Originale</th>
                  <th style={{ padding: '12px' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map(b => (
                  <tr key={b.booking_id_db} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>{b.first_name} {b.last_name}</td>
                    <td style={{ padding: '12px' }}>{b.booking_date ? new Date(b.booking_date).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleRestore(b.booking_id_db!)}
                          title="Ripristina"
                        >
                          <i className="ph ph-arrow-counter-clockwise" /> Ripristina
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm text-danger" 
                          onClick={() => handlePermanentDelete(b.booking_id_db!)}
                          title="Elimina definitivamente"
                        >
                          <i className="ph ph-trash" /> Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
            <i className="ph ph-trash" style={{ fontSize: '3rem', marginBottom: '16px', display: 'block' }} />
            <p>Il cestino è vuoto</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
