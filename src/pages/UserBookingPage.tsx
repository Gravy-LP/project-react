import React from 'react';
import Layout from '../components/Layout';
import PublicBookingForm from '../components/public/PublicBookingForm';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import '../components/public/PublicBookingForm.css';

export default function UserBookingPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="animate-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', fontSize: '2rem', marginBottom: '16px' }}>
            <i className="ph ph-calendar-plus" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Richiedi Appuntamento</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Seleziona la data e l'orario che preferisci. La tua richiesta verrà inviata in stato "In attesa" e sarà confermata dalla clinica.
          </p>
        </div>

        {profile ? (
          <PublicBookingForm
            profileId={profile.id}
            initialFirstName={profile.first_name || ''}
            initialLastName={profile.last_name || ''}
            initialEmail={profile.e_mail || ''}
            initialPhone={profile.phone_number || ''}
            hidePersonalFields={true}
          />
        ) : (
          <div className="loading-container">
            <div className="loader"></div>
          </div>
        )}
      </div>
    </Layout>
  );
}
