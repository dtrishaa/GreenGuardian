// src/services/NotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import { auth, db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedWeather = null;
let lastFetch = 0;

async function getWeatherForLocation() {
  const now = Date.now();
  if (cachedWeather && (now - lastFetch) < 3600000) return cachedWeather;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    let WEATHER_API_KEY;
    try { WEATHER_API_KEY = require('@env').WEATHER_API_KEY; } catch(e) { WEATHER_API_KEY = null; }
    if (!WEATHER_API_KEY) return null;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.weather) {
      cachedWeather = data;
      lastFetch = now;
      return data;
    }
  } catch (error) { console.warn('Weather fetch error:', error); }
  return null;
}

const NOTIFICATION_TIME_KEY = '@notification_time';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Alert.alert('Failed to get push token for push notification!');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

export async function getDueTasksForPlant(plant) {
  const now = new Date();
  const tasks = [];

  let waterDiff = plant.lastWatered
    ? Math.ceil((new Date(plant.lastWatered).getTime() + plant.wateringInterval * 86400000 - now) / 86400000)
    : 0;

  if (waterDiff <= 0) {
    const weather = await getWeatherForLocation();
    if (weather && weather.weather[0].main.toLowerCase().includes('rain')) {
      waterDiff = 1;
    }
  }
  if (waterDiff <= 0) tasks.push({ type: 'water', label: '💧 Water' });

  if (plant.reminders?.fertilize) {
    const fertDiff = plant.lastFertilized
      ? Math.ceil((new Date(plant.lastFertilized).getTime() + plant.reminders.fertilize * 86400000 - now) / 86400000)
      : 0;
    if (fertDiff <= 0) tasks.push({ type: 'fertilize', label: '🌿 Fertilise' });
  }

  if (plant.reminders?.mist) {
    const mistDiff = plant.lastMisted
      ? Math.ceil((new Date(plant.lastMisted).getTime() + plant.reminders.mist * 86400000 - now) / 86400000)
      : 0;
    if (mistDiff <= 0) tasks.push({ type: 'mist', label: '💨 Mist' });
  }

  if (plant.reminders?.repot) {
    const repotDiff = plant.lastRepotted
      ? Math.ceil((new Date(plant.lastRepotted).getTime() + plant.reminders.repot * 86400000 - now) / 86400000)
      : 0;
    if (repotDiff <= 0) tasks.push({ type: 'repot', label: '🪴 Repot' });
  }

  return tasks;
}

export async function checkAndNotifyDueTasks() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snap = await db.collection('plants').where('userId', '==', user.uid).get();
    const plants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const dueMap = new Map();

    for (const plant of plants) {
      const tasks = await getDueTasksForPlant(plant);
      if (tasks.length) {
        dueMap.set(plant.id, {
          name: plant.name,
          tasks,
          emoji: plant.emoji || '🌿',
        });
      }
    }

    if (dueMap.size === 0) return;

    const entries = Array.from(dueMap.values()).slice(0, 3);
    let body = entries.map(p => `${p.emoji} ${p.name}: ${p.tasks.map(t => t.label).join(', ')}`).join('\n');
    if (dueMap.size > 3) body += `\n+ ${dueMap.size - 3} more plant(s)`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌱 Plant Care Reminder',
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to check due tasks:', error);
  }
}

export async function scheduleDailyNotification(hour = 9, minute = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Correct trigger for daily repeating notification
  const trigger = {
    type: 'daily',
    hour,
    minute,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌱 GreenGuardian',
      body: 'Check your plants – some may need care today!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
}

export async function saveNotificationTime(hour, minute) {
  await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, JSON.stringify({ hour, minute }));
  await scheduleDailyNotification(hour, minute);
}

export async function loadNotificationTime() {
  const stored = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
  if (stored) return JSON.parse(stored);
  return { hour: 9, minute: 0 };
}

export async function sendTestNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}