import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export const CITIES = [
  'Douala',
  'Yaoundé',
  'Bafoussam',
  'Kribi',
  'Buea',
  'Garoua',
  'Bertoua',
  'Maroua',
  'Ngaoundéré',
  'Bamenda',
];

type Props = {
  value: string;
  onSelect: (city: string) => void;
  placeholder: string;
  label: string;
  theme: any;
  containerStyle?: any;
};

export function CityPickerModal({
  value,
  onSelect,
  placeholder,
  label,
  theme,
  containerStyle,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, containerStyle]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={15} color={colors.primary} />
        <Text
          style={[
            styles.triggerText,
            { color: value ? theme.textStrong : theme.placeholder },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={13} color={theme.text} />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
              {label}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textStrong} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CITIES}
            keyExtractor={item => item}
            renderItem={({ item: city }) => (
              <TouchableOpacity
                style={[
                  styles.cityItem,
                  { borderBottomColor: theme.border },
                  value === city && { backgroundColor: `${colors.primary}12` },
                ]}
                onPress={() => {
                  onSelect(city);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.cityText,
                    {
                      color: value === city ? colors.primary : theme.textStrong,
                    },
                  ]}
                >
                  {city}
                </Text>
                {value === city && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  triggerText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cityText: {
    ...typography.body,
    fontSize: typography.sizes.md,
  },
});
