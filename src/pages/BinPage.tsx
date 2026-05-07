import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { fetchBin, restoreBooking, deleteBooking, type BookingPayload } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../context/LanguageContext';

const getLocaleTag = (lang: string) => {
  switch(lang) {
    case 'IT': return 'it-IT';
    case 'EN': return 'en-US';
    case 'ES': return 'es-ES';
    case 'FR': return 'fr-FR';
    case 'ZH': return 'zh-CN';
    default: return 'it-IT';
  }
};

export default function BinPage() {
  const [items, setItems] = useState<BookingPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { language, t } = useTranslation();

  const loadBin = async () => {
    setLoading(true);
    const { bookings, error } = await fetchBin();
    if (error) {
      showToast(t('common.error'), 'error');
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
      showToast(t('bin.restore_success'), 'success');
      setItems(prev => prev.filter(b => b.booking_id_db !== id));
    } else {
      showToast(res.error || t('common.error'), 'error');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const ok = await confirm({
      title: t('bin.permanent_delete_title'),
      message: t('bin.permanent_delete_msg'),
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('Booking')
        .delete()
        .eq('booking_id_db', id);

      if (error) throw error;
      showToast(t('bin.permanent_delete_success'), 'success');
      setItems(prev => prev.filter(b => b.booking_id_db !== id));
    } catch (err) {
      console.error('Delete error:', err);
      showToast(t('common.error'), 'error');
    }
  };

  return (
    <Layout>
      <div className="glass-panel content-card" style={{ padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>{t('bin.title')}</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>{t('bin.subtitle')}</p>
          </div>
          {items.length > 0 && (
            <button 
              className="btn btn-ghost text-danger" 
              onClick={async () => {
                const ok = await confirm({ title: t('bin.empty_confirm_title'), message: t('bin.empty_confirm_msg') });
                if (!ok) return;
                try {
                  const { error } = await supabase
                    .from('Booking')
                    .delete()
                    .eq('is_deleted', true);
                  
                  if (error) throw error;
                  showToast(t('bin.empty_success'), 'success');
                  setItems([]);
                } catch (err) {
                  console.error('Empty bin error:', err);
                  showToast(t('common.error'), 'error');
                }
              }}
            >
              <i className="ph ph-trash-simple" /> {t('bin.empty_bin')}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>{t('common.loading')}</div>
        ) : items.length > 0 ? (
          <div className="bookings-list">
            <table className="mini-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px' }}>{t('bin.patient')}</th>
                  <th style={{ padding: '12px' }}>{t('bin.original_date')}</th>
                  <th style={{ padding: '12px' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(b => (
                  <tr key={b.booking_id_db} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>{b.first_name} {b.last_name}</td>
                    <td style={{ padding: '12px' }}>{b.booking_date ? new Date(b.booking_date).toLocaleDateString(getLocaleTag(language)) : 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleRestore(b.booking_id_db!)}
                          title={t('bin.restore')}
                        >
                          <i className="ph ph-arrow-counter-clockwise" /> {t('bin.restore')}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm text-danger" 
                          onClick={() => handlePermanentDelete(b.booking_id_db!)}
                          title={t('common.delete')}
                        >
                          <i className="ph ph-trash" /> {t('common.delete')}
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
            <p>{t('bin.empty_state')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
