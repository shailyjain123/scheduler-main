import React, { useState } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import integrationLinkingService, { IntegrationLinkingResult } from '../services/integrationLinkingService';

interface LinkIntegrationButtonProps {
  provider: 'google' | 'google_meet' | 'microsoft' | 'slack';
  providerName: string;
  isConnected: boolean;
  origin?: 'onboarding' | 'settings';
  onSuccess?: (result: IntegrationLinkingResult) => void;
  onError?: (error: string) => void;
  style?: any;
}

/**
 * Link Integration Button
 * Handles OAuth connection for integrations
 * 
 * Security:
 * - Requires active user session
 * - Uses PKCE OAuth flow
 * - Never creates new users
 * - Email must match current user
 */
export default function LinkIntegrationButton({
  provider,
  providerName,
  isConnected,
  origin = 'settings',
  onSuccess,
  onError,
  style,
}: LinkIntegrationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLink = async () => {
    if (isConnected) {
      // Todo: Implement unlink flow
      console.log(`Unlink ${provider}`);
      return;
    }

    setIsLoading(true);
    try {
      let result: IntegrationLinkingResult;

      // Different flows for different contexts
      if (origin === 'onboarding') {
        if (provider === 'google' || provider === 'google_meet') {
          result = await integrationLinkingService.linkGoogleCalendarOnboarding();
        } else {
          result = await integrationLinkingService.linkIntegrationFromSettings(provider as 'google' | 'microsoft' | 'slack');
        }
      } else {
        result = await integrationLinkingService.linkIntegrationFromSettings(provider as 'google' | 'microsoft' | 'slack');
      }

      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Failed to link integration');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        {
          paddingHorizontal: 16,
          height: 32,
          borderRadius: 8,
          backgroundColor: isConnected ? '#f8f9fb' : '#191c1e',
          justifyContent: 'center',
          borderWidth: isConnected ? 1 : 0,
          borderColor: isConnected ? '#e1e2e4' : 'transparent',
          opacity: isLoading ? 0.7 : 1,
        },
        style,
      ]}
      onPress={handleLink}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={isConnected ? '#191c1e' : '#fff'} size="small" />
      ) : (
        <Text
          style={{
            color: isConnected ? '#757686' : '#fff',
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {isConnected ? 'Unlink' : 'Link'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Integration Card Component
 * Displays integration with link/unlink button
 */
interface IntegrationCardProps {
  id: string;
  name: string;
  icon: string;
  isConnected: boolean;
  color: string;
  origin?: 'onboarding' | 'settings';
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export function IntegrationCard({
  id,
  name,
  icon: iconName,
  isConnected,
  color,
  origin = 'settings',
  onConnect,
  onDisconnect,
  onError,
}: IntegrationCardProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isConnected ? '#3649db40' : '#e1e2e4',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Icon would go here - using placeholder */}
          <Text style={{ fontSize: 20 }}>📱</Text>
        </View>
        <View>
          <Text style={{ fontWeight: 'bold', color: '#191c1e', fontSize: 14 }}>
            {name}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: '#757686',
              textTransform: 'uppercase',
            }}
          >
            {isConnected ? 'Connected' : 'Not linked'}
          </Text>
        </View>
      </View>

      <LinkIntegrationButton
        provider={id as 'google' | 'google_meet' | 'microsoft' | 'slack'}
        providerName={name}
        isConnected={isConnected}
        origin={origin}
        onSuccess={() => onConnect?.()}
        onError={(error) => onError?.(error)}
      />
    </View>
  );
}
