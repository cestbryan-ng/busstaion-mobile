import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Success from '../../../../components/success';

export default function OrgCreateAgencySuccess() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'fr' || l === 'en') setLang(l);
    });
  }, []);

  return (
    <Success
      title={lang === 'fr' ? 'Agence créée !' : 'Agency created!'}
      message={
        lang === 'fr'
          ? "Votre agence a été créée avec succès. Elle est en attente d'activation par le gestionnaire de la gare."
          : 'Your agency has been created successfully. It is pending activation by the station manager.'
      }
      buttonText={
        lang === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard'
      }
      navigateTo="OrgAgencies"
    />
  );
}
