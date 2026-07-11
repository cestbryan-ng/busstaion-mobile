import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorScreen from '../../components/error';

type RouteParams = { message?: string };

export default function BsmRequestError() {
  const route = useRoute();
  const params = (route.params ?? {}) as RouteParams;
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  return (
    <ErrorScreen
      title={lang === 'fr' ? 'Demande échouée' : 'Request failed'}
      message={
        params.message ??
        (lang === 'fr'
          ? "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer."
          : 'An error occurred while sending your request. Please try again.')
      }
      buttonText={lang === 'fr' ? 'Réessayer' : 'Try again'}
      navigateTo="BsmRequest"
    />
  );
}
