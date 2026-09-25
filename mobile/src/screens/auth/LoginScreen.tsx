import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialSymbols } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../services/apiClient';

const PRIMARY_COLOR = '#3649db';
const SURFACE_COLOR = '#f8f9fb';
const TEXT_COLOR = '#191c1e';
const OUTLINE_COLOR = '#757686';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const { setAuth, error, setError, isLoading, setLoading } = useAuthStore();

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'signup' ? '/auth/signup' : '/auth/login';
      const payload = activeTab === 'signup' 
        ? formData 
        : { email: formData.email, password: formData.password };

      const response = await apiClient.post(endpoint, payload) as any;

      if (response.success && response.data) {
        await setAuth(response.data.user, response.data.token);
      } else {
        setError(response.error?.message || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Schedulr</Text>
            </View>
            <Text style={styles.title}>
              {activeTab === 'signup' ? 'Create Free Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              Schedule smarter with AI assistance
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              onPress={() => setActiveTab('signup')}
              style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('signin')}
              style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {activeTab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  value={formData.full_name}
                  onChangeText={(val) => handleInputChange('full_name', val)}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="jane@example.com"
                value={formData.email}
                onChangeText={(val) => handleInputChange('email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialSymbols name={showPassword ? 'visibility_off' : 'visibility'} size={20} color={OUTLINE_COLOR} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {activeTab === 'signup' ? 'Create Free Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing up you agree to our Terms and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: OUTLINE_COLOR,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: OUTLINE_COLOR,
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  form: {
    gap: 20,
  },
  errorBanner: {
    backgroundColor: '#ffdad6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#93000a',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginLeft: 4,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e2e4',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e2e4',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
  },
  submitButton: {
    height: 52,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: OUTLINE_COLOR,
    textAlign: 'center',
    maxWidth: 240,
  }
});
