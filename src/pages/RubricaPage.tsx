import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { fetchPatients, deletePatient, type PatientProfile } from '../lib/api';
import '../styles/rubrica.css';

export default function RubricaPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    async function load() {
      const { patients: data, error } = await fetchPatients();
      if (error) {
        showToast('Errore nel caricamento pazienti', 'error');
        return;
      }
      setPatients(data || []);
    }
    load();
  }, [showToast]);

  const getInitials = (first: string, last: string | null) =>
    ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminare questo profilo paziente?',
      message: "L'azione non può essere annullata.",
    });
    if (!confirmed) return;

    const { success, error } = await deletePatient(id);
    if (!success) {
      showToast(error || "Errore durante l'eliminazione", 'error');
      return;
    }
    setPatients((prev) => prev.filter((p) => p.id !== id));
    showToast('Profilo eliminato', 'success');
  };

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.first_name} ${p.last_name || ''}`.toLowerCase();
    const contacts = `${p.e_mail || ''} ${p.phone_number || ''}`.toLowerCase();
    return name.includes(q) || contacts.includes(q);
  });

  return (
    <Layout headerActions={
      <div className="patient-count-badge">
        <i className="ph ph-users" />
        <span>{patients.length} Pazienti</span>
      </div>
    }>
      <div className="glass-panel content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>Rubrica Pazienti</h2>
            <p className="card-subtitle">Profili costruiti automaticamente dal sistema di prenotazione</p>
          </div>
          <div className="filters">
            <div className="local-search-wrapper">
              <i className="ph ph-magnifying-glass" />
              <input
                type="text"
                placeholder="Filtra pazienti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="patients-grid">
            {filteredPatients.map((patient) => (
              <div className="patient-card glass-panel" key={patient.id}>
                <div className="patient-card-header">
                  <div className="patient-avatar">
                    {getInitials(patient.first_name, patient.last_name)}
                  </div>
                  <div className="patient-card-info">
                    <div className="patient-card-name">
                      {patient.first_name} {patient.last_name || ''}
                    </div>
                    <div className="patient-card-date">
                      <i className="ph ph-calendar-blank" />
                      Aggiunto il {formatDate(patient.created_at)}
                    </div>
                    {patient.booking_ids && patient.booking_ids.length > 0 && (
                      <div className="patient-booking-count">
                        <i className="ph ph-ticket" />
                        {patient.booking_ids.length} prenotazion{patient.booking_ids.length === 1 ? 'e' : 'i'}
                      </div>
                    )}
                  </div>
                  <button className="delete-patient-btn" onClick={() => handleDelete(patient.id)} title="Elimina profilo">
                    <i className="ph ph-trash" />
                  </button>
                </div>
                <div className="patient-card-contacts">
                  {patient.e_mail && (
                    <a href={`mailto:${patient.e_mail}`} className="contact-chip email-chip">
                      <i className="ph ph-envelope-simple" />
                      <span>{patient.e_mail}</span>
                    </a>
                  )}
                  {patient.phone_number && (
                    <a href={`tel:${patient.phone_number}`} className="contact-chip phone-chip">
                      <i className="ph ph-phone" />
                      <span>{patient.phone_number}</span>
                    </a>
                  )}
                  {!patient.e_mail && !patient.phone_number && (
                    <span className="contact-chip empty-chip">
                      <i className="ph ph-warning" />
                      <span>Nessun contatto</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-container">
            <div className="empty-state-icon"><i className="ph ph-address-book" /></div>
            <h3>Nessun paziente salvato</h3>
            <p>I profili vengono creati automaticamente quando approvi una prenotazione.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
