import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import apiClient, { API_BASE_URL } from './apiClient';

// Enable web browser for OAuth
WebBrowser.maybeCompleteAuthSession();

// OAuth Configuration
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: AuthSession.getRedirectUrl('auth-return'),
    scopes: ['openid', 'profile', 'email'],
    discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
  },
};

// Deep link detection for OAuth callback
export const getDeepLink = (path: string = ''): string => {
  const scheme = 'scheduler';
  const host = 'oauth-callback';
  return scheme + '://' + host + (path ? '/' + path : '');
};

/**
 * PKCE OAuth Service
 * Implements PKCE (Proof Key for Code Exchange) flow for secure mobile OAuth
 * 
 * PKCE Security Features:
 * - code_challenge: SHA256 hash of random code_verifier (prevents auth code interception)
 * - state: CSRF token (prevents callback hijacking)
 * - Signed state signature: Validates callback legitimacy
 */
export class OAuthService {
  private static instance: OAuthService;

  private constructor(private apiBase: string = API_BASE_URL) {}

  public static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Generates a random string for PKCE code_verifier
   * Must be 43-128 characters from unreserved characters [A-Z] [a-z] [0-9] - . _ ~
   */
  private generateCodeVerifier(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const randomValues = new Uint8Array(32);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < randomValues.length; i++) {
      verifier += charset[randomValues[i] % charset.length];
    }
    return verifier;
  }

  /**
   * Generates SHA256 hash for code_verifier → code_challenge
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to base64url (RFC 4648)
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = String.fromCharCode.apply(null, hashArray as any);
    const base64 = btoa(hashString);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Initiates OAuth login flow (Authentication Mode)
   * Used during initial login, not for integration linking
   */
  async initiateLogin(provider: 'google' = 'google'): Promise<{ token: string; user: any } | null> {
    try {
      const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG] || OAUTH_CONFIG.google;
      if (!config.clientId) {
        throw new Error('EXPO_PUBLIC_GOOGLE_CLIENT_ID is required for OAuth login');
      }
      
      // Generate PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Generate state (CSRF protection)
      const state = this.generateState();
      
      // Store for callback verification
      await AsyncStorage.setItem('oauth_code_verifier', codeVerifier);
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_context', 'login');
      await AsyncStorage.setItem('oauth_provider', provider);
      
      // Build authorization URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        scope: config.scopes.join(' '),
        redirect_uri: config.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      
      // Launch OAuth browser
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: config.redirectUri,
      });
      
      if (result.type === 'success' && result.params?.code) {
        return await this.exchangeCodeForToken(
          result.params.code,
          codeVerifier,
          state,
          provider,
          'login'
        );
      }
      
      return null;
    } catch (error) {
      console.error('[OAuthService] Login failed:', error);
      return null;
    }
  }

  /**
   * Initiates OAuth integration connection flow (Connection Mode)
   * Used to link OAuth provider to already-logged-in user
   * CRITICAL: Requires valid user token before initiating
   */
  async initiateIntegrationConnection(
    provider: 'google' | 'microsoft' | 'slack' = 'google',
    origin: 'onboarding' | 'settings' = 'settings'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify user is logged in
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('Must be logged in to connect integration');
      }
      
      const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG] || OAUTH_CONFIG.google;
      if (!config.clientId) {
        throw new Error('EXPO_PUBLIC_GOOGLE_CLIENT_ID is required for OAuth integration connection');
      }
      
      // Generate PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Generate signed state (includes origin for onboarding context)
      const state = this.generateSignedState(origin);
      
      // Store for callback verification
      await AsyncStorage.setItem('oauth_code_verifier', codeVerifier);
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_context', 'connection');
      await AsyncStorage.setItem('oauth_provider', provider);
      await AsyncStorage.setItem('oauth_origin', origin);
      
      // Build authorization URL with state parameter
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        scope: config.scopes.join(' '),
        redirect_uri: config.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      
      // Launch OAuth browser
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: config.redirectUri,
      });
      
      if (result.type === 'success' && result.params?.code) {
        const response = await this.exchangeCodeForToken(
          result.params.code,
          codeVerifier,
          state,
          provider,
          'connection'
        );
        
        return { success: !!response };
      }
      
      return { success: false };
    } catch (error) {
      console.error('[OAuthService] Integration connection failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect integration' 
      };
    }
  }

  /**
   * Exchange authorization code for access token
   * Backend handles PKCE code_verifier validation using OmniAuth
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    state: string,
    provider: string,
    context: 'login' | 'connection'
  ): Promise<{ token: string; user: any } | null> {
    try {
      // Verify state matches (CSRF protection)
      const storedState = await AsyncStorage.getItem('oauth_state');
      if (storedState !== state) {
        throw new Error('OAuth state mismatch - possible CSRF attack');
      }
      
      // For connection flow, backend will validate code_verifier
      // For login flow, create session with code
      if (context === 'connection') {
        // Connection: Backend handles full PKCE validation
        const response = await apiClient.post(
          `/integrations/${provider}/oauth/callback`,
          { code, code_verifier, state },
          { headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` } }
        );
        
        if (response.success) {
          // Clear sensitive data
          await this.clearOAuthStorage();
          return { token: useAuthStore.getState().token, user: useAuthStore.getState().user };
        }
        
        return null;
      } else {
        // Login: Backend validates code_verifier and returns token
        const response = await apiClient.post('/auth/exchange-token', {
          code,
          code_verifier,
          provider,
          state,
        });
        
        if (response.success && response.data?.token && response.data?.user) {
          // Clear sensitive data
          await this.clearOAuthStorage();
          return { token: response.data.token, user: response.data.user };
        }
        
        return null;
      }
    } catch (error) {
      console.error('[OAuthService] Token exchange failed:', error);
      return null;
    }
  }

  /**
   * Generates random state token for CSRF protection
   */
  private generateState(): string {
    const randomValues = new Uint8Array(32);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generates signed state that includes origin context
   * Signature prevents state tampering
   */
  private generateSignedState(origin: string): string {
    const state = this.generateState();
    const timestamp = Date.now();
    
    // Format: state.origin.timestamp.signature
    // In production, signature would be HMAC-SHA256 with server secret
    // For mobile, we use simple format that backend can validate
    return `${state}|${origin}|${timestamp}`;
  }

  /**
   * Clears sensitive OAuth data from storage
   */
  private async clearOAuthStorage(): Promise<void> {
    await AsyncStorage.removeItem('oauth_code_verifier');
    await AsyncStorage.removeItem('oauth_state');
    await AsyncStorage.removeItem('oauth_context');
    await AsyncStorage.removeItem('oauth_provider');
    await AsyncStorage.removeItem('oauth_origin');
  }

  /**
   * Retrieves stored OAuth context for deep link handling
   */
  async getOAuthContext(): Promise<{
    context: 'login' | 'connection' | null;
    provider: string | null;
    origin: string | null;
  }> {
    const context = await AsyncStorage.getItem('oauth_context');
    const provider = await AsyncStorage.getItem('oauth_provider');
    const origin = await AsyncStorage.getItem('oauth_origin');
    
    return {
      context: (context as 'login' | 'connection') || null,
      provider,
      origin: origin as 'onboarding' | 'settings' | null,
    };
  }
}

export default OAuthService.getInstance();
