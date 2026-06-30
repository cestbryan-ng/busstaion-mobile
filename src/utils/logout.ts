import AsyncStorage from '@react-native-async-storage/async-storage';

export async function logout(navigation: any) {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  await AsyncStorage.removeItem('session_expires_at');
  await AsyncStorage.removeItem('isCustomerAuthenticated');
  await AsyncStorage.removeItem('isAgencyConnected');
  await AsyncStorage.removeItem('isOrganizationConnected');
  await AsyncStorage.removeItem('isBsmAuthenticated');
  navigation.replace('Login');
}
