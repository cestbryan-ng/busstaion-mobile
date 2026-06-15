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
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Oui',
  cancelText = 'Non',
  onConfirm,
  onCancel,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.background }]}>
          {/* Title */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>
              {title}
            </Text>
            <Text style={[styles.message, { color: theme.textStrong }]}>
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.btn,
                { borderRightColor: theme.border, borderRightWidth: 1 },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onConfirm}>
              <Text style={[styles.confirmText, { color: colors.primary }]}>
                {confirmText}
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
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  confirmText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
});
