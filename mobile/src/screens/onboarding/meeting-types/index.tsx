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

export default function OnboardingMeetingTypesScreen({ navigation }: any) {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventTypes, setEventTypes] = useState([
    { id: 1, title: '15 Minute Meeting', duration: 15, active: true },
    { id: 2, title: '30 Minute Meeting', duration: 30, active: true },
    { id: 3, title: '60 Minute Meeting', duration: 60, active: false },
  ]);

  const toggleEvent = (id: number) => {
    setEventTypes(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/onboarding/meeting-types', { event_types: eventTypes.filter(e => e.active) }) as any;
      if (response.success) {
        if (user) {
          await setAuth({ ...user, onboarding_stage: 5 }, (await useAuthStore.getState().token) || '');
        }
        navigation.navigate('Finalise');
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
          <Text style={styles.title}>Create event types</Text>
          <Text style={styles.subtitle}>Select your meeting durations</Text>
        </View>

        <View style={styles.list}>
          {eventTypes.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              onPress={() => toggleEvent(event.id)}
              style={[styles.card, event.active && styles.activeCard]}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconBox, event.active && styles.activeIconBox]}>
                  <MaterialSymbols name="event_available" size={24} color={event.active ? '#fff' : OUTLINE_COLOR} />
                </View>
                <View>
                  <Text style={[styles.cardTitle, event.active && styles.activeCardTitle]}>{event.title}</Text>
                  <View style={styles.durationRow}>
                    <MaterialSymbols name="schedule" size={12} color={event.active ? PRIMARY_COLOR : OUTLINE_COLOR} />
                    <Text style={[styles.durationText, event.active && styles.activeDurationText]}>{event.duration} minutes</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.checkbox, event.active && styles.activeCheckbox]}>
                {event.active && <MaterialSymbols name="check" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          ))}
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
  list: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e1e2e4' },
  activeCard: { borderColor: PRIMARY_COLOR + '40', backgroundColor: '#fff' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, h: 44, borderRadius: 12, backgroundColor: SURFACE_COLOR, alignItems: 'center', justifyContent: 'center' } as any,
  activeIconBox: { backgroundColor: PRIMARY_COLOR },
  cardTitle: { fontWeight: 'bold', color: OUTLINE_COLOR, fontSize: 14 },
  activeCardTitle: { color: TEXT_COLOR },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  durationText: { fontSize: 10, fontWeight: 'bold', color: OUTLINE_COLOR, textTransform: 'uppercase' },
  activeDurationText: { color: PRIMARY_COLOR },
  checkbox: { width: 22, h: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e1e2e4', alignItems: 'center', justifyContent: 'center' } as any,
  activeCheckbox: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  button: { height: 52, backgroundColor: PRIMARY_COLOR, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
