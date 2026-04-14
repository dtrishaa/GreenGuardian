// src/screens/NotificationSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { loadNotificationTime, saveNotificationTime, sendTestNotification } from '../services/NotificationService';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NotificationSettingsScreen() {
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadNotificationTime().then(({ hour, minute }) => {
      const date = new Date();
      date.setHours(hour, minute);
      setTime(date);
    });
  }, []);

  const onTimeChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setTime(selectedDate);
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      saveNotificationTime(hour, minute);
      Alert.alert('Updated', `Daily reminder set for ${hour}:${minute.toString().padStart(2,'0')}`);
    }
  };

  const sendTest = () => {
    sendTestNotification('Test Reminder', 'This is a test notification from GreenGuardian');
  };

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Reminder Time</Text>
        <TouchableOpacity style={styles.timeButton} onPress={() => setShowPicker(true)}>
          <Ionicons name="time-outline" size={24} color="#2e7d32" />
          <Text style={styles.timeText}>
            {time.getHours()}:{time.getMinutes().toString().padStart(2,'0')}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={onTimeChange}
          />
        )}
        <TouchableOpacity style={styles.testButton} onPress={sendTest}>
          <Text style={styles.testText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 24 },
  timeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 12, elevation: 2 },
  timeText: { fontSize: 20, fontWeight: '600', color: '#2e7d32' },
  testButton: { marginTop: 40, backgroundColor: '#2e7d32', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 },
  testText: { color: '#fff', fontWeight: '600' },
});