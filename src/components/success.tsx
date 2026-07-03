import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Props = {
  title?: string;
  message: string;
  buttonText: string;
  navigateTo?: string;
  onPress?: () => void;
};

export default function Success({
  title,
  message,
  buttonText,
  navigateTo,
  onPress,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/images/success.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {title && (
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {title}
          </Text>
        )}
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onPress ?? (() => navigation.navigate(navigateTo!))}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  image: {
    width: '85%',
    height: 400,
  },
  content: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    fontSize: typography.sizes.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
