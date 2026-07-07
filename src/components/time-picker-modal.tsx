import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Props = {
  visible: boolean;
  title: string;
  value: string;
  lang: 'fr' | 'en';
  onApply: (time: string) => void;
  onClose: () => void;
};

export default function TimePickerModal({ visible, title, value, lang, onApply, onClose }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [hh, setHh] = useState(8);
  const [mm, setMm] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const parts = (value || '08:00').split(':');
    setHh(parseInt(parts[0], 10) || 0);
    setMm(parseInt(parts[1], 10) || 0);
  }, [visible]);

  const confirm = lang === 'fr' ? 'Confirmer' : 'Confirm';
  const cancel = lang === 'fr' ? 'Annuler' : 'Cancel';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: theme.textStrong }]}>{title}</Text>
          <View style={styles.timeRow}>
            <View style={styles.unit}>
              <TouchableOpacity onPress={() => setHh(h => (h + 1) % 24)} style={styles.arrow}>
                <Ionicons name="chevron-up" size={24} color={theme.textStrong} />
              </TouchableOpacity>
              <Text style={[styles.timeVal, { color: theme.textStrong }]}>
                {String(hh).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={() => setHh(h => (h + 23) % 24)} style={styles.arrow}>
                <Ionicons name="chevron-down" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.colon, { color: theme.textStrong }]}>:</Text>
            <View style={styles.unit}>
              <TouchableOpacity onPress={() => setMm(m => (m + 5) % 60)} style={styles.arrow}>
                <Ionicons name="chevron-up" size={24} color={theme.textStrong} />
              </TouchableOpacity>
              <Text style={[styles.timeVal, { color: theme.textStrong }]}>
                {String(mm).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={() => setMm(m => (m + 55) % 60)} style={styles.arrow}>
                <Ionicons name="chevron-down" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelText, { color: theme.text }]}>{cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                onApply(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>{confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '80%',
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.heading, fontSize: typography.sizes.md, textAlign: 'center' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  unit: { alignItems: 'center', gap: spacing.xs },
  arrow: { padding: spacing.sm },
  timeVal: { ...typography.heading, fontSize: 40, minWidth: 56, textAlign: 'center' },
  colon: { ...typography.heading, fontSize: 40, marginBottom: spacing.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: { ...typography.body, fontSize: typography.sizes.sm },
  confirmBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 4 },
  confirmText: { ...typography.bodyBold, fontSize: typography.sizes.sm, color: '#fff' },
});
