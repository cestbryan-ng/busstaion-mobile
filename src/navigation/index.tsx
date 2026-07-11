import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

import { colors } from '../theme/colors';
import { ToastProvider } from '../components/toast';

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
import ClientMain from '../screens/profile/client/client-main';
import BookingDetails from '../screens/profile/client/bookings/booking-details';
import TripsList from '../screens/profile/client/trips/trips-list';
import TripsFilter from '../screens/profile/client/trips/trips-filter';
import TripDetailScreen from '../screens/profile/client/trips/trip-detail';
import AgencyDetail from '../screens/profile/client/explore/agency-detail';
import StationDetail from '../screens/profile/client/explore/station-detail';
import ProfileSettings from '../screens/profile/client/profile/settings';
import CacheSettings from '../screens/profile/client/profile/cache-settings';
import Dashboard from '../screens/profile/client/profile/dashboard';
import CouponsScreen from '../screens/profile/client/profile/coupons';
import AgencyMain from '../screens/profile/agency/agency-main';
import AgencyPlanning from '../screens/profile/agency/planning/planning';
import AgencyTripDetail from '../screens/profile/agency/trips/trip-detail';
import AgencyTripBookings from '../screens/profile/agency/trips/trip-bookings';
import AgencyNewTrip from '../screens/profile/agency/trips/new-trip';
import AgencyCalendarDay from '../screens/profile/agency/calendar/calendar-day';
import AgencyInfo from '../screens/profile/agency/profile/agency-info';
import AgencyEditInfo from '../screens/profile/agency/profile/edit-agency-info';
import AgencySubscription from '../screens/profile/agency/profile/subscription';
import AgencyCodeSecret from '../screens/profile/agency/profile/secret-code';
import OrgHome from '../screens/profile/organization/org-main';
import OrgMyAgencies from '../screens/profile/organization/agencies/my-agencies';
import OrgAgencyDetail from '../screens/profile/organization/agencies/agency-detail';
import OrgStations from '../screens/profile/organization/stations/stations';
import OrgStationDetail from '../screens/profile/organization/stations/station-detail';
import OrgServiceLines from '../screens/profile/organization/services/service-lines';
import OrgServiceLineDetail from '../screens/profile/organization/services/service-line-detail';
import OrgLineSlots from '../screens/profile/organization/services/line-slots';
import OrgAffiliationTaxes from '../screens/profile/organization/affiliations/affiliation-taxes';
import OrgVehicles from '../screens/profile/organization/resources/vehicles';
import OrgAffiliations from '../screens/profile/organization/affiliations/affiliations';
import OrgCreateAgency from '../screens/profile/organization/agencies/create-agency';
import OrgCreateAgencySuccess from '../screens/profile/organization/agencies/create-agency-success';
import OrgEmployees from '../screens/profile/organization/resources/employees';
import OrgMyOrganization from '../screens/profile/organization/profile/my-organization';
import OrgEditOrganization from '../screens/profile/organization/profile/edit-organization';
import BsmRequest from '../screens/auth/bsm-request';
import BsmRequestSuccess from '../screens/auth/bsm-request-success';
import BsmRequestError from '../screens/auth/bsm-request-error';
import ClientEditCredentials from '../screens/profile/client/profile/edit-credentials';
import AgencyEditCredentials from '../screens/profile/agency/profile/edit-credentials';
import OrgEditCredentials from '../screens/profile/organization/profile/edit-credentials';
import BsmEditCredentials from '../screens/profile/bsm/profile/edit-credentials';
import BsmMain from '../screens/profile/bsm/bsm-main';
import StationDetailBsm from '../screens/profile/bsm/stations/station-detail';
import AgencyDetailBsm from '../screens/profile/bsm/agencies/agency-detail';
import AgencyTripsBsm from '../screens/profile/bsm/agencies/agency-trips';
import TaxDetailBsm from '../screens/profile/bsm/tax/tax-detail';
import TaxFormBsm from '../screens/profile/bsm/tax/tax-form';
import TaxeAffiliationBsm from '../screens/profile/bsm/tax/taxe-affiliation';

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
  BsmRequest: undefined;
  BsmRequestSuccess: undefined;
  BsmRequestError: { message?: string };
  PinSetup: { fromSettings?: boolean };
  PinVerify: undefined;
  ClientMain: { screen?: string } | undefined;
  BookingDetails: { reservationId: string };
  TripsList: { filters?: TripFilters };
  TripsFilter: { filters?: TripFilters };
  TripDetail: { tripId: string };
  AgencyDetail: { agencyId: string };
  StationDetail: { stationId: string };
  ProfileSettings: undefined;
  CacheSettings: undefined;
  Dashboard: undefined;
  Coupons: undefined;
  AgencyMain: undefined;
  AgencyPlanning: undefined;
  AgencyTripDetail: { tripId: string };
  AgencyTripBookings: { tripId: string; tripTitle?: string };
  AgencyNewTrip: { editTripId?: string; duplicateTripId?: string };
  AgencyCalendarDay: { dateStr: string; trips: any[] };
  AgencyInfo: undefined;
  AgencyEditInfo: undefined;
  AgencySubscription: undefined;
  AgencyCodeSecret: undefined;
  OrgMain: undefined;
  OrgMyAgencies: undefined;
  OrgAgencyDetail: { agencyId: string };
  OrgStations: undefined;
  OrgStationDetail: { stationId: string };
  OrgServiceLines: { agencyId: string; agencyName?: string };
  OrgServiceLineDetail: { lineId: string; agencyId: string };
  OrgLineSlots: { lineId: string; agencyId: string; lineName?: string };
  OrgAffiliationTaxes: { agencyId: string; agencyName?: string };
  OrgVehicles: { agencyId: string };
  OrgAffiliations: { agencyId: string };
  OrgCreateAgency: undefined;
  OrgCreateAgencySuccess: undefined;
  OrgEmployees: { agencyId: string; agencyName?: string };
  OrgMyOrganization: undefined;
  OrgEditOrganization: undefined;
  ClientEditCredentials: undefined;
  AgencyEditCredentials: undefined;
  OrgEditCredentials: undefined;
  BsmEditCredentials: undefined;
  BsmMain: undefined;
  StationDetailBsm: undefined;
  AgencyDetailBsm: { agencyId: string };
  AgencyTripsBsm: { agencyId: string; agencyName?: string };
  TaxDetailBsm: { itemId: string };
  TaxFormBsm: { itemId?: string };
  TaxeAffiliationBsm: undefined;
};

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const isDark = useColorScheme() === 'dark';

  return (
    <NavigationContainer>
      <ToastProvider>
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
          <Stack.Screen name="BsmRequest" component={BsmRequest} />
          <Stack.Screen
            name="BsmRequestSuccess"
            component={BsmRequestSuccess}
          />
          <Stack.Screen name="BsmRequestError" component={BsmRequestError} />
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
          <Stack.Screen name="CacheSettings" component={CacheSettings} />
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
          <Stack.Screen
            name="AgencyCalendarDay"
            component={AgencyCalendarDay}
          />
          <Stack.Screen name="AgencyInfo" component={AgencyInfo} />
          <Stack.Screen name="AgencyEditInfo" component={AgencyEditInfo} />
          <Stack.Screen
            name="AgencySubscription"
            component={AgencySubscription}
          />
          <Stack.Screen name="AgencyCodeSecret" component={AgencyCodeSecret} />
          <Stack.Screen name="OrgMain" component={OrgHome} />
          <Stack.Screen name="OrgMyAgencies" component={OrgMyAgencies} />
          <Stack.Screen name="OrgAgencyDetail" component={OrgAgencyDetail} />
          <Stack.Screen name="OrgStations" component={OrgStations} />
          <Stack.Screen name="OrgStationDetail" component={OrgStationDetail} />
          <Stack.Screen name="OrgServiceLines" component={OrgServiceLines} />
          <Stack.Screen
            name="OrgServiceLineDetail"
            component={OrgServiceLineDetail}
          />
          <Stack.Screen name="OrgLineSlots" component={OrgLineSlots} />
          <Stack.Screen
            name="OrgAffiliationTaxes"
            component={OrgAffiliationTaxes}
          />
          <Stack.Screen name="OrgVehicles" component={OrgVehicles} />
          <Stack.Screen name="OrgAffiliations" component={OrgAffiliations} />
          <Stack.Screen name="OrgCreateAgency" component={OrgCreateAgency} />
          <Stack.Screen
            name="OrgCreateAgencySuccess"
            component={OrgCreateAgencySuccess}
          />
          <Stack.Screen name="OrgEmployees" component={OrgEmployees} />
          <Stack.Screen
            name="OrgMyOrganization"
            component={OrgMyOrganization}
          />
          <Stack.Screen
            name="OrgEditOrganization"
            component={OrgEditOrganization}
          />
          <Stack.Screen name="ClientEditCredentials" component={ClientEditCredentials} />
          <Stack.Screen name="AgencyEditCredentials" component={AgencyEditCredentials} />
          <Stack.Screen name="OrgEditCredentials" component={OrgEditCredentials} />
          <Stack.Screen name="BsmEditCredentials" component={BsmEditCredentials} />
          <Stack.Screen name="BsmMain" component={BsmMain} />
          <Stack.Screen name="StationDetailBsm" component={StationDetailBsm} />
          <Stack.Screen name="AgencyDetailBsm" component={AgencyDetailBsm} />
          <Stack.Screen name="AgencyTripsBsm" component={AgencyTripsBsm} />
          <Stack.Screen name="TaxDetailBsm" component={TaxDetailBsm} />
          <Stack.Screen name="TaxFormBsm" component={TaxFormBsm} />
          <Stack.Screen
            name="TaxeAffiliationBsm"
            component={TaxeAffiliationBsm}
          />
        </Stack.Navigator>
      </ToastProvider>
    </NavigationContainer>
  );
}
