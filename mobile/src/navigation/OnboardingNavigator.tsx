import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingProfileScreen from '../screens/onboarding/profile';
import OnboardingIntegrationsScreen from '../screens/onboarding/integrations';
import OnboardingAvailabilityScreen from '../screens/onboarding/availability';
import OnboardingMeetingTypesScreen from '../screens/onboarding/meeting-types';
import OnboardingFinaliseScreen from '../screens/onboarding/finalise';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Profile" component={OnboardingProfileScreen} />
      <Stack.Screen name="Integrations" component={OnboardingIntegrationsScreen} />
      <Stack.Screen name="Availability" component={OnboardingAvailabilityScreen} />
      <Stack.Screen name="MeetingTypes" component={OnboardingMeetingTypesScreen} />
      <Stack.Screen name="Finalise" component={OnboardingFinaliseScreen} />
    </Stack.Navigator>
  );
}
