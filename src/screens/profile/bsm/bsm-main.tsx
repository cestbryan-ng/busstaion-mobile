import React, { useState, useRef } from 'react';
import { View, StyleSheet, useColorScheme, PanResponder } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import DrawerMenu from '../../../components/draw-menu';

import BsmDashboard from './tabs/dashboard';
import BsmAgencies from './tabs/agencies';
import BsmTaxes from './tabs/taxes';
import BsmProfil from './tabs/profile';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Accueil: { active: 'home', inactive: 'home-outline' },
  Agences: { active: 'business', inactive: 'business-outline' },
  Taxes: { active: 'document-text', inactive: 'document-text-outline' },
  Profil: { active: 'person', inactive: 'person-outline' },
};

export default function BsmMain() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) setDrawerOpen(true);
        else if (g.dx > 50) setDrawerOpen(false);
      },
    }),
  ).current;

  const handleLangChange = async (newLang: 'fr' | 'en') => {
    setLang(newLang);
    await AsyncStorage.setItem('app_lang', newLang);
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: theme.text,
          tabBarLabelStyle: {
            ...typography.body,
            fontSize: typography.sizes.xs,
          },
          tabBarIcon: ({ color, focused }) => {
            const icon = TAB_ICONS[route.name];
            return (
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={22}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Accueil">
          {() => (
            <BsmDashboard
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              lang={lang}
              setLang={handleLangChange}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Agences" component={BsmAgencies} />
        <Tab.Screen name="Taxes" component={BsmTaxes} />
        <Tab.Screen name="Profil" component={BsmProfil} />
      </Tab.Navigator>

      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lang={lang}
        onLangChange={handleLangChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
