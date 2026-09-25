import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/authStore';
import oauthService, { getDeepLink } from '../services/oauthService';
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingNavigator from './OnboardingNavigator';
import { View, Text, TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator();

// Deep Linking Configuration
const linking: LinkingOptions<any> = {
  prefixes: [getDeepLink(), 'scheduler://', 'https://scheduler.app'],
  config: {
    screens: {
      OAuthCallback: 'oauth-callback',
      Onboarding: 'onboarding/:page',
      Main: 'dashboard',
      Auth: 'login',
    },
  },
};

/**
 * OAuth Callback Handler
 * Processes the OAuth redirect from provider (Google, Microsoft, Slack)
 * Handles both authentication and connection flows
 */
function OAuthCallbackScreen() {
  const [processing, setProcessing] = React.useState(true);
  const { user, setAuth } = useAuthStore();
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get the deep link URL with query parameters
      const initialUrl = await Linking.getInitialURL();
      const context = await oauthService.getOAuthContext();

      if (!context.context || !context.provider) {
        throw new Error('Invalid OAuth context');
      }

      // Context determines which flow:
      // - 'login': User authenticating (no current session)
      // - 'connection': User linking integration to existing account
      console.log(`[OAuth] Callback received - context: ${context.context}, provider: ${context.provider}`);

      if (context.context === 'login') {
        // Authentication flow: Backend will create/login user and return token
        // Navigate to Auth screen for manual token exchange
        // (In production, use OAuth server's redirect with code)
        console.log('[OAuth] Login flow - user should see auth completion screen');
      } else if (context.context === 'connection') {
        // Connection flow: Backend linked integration to current user
        // Return to onboarding or settings
        if (context.origin === 'onboarding') {
          navigationRef.current?.navigate('Onboarding', { screen: 'Integrations', initial: false });
        } else {
          navigationRef.current?.navigate('Main');
        }
      }

      setProcessing(false);
    } catch (error) {
      console.error('[OAuth] Callback error:', error);
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fb' }}>
        <Text>Processing OAuth callback...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fb' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Connected Successfully!</Text>
      <Text>Redirecting...</Text>
    </View>
  );
}

function DashboardScreen() {
  const { clearAuth } = useAuthStore();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fb' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#191c1e', marginBottom: 20 }}>Dashboard</Text>
      <TouchableOpacity 
        onPress={() => clearAuth()}
        style={{ padding: 12, backgroundColor: '#3649db', borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { user } = useAuthStore();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !user.onboarding_completed ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={DashboardScreen} />
            <Stack.Group screenOptions={{ presentation: 'modal', animationEnabled: false }}>
              <Stack.Screen name="OAuthCallback" component={OAuthCallbackScreen} />
            </Stack.Group>
          </>
        )
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
