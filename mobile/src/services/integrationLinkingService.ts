import oauthService from './oauthService';
import { API_BASE_URL } from './apiClient';

/**
 * Integration Linking Service
 * Handles OAuth provider connection for onboarding and settings
 * 
 * Security:
 * - Requires active user session
 * - Uses PKCE for mobile OAuth
 * - Validates state parameter
 * - Never creates new users during connection
 */

export interface IntegrationLinkingResult {
  success: boolean;
  provider: string;
  error?: string;
  message?: string;
}

export class IntegrationLinkingService {
  private static instance: IntegrationLinkingService;

  private constructor() {}

  public static getInstance(): IntegrationLinkingService {
    if (!IntegrationLinkingService.instance) {
      IntegrationLinkingService.instance = new IntegrationLinkingService();
    }
    return IntegrationLinkingService.instance;
  }

  /**
  * Initiates OAuth connection for Google Calendar during onboarding integrations page
   * after user has already logged in
   * 
   * CRITICAL SECURITY:
   * - User must already be logged in (current session token required)
   * - Email from Google must match current user's email
   * - No new user creation possible (separate endpoint)
   * - If email mismatch, connection is rejected
   */
  async linkGoogleCalendarOnboarding(): Promise<IntegrationLinkingResult> {
    try {
      const result = await oauthService.initiateIntegrationConnection('google', 'onboarding');
      
      return {
        success: result.success,
        provider: 'google',
        error: result.error,
        message: result.success ? 'Google Calendar connected successfully' : 'Failed to link Google Calendar',
      };
    } catch (error) {
      return {
        success: false,
        provider: 'google',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Initiates OAuth connection for Google Meet during onboarding
   */
  async linkGoogleMeetOnboarding(): Promise<IntegrationLinkingResult> {
    try {
      const result = await oauthService.initiateIntegrationConnection('google', 'onboarding');
      
      return {
        success: result.success,
        provider: 'google_meet',
        error: result.error,
        message: result.success ? 'Google Meet connected successfully' : 'Failed to link Google Meet',
      };
    } catch (error) {
      return {
        success: false,
        provider: 'google_meet',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Initiates OAuth connection from settings page
   */
  async linkIntegrationFromSettings(provider: 'google' | 'microsoft' | 'slack'): Promise<IntegrationLinkingResult> {
    try {
      const result = await oauthService.initiateIntegrationConnection(provider, 'settings');
      
      return {
        success: result.success,
        provider,
        error: result.error,
        message: result.success ? `${provider} connected successfully` : `Failed to link ${provider}`,
      };
    } catch (error) {
      return {
        success: false,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Disconnects OAuth provider
   * Makes API call to backend to unlink external identity
   */
  async unlinkIntegration(provider: string): Promise<IntegrationLinkingResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/${provider}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('../store/authStore')).useAuthStore.getState().token}`,
        },
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        provider,
        message: data.message || (response.ok ? 'Disconnected successfully' : 'Failed to disconnect'),
      };
    } catch (error) {
      return {
        success: false,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default IntegrationLinkingService.getInstance();
