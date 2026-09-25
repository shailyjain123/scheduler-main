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

export default function OnboardingAvailabilityScreen({ navigation }: any) {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availability, setAvailability] = useState({
    start_time: '09:00',
    end_time: '17:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  });

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day) 
        : [...prev.days, day]
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/onboarding/availability', { availability }) as any;
      if (response.success) {
        if (user) {
          await setAuth({ ...user, onboarding_stage: 4 }, (await useAuthStore.getState().token) || '');
        }
        navigation.navigate('MeetingTypes');
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
          <Text style={styles.title}>Set your availability</Text>
          <Text style={styles.subtitle}>Define your meeting hours</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.label}>Start Time</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputText}>{availability.start_time}</Text>
                <MaterialSymbols name="schedule" size={18} color={OUTLINE_COLOR} />
              </View>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.label}>End Time</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputText}>{availability.end_time}</Text>
                <MaterialSymbols name="schedule" size={18} color={OUTLINE_COLOR} />
              </View>
            </View>
          </View>

          <View style={styles.daySelection}>
            <Text style={styles.label}>Available Days</Text>
            <View style={styles.dayRow}>
              {daysOfWeek.map((day) => {
                const active = availability.days.includes(day) || availability.days.some(d => d.startsWith(day));
                return (
                  <TouchableOpacity 
                    key={day} 
                    onPress={() => toggleDay(day)}
                    style={[styles.dayButton, active && styles.activeDayButton]}
                  >
                    <Text style={[styles.dayText, active && styles.activeDayText]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>
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
  form: { gap: 24, backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e1e2e4' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeBox: { flex: 1 },
  label: { fontSize: 11, fontWeight: 'bold', color: TEXT_COLOR, textTransform: 'uppercase', marginBottom: 8 },
  inputBox: { height: 48, backgroundColor: SURFACE_COLOR, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  inputText: { fontSize: 14, fontWeight: 'bold', color: TEXT_COLOR },
  daySelection: { marginTop: 8 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayButton: { width: 44, h: 44, borderRadius: 12, backgroundColor: SURFACE_COLOR, alignItems: 'center', justifyContent: 'center' } as any,
  activeDayButton: { backgroundColor: PRIMARY_COLOR },
  dayText: { fontSize: 11, fontWeight: 'bold', color: OUTLINE_COLOR },
  activeDayText: { color: '#fff' },
  button: { height: 52, backgroundColor: PRIMARY_COLOR, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
