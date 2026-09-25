import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialSymbols } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { IntegrationCard } from '../../../components/LinkIntegrationButton';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#3649db';
const SURFACE_COLOR = '#f8f9fb';
const TEXT_COLOR = '#191c1e';
const OUTLINE_COLOR = '#757686';

export default function OnboardingIntegrationsScreen({ navigation }: any) {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  // PKCE OAuth Integration
  const integrations = [
    { 
      id: 'google', 
      name: 'Google Calendar',
      icon: 'calendar_month',
      active: true,
      color: '#4285F4',
      provider: 'google_oauth2'
    },
    { 
      id: 'google_meet', 
      name: 'Google Meet',
      icon: 'video_call',
      active: true,
      color: '#00AC47',
      provider: 'google_oauth2'
    },
    { 
      id: 'zoom', 
      name: 'Zoom Video',
      icon: 'videocam',
      active: true,
      color: '#2D8CFF',
      provider: 'zoom'
    },
    {
      id: 'microsoft',
      name: 'Microsoft Teams',
      icon: 'people',
      active: false,
      color: '#6264A7',
      provider: 'microsoft_graph'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: 'message',
      active: false,
      color: '#E01E5A',
      provider: 'slack'
    }
  ];

  const handleIntegrationConnect = (integrationId: string) => {
    console.log(`[Onboarding] Connecting ${integrationId}`);
    setConnectedIntegrations([...connectedIntegrations, integrationId]);
  };

  const handleIntegrationError = (integrationId: string, error: string) => {
    console.error(`[Onboarding] Integration error for ${integrationId}:`, error);
    
    // Show appropriate error messages
    let message = error;
    if (error.includes('email')) {
      message = `You are logged in as ${user?.email}. Please use that email to connect ${integrationId}.`;
    } else if (error.includes('logged in')) {
      message = 'You must be logged in to connect integrations.';
    }
    
    Alert.alert('Connection Failed', message, [{ text: 'OK' }]);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Save which integrations were connected
      const response = await apiClient.post('/onboarding/integrations', {
        integrations: { connected: connectedIntegrations }
      }) as any;
      
      if (response.success) {
        if (user) {
          await setAuth(
            { ...user, onboarding_stage: 3 },
            (await useAuthStore.getState().token) || ''
          );
        }
        navigation.navigate('Availability');
      } else {
        setError(response.error?.message || 'Failed to save');
      }
    } catch (err) {
      setError('Connection error');
      console.error('[Integrations] Submit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect your tools</Text>
          <Text style={styles.subtitle}>
            Link your calendar and video apps securely with OAuth
          </Text>
        </View>

        <View style={styles.list}>
          {integrations.map((item) => (
            <IntegrationCard
              key={item.id}
              id={item.id}
              name={item.name}
              icon={item.icon}
              isConnected={connectedIntegrations.includes(item.id)}
              color={item.color}
              origin="onboarding"
              onConnect={() => handleIntegrationConnect(item.id)}
              onDisconnect={() => {
                setConnectedIntegrations(
                  connectedIntegrations.filter(i => i !== item.id)
                );
              }}
              onError={(error) => handleIntegrationError(item.id, error)}
            />
          ))}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, isLoading && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.skipText}>You can skip this page and connect integrations later in settings</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE_COLOR },
  scroll: { padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: TEXT_COLOR },
  subtitle: { fontSize: 13, color: OUTLINE_COLOR, marginTop: 4 },
  list: { gap: 12 },
  errorBox: { 
    backgroundColor: '#fef3cd', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  errorText: { 
    color: '#856404', 
    fontSize: 12,
    fontWeight: '500'
  },
  button: { 
    height: 52, 
    backgroundColor: PRIMARY_COLOR, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  skipText: {
    fontSize: 11,
    color: OUTLINE_COLOR,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24
  }
});
