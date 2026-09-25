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
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#3649db';
const SURFACE_COLOR = '#f8f9fb';
const TEXT_COLOR = '#191c1e';
const OUTLINE_COLOR = '#757686';

export default function OnboardingProfileScreen({ navigation }: any) {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    timezone: 'UTC', // Default for mobile
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/onboarding/profile', formData) as any;
      if (response.success && response.data) {
        await setAuth({ ...user, ...response.data.user }, (await useAuthStore.getState().token) || '');
        navigation.navigate('Integrations');
      } else {
        setError(response.error?.message || 'Failed to save');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Choose a unique username</Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.prefix}>schedulr.ai/</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(t) => setFormData({ ...formData, username: t })}
                  placeholder="jane-doe"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE_COLOR },
  scroll: { padding: 24, flexGrow: 1 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: TEXT_COLOR } as any,
  subtitle: { fontSize: 14, color: OUTLINE_COLOR, marginTop: 8 },
  form: { gap: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: TEXT_COLOR, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e2e4', paddingHorizontal: 16 },
  prefix: { color: OUTLINE_COLOR, fontWeight: 'bold', marginRight: 4 },
  input: { flex: 1, height: 48, fontSize: 16 },
  textArea: { height: 120, paddingTop: 12, textAlignVertical: 'top', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e2e4', paddingHorizontal: 16 },
  button: { height: 52, backgroundColor: PRIMARY_COLOR, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#ffdad6', padding: 12, borderRadius: 8 },
  errorText: { color: '#93000a', fontSize: 12, fontWeight: '600' }
});
