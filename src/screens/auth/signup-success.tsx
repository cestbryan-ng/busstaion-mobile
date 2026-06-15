import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Success from '../../components/success';

export default function SignUpSuccess() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  return (
    <Success
      title={
        lang === 'fr' ? 'Inscription réussie !' : 'Registration successful!'
      }
      message={
        lang === 'fr'
          ? 'Votre compte a été créé avec succès.'
          : 'Your account has been created successfully.'
      }
      buttonText={lang === 'fr' ? 'Se connecter' : 'Log in'}
      navigateTo="Login"
    />
  );
}
