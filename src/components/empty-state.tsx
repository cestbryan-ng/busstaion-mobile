import React from 'react';
import { View, Text, Image, StyleSheet, useColorScheme } from 'react-native';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const IMAGES = {
  result: {
    light: require('../assets/images/result_emptystate_light.png'),
    dark: require('../assets/images/result_emptystate_dark.png'),
  },
  calendar: {
    light: require('../assets/images/calendar_emptystate_light.png'),
    dark: require('../assets/images/calendar_emptystate_dark.png'),
  },
  docs: {
    light: require('../assets/images/docs_emptystate_light.png'),
    dark: require('../assets/images/docs_emptystate_dark.png'),
  },
  message: {
    light: require('../assets/images/message_emptystate_light.png'),
    dark: require('../assets/images/message_emptystate_dark.png'),
  },
};

type EmptyType = keyof typeof IMAGES;

export function EmptyState({
  type,
  message,
  textColor,
}: {
  type: EmptyType;
  message: string;
  textColor?: string;
}) {
  const isDark = useColorScheme() === 'dark';
  const source = isDark ? IMAGES[type].dark : IMAGES[type].light;

  return (
    <View style={s.container}>
      <Image source={source} style={s.image} resizeMode="contain" />
      <Text style={[s.text, textColor ? { color: textColor } : {}]}>
        {message}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  image: {
    width: 200,
    height: 160,
  },
  text: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});
