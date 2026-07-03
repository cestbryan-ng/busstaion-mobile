import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Detail = { label: string; value: string };

type Props = {
  title?: string;
  message: string;
  buttonText: string;
  navigateTo?: string;
  onPress?: () => void;
  details?: Detail[];
};

export default function Success({
  title,
  message,
  buttonText,
  navigateTo,
  onPress,
  details,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

        {/* Details */}
        {details && details.length > 0 && (
          <View style={[styles.detailsCard, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
            {details.map((d, i) => (
              <View
                key={i}
                style={[styles.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
              >
                <Text style={[styles.detailLabel, { color: theme.text }]}>{d.label}</Text>
                <Text style={[styles.detailValue, { color: theme.textStrong }]} numberOfLines={2}>{d.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Button — fixed at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onPress ?? (() => navigation.navigate(navigateTo!))}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
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
  detailsCard: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flexShrink: 0,
  },
  detailValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    flex: 1,
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
