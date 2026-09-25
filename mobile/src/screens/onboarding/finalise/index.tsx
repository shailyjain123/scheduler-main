import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
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

export default function OnboardingFinaliseScreen({ navigation }: any) {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/onboarding/finalise', {}) as any;
      if (response.success) {
        if (user) {
          await setAuth({ ...user, onboarding_completed: true }, (await useAuthStore.getState().token) || '');
        }
        // Navigation is handled by AppNavigator automatically when onboarding_completed changes
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.celebrationIcon}>
            <MaterialSymbols name="celebration" size={48} color="#fff" />
          </View>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>Your personal booking assistant is ready.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.miniIcon, { backgroundColor: PRIMARY_COLOR + '15' }]}>
              <MaterialSymbols name="link" size={20} color={PRIMARY_COLOR} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Your booking link</Text>
              <Text style={styles.infoValue}>schedulr.ai/{user?.username || 'jane-doe'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.miniIcon, { backgroundColor: '#34a85315' }]}>
              <MaterialSymbols name="verified" size={20} color="#34a853" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Profile Verified</Text>
              <Text style={styles.infoStatus}>Ready for bookings</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && { opacity: 0.7 }]} 
          onPress={handleFinalize}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Enter Dashboard</Text>
              <MaterialSymbols name="rocket_launch" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE_COLOR },
  scroll: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  header: { marginBottom: 40, alignItems: 'center' },
  celebrationIcon: { width: 96, height: 96, borderRadius: 32, backgroundColor: PRIMARY_COLOR, alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 10, shadowColor: PRIMARY_COLOR, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: TEXT_COLOR },
  subtitle: { fontSize: 16, color: OUTLINE_COLOR, marginTop: 8, textAlign: 'center' },
  card: { gap: 24, backgroundColor: '#fff', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#e1e2e4', elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  miniIcon: { width: 40, h: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as any,
  infoLabel: { fontSize: 12, fontWeight: 'bold', color: OUTLINE_COLOR },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: PRIMARY_COLOR, marginTop: 2 },
  infoStatus: { fontSize: 11, fontWeight: 'bold', color: TEXT_COLOR, textTransform: 'uppercase', marginTop: 2 },
  button: { height: 60, backgroundColor: TEXT_COLOR, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
