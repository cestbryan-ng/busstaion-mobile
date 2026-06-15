import React, { useEffect } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { logout } from '../utils/logout';
import type { RootStackParamList } from '../navigation';

export default function Splash() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  useEffect(() => {
    const checkSession = async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 2000));

      const onboarded = await AsyncStorage.getItem('onboarded');
      if (onboarded !== 'true') {
        navigation.replace('Onboard1');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      const expiresAt = await AsyncStorage.getItem('session_expires_at');

      if (token && expiresAt && new Date() < new Date(expiresAt)) {
        const pinEnabled = await AsyncStorage.getItem('pin_enabled');
        if (pinEnabled === 'true') {
          navigation.replace('PinVerify');
        } else {
          const userRaw = await AsyncStorage.getItem('user');
          const user = userRaw ? JSON.parse(userRaw) : null;
          const roles: string[] = user?.role ?? [];
          if (roles.includes('BUS_STATION_MANAGER')) {
            navigation.replace('BsmDashboard');
          } else if (roles.includes('AGENCE_VOYAGE')) {
            navigation.replace('AgencyDashboard');
          } else {
            navigation.replace('ClientHome');
          }
        }
      } else {
        await logout(navigation);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      const onboarded = await AsyncStorage.getItem('onboarded');
      if (onboarded === 'true') {
        navigation.replace('Login');
      } else {
        navigation.replace('Onboard1');
      }
    };
    checkOnboarding();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image
        source={require('../assets/images/busstation_bleu.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  loader: {
    marginTop: 40,
  },
});
