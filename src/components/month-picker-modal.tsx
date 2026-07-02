import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Props = {
  visible: boolean;
  lang: 'fr' | 'en';
  selectedYear: number;
  selectedMonth: number | null;
  onApply: (year: number, month: number | null) => void;
  onClose: () => void;
};

const MONTHS = {
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const T = {
  fr: { title: 'Sélectionner un mois', apply: 'Appliquer', clear: 'Effacer' },
  en: { title: 'Select a month', apply: 'Apply', clear: 'Clear' },
};

export function MonthPickerModal({
  visible,
  lang,
  selectedYear,
  selectedMonth,
  onApply,
  onClose,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const t = T[lang];
  const months = MONTHS[lang];

  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState<number | null>(selectedMonth);

  useEffect(() => {
    if (visible) {
      setYear(selectedYear);
      setMonth(selectedMonth);
    }
  }, [visible, selectedYear, selectedMonth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: theme.textStrong }]}>{t.title}</Text>

          {/* Year selector */}
          <View style={styles.yearRow}>
            <TouchableOpacity onPress={() => setYear(y => y - 1)}>
              <Ionicons name="chevron-back" size={22} color={theme.textStrong} />
            </TouchableOpacity>
            <Text style={[styles.year, { color: theme.textStrong }]}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(y => y + 1)}>
              <Ionicons name="chevron-forward" size={22} color={theme.textStrong} />
            </TouchableOpacity>
          </View>

          {/* Month grid */}
          <View style={styles.grid}>
            {months.map((m, i) => {
              const selected = month === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.cell,
                    { borderColor: selected ? colors.primary : theme.border },
                    selected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setMonth(selected ? null : i)}
                >
                  <Text style={[styles.cellText, { color: selected ? '#fff' : theme.text }]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => { setMonth(null); onApply(year, null); onClose(); }}>
              <Text style={[styles.clearText, { color: theme.text }]}>{t.clear}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => { onApply(year, month); onClose(); }}
            >
              <Text style={styles.applyText}>{t.apply}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  year: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    minWidth: 60,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  cell: {
    width: '22%',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cellText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  clearText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  applyBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  applyText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
});
