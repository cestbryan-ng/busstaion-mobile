import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Success from '../../components/success';

export default function BsmRequestSuccess() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  return (
    <Success
      title={lang === 'fr' ? 'Demande envoyée !' : 'Request sent!'}
      message={
        lang === 'fr'
          ? "Votre demande de compte BSM a bien été reçue. Nous allons l'étudier et vous enverrons vos identifiants de connexion par email après validation."
          : 'Your BSM account request has been received. We will review it and send your login credentials by email after approval.'
      }
      buttonText={lang === 'fr' ? 'Retour à la connexion' : 'Back to login'}
      navigateTo="Login"
    />
  );
}
