import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  useColorScheme,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  PanResponder,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { CGU_URL, SUPPORT_URL } from '../utils/config';
import { logout } from '../utils/logout';
import type { RootStackParamList } from '../navigation';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

type Props = {
  visible: boolean;
  onClose: () => void;
  lang: 'fr' | 'en';
  onLangChange: (lang: 'fr' | 'en') => void;
};

type MenuItem = {
  id: string;
  icon: string;
  labelFr: string;
  labelEn: string;
  onPress: () => void;
  danger?: boolean;
  hidden?: boolean;
};

export default function DrawerMenu({
  visible,
  onClose,
  lang,
  onLangChange,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        return isHorizontal && gestureState.dx > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          onClose();
        }
      },
    }),
  ).current;
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('pin_enabled').then(v => setPinEnabled(v === 'true'));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const t = {
    fr: {
      changeLang: 'Passer en anglais',
      setupPin: 'Configurer un code PIN',
      changePin: 'Modifier le code PIN',
      support: 'Support client',
      about: 'À propos',
      logout: 'Déconnexion',
      version: 'Version 1.1.1',
    },
    en: {
      changeLang: 'Switch to French',
      setupPin: 'Set up a PIN code',
      changePin: 'Change PIN code',
      support: 'Customer support',
      about: 'About',
      logout: 'Logout',
      version: 'Version 1.1.1',
    },
  }[lang];

  const handleLangChange = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await AsyncStorage.setItem('app_lang', newLang);
    onLangChange(newLang);
    onClose();
  };

  const handlePinSetup = () => {
    onClose();
    navigation.navigate('PinSetup', { fromSettings: true });
  };

  const menuItems: MenuItem[] = [
    {
      id: 'lang',
      icon: 'language-outline',
      labelFr: t.changeLang,
      labelEn: t.changeLang,
      onPress: handleLangChange,
    },
    {
      id: 'pin',
      icon: 'keypad-outline',
      labelFr: pinEnabled ? t.changePin : t.setupPin,
      labelEn: pinEnabled ? t.changePin : t.setupPin,
      onPress: handlePinSetup,
    },
    {
      id: 'support',
      icon: 'headset-outline',
      labelFr: t.support,
      labelEn: t.support,
      onPress: () => {
        Linking.openURL(
          `${SUPPORT_URL}`,
        );
        onClose();
      },
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      labelFr: t.about,
      labelEn: t.about,
      onPress: () => {
        Linking.openURL(
          `${CGU_URL}`,
        );
        onClose();
      },
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.background,
            transform: [{ translateX: slideAnim }],
          },
        ]}
        {...swipePanResponder.panHandlers}
      >
        {/* Close button */}
        <TouchableOpacity
          style={[
            styles.closeBtn,
            {
              backgroundColor: colors.error + '18',
              borderColor: colors.error + '30',
            },
          ]}
          onPress={onClose}
        >
          <Ionicons name="close" size={18} color={colors.error} />
        </TouchableOpacity>

        {/* Menu items */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={theme.textStrong}
                  style={styles.menuItemIcon}
                />
                <Text
                  style={[styles.menuItemText, { color: theme.textStrong }]}
                >
                  {lang === 'fr' ? item.labelFr : item.labelEn}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.text} />
              </TouchableOpacity>
              {index < menuItems.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: theme.text }]}>{t.version}</Text>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.border }]}
          onPress={() => logout(navigation)}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: theme.textStrong }]}>
            {t.logout}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textStrong} />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: undefined,
    width: DRAWER_WIDTH,
    height: '100%',
    paddingTop: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuItemIcon: {
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  divider: {
    height: 1,
  },
  version: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  logoutText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
});
