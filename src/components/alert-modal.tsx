import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  okText?: string;
  onClose: () => void;
};

export default function Alert({
  visible,
  title,
  message,
  okText = 'OK',
  onClose,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.background }]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.textStrong }]}>
              {title}
            </Text>
            <Text style={[styles.message, { color: theme.text }]}>
              {message}
            </Text>
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.btn} onPress={onClose}>
              <Text style={[styles.okText, { color: colors.primary }]}>
                {okText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  box: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: 1,
  },
  btn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  okText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
});
