import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

import { colors } from '../theme/colors';

import Splash from '../screens/splash';
import Onboard1 from '../screens/onboard/onboard1';
import Onboard2 from '../screens/onboard/onboard2';
import Onboard3 from '../screens/onboard/onboard3';
import Login from '../screens/auth/login';
import SignUp from '../screens/auth/signup';
import SignUpSuccess from '../screens/auth/signup-success';
import SignUpError from '../screens/auth/signup-error';
import PinSetup from '../screens/pin/setup';
import PinVerify from '../screens/pin/verify';
import ClientMain from '../screens/profile/client/client';
import BookingDetails from '../screens/profile/client/bookings/booking-details';
import TripsList from '../screens/profile/client/trips/trips-list';
import TripsFilter from '../screens/profile/client/trips/trips-filter';
import TripDetailScreen from '../screens/profile/client/trips/trip-detail';
import AgencyDetail from '../screens/profile/client/explore/agency-detail';
import StationDetail from '../screens/profile/client/explore/station-detail';
import ProfileSettings from '../screens/profile/client/profile/settings';
import Dashboard from '../screens/profile/client/profile/dashboard';
import CouponsScreen from '../screens/profile/client/profile/coupons';
import AgencyMain from '../screens/profile/agency/agency';
import AgencyPlanning from '../screens/profile/agency/planning/planning';
import AgencyTripDetail from '../screens/profile/agency/trips/trip-detail';
import AgencyTripBookings from '../screens/profile/agency/trips/trip-bookings';
import AgencyNewTrip from '../screens/profile/agency/trips/new-trip';
import AgencyCalendarDay from '../screens/profile/agency/calendar/calendar-day';
import AgencyInfo from '../screens/profile/agency/profile/agency-info';
import AgencySubscription from '../screens/profile/agency/profile/subscription';
import BsmMain from '../screens/profile/bsm/bsm';
import StationDetailBsm from '../screens/profile/bsm/stations/station-detail';
import AgencyDetailBsm from '../screens/profile/bsm/agencies/agency-detail';
import AgencyTripsBsm from '../screens/profile/bsm/agencies/agency-trips';
import TaxDetailBsm from '../screens/profile/bsm/tax/tax-detail';

import type { TripFilters } from '../screens/profile/client/trips/trips-filter';

export type RootStackParamList = {
  Splash: undefined;
  Onboard1: undefined;
  Onboard2: undefined;
  Onboard3: undefined;
  Login: undefined;
  SignUp: undefined;
  SignUpSuccess: undefined;
  SignUpError: undefined;
  PinSetup: { fromSettings?: boolean };
  PinVerify: undefined;
  ClientMain: undefined;
  BookingDetails: { reservationId: string };
  TripsList: { filters?: TripFilters };
  TripsFilter: { filters?: TripFilters };
  TripDetail: { tripId: string };
  AgencyDetail: { agencyId: string };
  StationDetail: { stationId: string };
  ProfileSettings: undefined;
  Dashboard: undefined;
  Coupons: undefined;
  AgencyMain: undefined;
  AgencyPlanning: undefined;
  AgencyTripDetail: { tripId: string };
  AgencyTripBookings: { tripId: string; tripTitle?: string };
  AgencyNewTrip: { editTripId?: string };
  AgencyCalendarDay: { dateStr: string; trips: any[] };
  AgencyInfo: undefined;
  AgencySubscription: undefined;
  BsmMain: undefined;
  StationDetailBsm: undefined;
  AgencyDetailBsm: { agencyId: string };
  AgencyTripsBsm: { agencyId: string; agencyName?: string };
  TaxDetailBsm: { itemId: string };
};

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const isDark = useColorScheme() === 'dark';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark
              ? colors.dark.background
              : colors.light.background,
          },
        }}
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Onboard1" component={Onboard1} />
        <Stack.Screen name="Onboard2" component={Onboard2} />
        <Stack.Screen name="Onboard3" component={Onboard3} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="SignUpSuccess" component={SignUpSuccess} />
        <Stack.Screen name="SignUpError" component={SignUpError} />
        <Stack.Screen name="PinSetup" component={PinSetup} />
        <Stack.Screen name="PinVerify" component={PinVerify} />
        <Stack.Screen name="ClientMain" component={ClientMain} />
        <Stack.Screen name="BookingDetails" component={BookingDetails} />
        <Stack.Screen name="TripsList" component={TripsList} />
        <Stack.Screen name="TripsFilter" component={TripsFilter} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        <Stack.Screen name="AgencyDetail" component={AgencyDetail} />
        <Stack.Screen name="StationDetail" component={StationDetail} />
        <Stack.Screen name="ProfileSettings" component={ProfileSettings} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Coupons" component={CouponsScreen} />
        <Stack.Screen name="AgencyMain" component={AgencyMain} />
        <Stack.Screen name="AgencyPlanning" component={AgencyPlanning} />
        <Stack.Screen name="AgencyTripDetail" component={AgencyTripDetail} />
        <Stack.Screen
          name="AgencyTripBookings"
          component={AgencyTripBookings}
        />
        <Stack.Screen name="AgencyNewTrip" component={AgencyNewTrip} />
        <Stack.Screen name="AgencyCalendarDay" component={AgencyCalendarDay} />
        <Stack.Screen name="AgencyInfo" component={AgencyInfo} />
        <Stack.Screen
          name="AgencySubscription"
          component={AgencySubscription}
        />
        <Stack.Screen name="BsmMain" component={BsmMain} />
        <Stack.Screen name="StationDetailBsm" component={StationDetailBsm} />
        <Stack.Screen name="AgencyDetailBsm" component={AgencyDetailBsm} />
        <Stack.Screen name="AgencyTripsBsm" component={AgencyTripsBsm} />
        <Stack.Screen name="TaxDetailBsm" component={TaxDetailBsm} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
