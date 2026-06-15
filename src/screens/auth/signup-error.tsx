import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Error from '../../components/error';

export default function SignUpError() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  return (
    <Error
      title={lang === 'fr' ? 'Inscription échouée' : 'Registration failed'}
      message={
        lang === 'fr'
          ? 'Le serveur est actuellement indisponible. Veuillez réessayer plus tard.'
          : 'The server is currently unavailable. Please try again later.'
      }
      buttonText={lang === 'fr' ? 'Réessayer' : 'Try again'}
      navigateTo="SignUp"
    />
  );
}
