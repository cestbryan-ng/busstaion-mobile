import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Props = { lang?: 'fr' | 'en' };

export function OfflineBanner({ lang = 'fr' }: Props) {
  const label =
    lang === 'fr'
      ? 'Mode hors ligne · Données potentiellement non à jour'
      : 'Offline mode · Data may not be up to date';

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={13} color="#92400e" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  text: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    color: '#92400e',
    flex: 1,
  },
});
