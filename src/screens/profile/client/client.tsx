import React, { useState, useRef } from 'react';
import { useColorScheme, PanResponder, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import DrawerMenu from '../../../components/draw-menu';

import Home from './tabs/home';
import Bookings from './tabs/bookings';
import History from './tabs/history';
import Explore from './tabs/explore';
import Profile from './tabs/profile';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Accueil: { active: 'home', inactive: 'home-outline' },
  Réservations: { active: 'calendar', inactive: 'calendar-outline' },
  Historique: { active: 'time', inactive: 'time-outline' },
  Explorer: { active: 'compass', inactive: 'compass-outline' },
  Profil: { active: 'person', inactive: 'person-outline' },
};

export default function ClientMain() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSignificant = Math.abs(gestureState.dx) > 20;
        return isHorizontal && isSignificant;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          setDrawerOpen(true);
        } else if (gestureState.dx > 50) {
          setDrawerOpen(false);
        }
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
            <Home
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              lang={lang}
              setLang={handleLangChange}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Réservations" component={Bookings} />
        <Tab.Screen name="Historique" component={History} />
        <Tab.Screen name="Explorer" component={Explore} />
        <Tab.Screen name="Profil" component={Profile} />
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
  container: {
    flex: 1,
  },
});
