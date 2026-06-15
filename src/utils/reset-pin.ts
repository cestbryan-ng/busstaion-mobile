import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from './logout';

export async function resetPin(navigation: any) {
  await AsyncStorage.removeItem('pin_code');
  await AsyncStorage.removeItem('pin_enabled');
  await logout(navigation);
}
