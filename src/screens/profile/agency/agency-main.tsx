import React, { useState, useRef } from 'react';
import { View, StyleSheet, useColorScheme, PanResponder } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import DrawerMenu from '../../../components/draw-menu';

import AgencyDashboard from './tabs/dashboard';
import AgencyTrips from './tabs/trips';
import AgencyCalendar from './tabs/calendar';
import AgencyResources from './tabs/resources';
import AgencyProfil from './tabs/profile';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  dashboard: { active: 'home', inactive: 'home-outline' },
  trips: { active: 'bus', inactive: 'bus-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  resources: { active: 'people', inactive: 'people-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS = {
  fr: {
    dashboard: 'Dashboard',
    trips: 'Voyages',
    calendar: 'Calendrier',
    resources: 'Ressources',
    profile: 'Profil',
  },
  en: {
    dashboard: 'Dashboard',
    trips: 'Trips',
    calendar: 'Calendar',
    resources: 'Resources',
    profile: 'Profile',
  },
};

export default function AgencyMain() {
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
        screenListeners={{
          focus: async () => {
            const storedLang = await AsyncStorage.getItem('app_lang');
            if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang as 'fr' | 'en');
          },
        }}
      >
        <Tab.Screen
          name="dashboard"
          options={{ tabBarLabel: TAB_LABELS[lang].dashboard }}
        >
          {() => (
            <AgencyDashboard
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              lang={lang}
              setLang={handleLangChange}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="trips"
          options={{ tabBarLabel: TAB_LABELS[lang].trips }}
        >
          {() => (
            <AgencyTrips
              setDrawerOpen={setDrawerOpen}
              lang={lang}
              setLang={handleLangChange}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="calendar"
          component={AgencyCalendar}
          options={{ tabBarLabel: TAB_LABELS[lang].calendar }}
        />
        <Tab.Screen
          name="resources"
          component={AgencyResources}
          options={{ tabBarLabel: TAB_LABELS[lang].resources }}
        />
        <Tab.Screen
          name="profile"
          options={{ tabBarLabel: TAB_LABELS[lang].profile }}
        >
          {() => <AgencyProfil setLang={handleLangChange} setDrawerOpen={setDrawerOpen} />}
        </Tab.Screen>
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
