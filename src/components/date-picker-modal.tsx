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
  selectedDate: string | null; // "YYYY-MM-DD"
  onApply: (date: string | null) => void;
  onClose: () => void;
};

const DAYS_SHORT = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const MONTHS_FULL = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const T = {
  fr: { title: 'Date de départ', confirm: 'Confirmer', clear: 'Effacer' },
  en: { title: 'Departure date', confirm: 'Confirm', clear: 'Clear' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Monday … 6=Sunday offset for first day of month
function firstWeekdayOffset(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function DatePickerModal({ visible, lang, selectedDate, onApply, onClose }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const t = T[lang];
  const days = DAYS_SHORT[lang];
  const months = MONTHS_FULL[lang];

  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();
  const nowDay = new Date().getDate();

  const [year, setYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth);
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      setYear(parts[0]);
      setMonth(parts[1] - 1);
      setDay(parts[2]);
    } else {
      setYear(nowYear);
      setMonth(nowMonth);
      setDay(null);
    }
  }, [visible]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const offset = firstWeekdayOffset(year, month);
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isPast = (d: number) => {
    const cell = new Date(year, month, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cell.setHours(0, 0, 0, 0);
    return cell < today;
  };
  const isToday = (d: number) =>
    d === nowDay && month === nowMonth && year === nowYear;

  const buildResult = () =>
    day !== null
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: theme.textStrong }]}>{t.title}</Text>

          {/* Month / Year navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.textStrong} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: theme.textStrong }]}>
              {months[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.textStrong} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.weekRow}>
            {days.map(d => (
              <Text key={d} style={[styles.weekDay, { color: theme.text }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (cell === null) return <View key={i} style={styles.cell} />;
              const selected = cell === day;
              const past = isPast(cell);
              const today = isToday(cell);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.cell,
                    selected && { backgroundColor: colors.primary, borderRadius: 4 },
                    today && !selected && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 4 },
                  ]}
                  onPress={() => !past && setDay(selected ? null : cell)}
                  disabled={past}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    { color: selected ? '#fff' : theme.textStrong },
                    past && styles.pastText,
                  ]}>
                    {cell}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => { setDay(null); onApply(null); onClose(); }}>
              <Text style={[styles.clearText, { color: theme.text }]}>{t.clear}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => { onApply(buildResult()); onClose(); }}
            >
              <Text style={styles.confirmText}>{t.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function formatDateDisplay(iso: string, lang: 'fr' | 'en'): string {
  if (!iso) return '';
  const parts = iso.split('-').map(Number);
  const d = parts[2];
  const m = parts[1] - 1;
  const y = parts[0];
  const monthShort = {
    fr: ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'jun.', 'jul.', 'aoû.', 'sep.', 'oct.', 'nov.', 'déc.'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  }[lang];
  return lang === 'fr' ? `${d} ${monthShort[m]} ${y}` : `${monthShort[m]} ${d}, ${y}`;
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: spacing.xs },
  monthLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  weekDay: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    width: 36,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  pastText: {
    opacity: 0.3,
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
  confirmBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  confirmText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
});
