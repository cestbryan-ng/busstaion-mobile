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
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Voyages: { active: 'bus', inactive: 'bus-outline' },
  Calendrier: { active: 'calendar', inactive: 'calendar-outline' },
  Ressources: { active: 'people', inactive: 'people-outline' },
  Profil: { active: 'person', inactive: 'person-outline' },
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
      >
        <Tab.Screen name="Dashboard">
          {() => (
            <AgencyDashboard
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              lang={lang}
              setLang={handleLangChange}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Voyages" component={AgencyTrips} />
        <Tab.Screen name="Calendrier" component={AgencyCalendar} />
        <Tab.Screen name="Ressources" component={AgencyResources} />
        <Tab.Screen name="Profil" component={AgencyProfil} />
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
