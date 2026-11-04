import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '../../store/settingsStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { View, Text } from 'react-native';
import { isSupabaseAvailable } from '../../lib/supabase';

export default function TabLayout() {
  const { theme } = useSettingsStore();
  
  const backgroundColor = theme === 'dark' || theme === 'system' ? '#0d0f12' : '#ffffff';
  const unselectedColor = '#8a8fa3';
  const tintColor = '#4f7cff';
  
  const offlineMode = !isSupabaseAvailable();

  return (
    <>
    {offlineMode && (
      <View className="bg-warning/20 px-4 py-2 flex-row justify-center items-center">
        <Ionicons name="warning" size={16} color="#f59e0b" />
        <Text className="text-warning font-dmsans text-sm ml-2 font-bold">Using Offline Mode</Text>
      </View>
    )}
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: backgroundColor,
          borderBottomColor: '#2a2f3d',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: 'white',
          fontFamily: 'syne',
          fontWeight: 'bold',
        },
        headerRight: () => (
          <View style={{ marginRight: 20 }}>
            <SyncIndicator />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: backgroundColor,
          borderTopColor: '#2a2f3d',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: unselectedColor,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'EasyTutor',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Roadmap',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
