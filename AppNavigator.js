import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

import SplashScreen      from '../screens/SplashScreen';
import TutorialScreen    from '../screens/TutorialScreen';
import LoginScreen       from '../screens/LoginScreen';
import RegisterScreen    from '../screens/RegisterScreen';
import WelcomeScreen     from '../screens/WelcomeScreen';
import MainTabs          from './MainTabs';
import AddPlantScreen    from '../screens/AddPlantScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <>
            <Stack.Screen name="Tutorial" component={TutorialScreen} />
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome"     component={WelcomeScreen} />
            <Stack.Screen name="Main"        component={MainTabs} />
            <Stack.Screen name="AddPlant"    component={AddPlantScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="PlantDetail" component={PlantDetailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}