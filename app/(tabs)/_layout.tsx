import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '../../store/settingsStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { View, Text } from 'react-native';
import { isSupabaseAvailable } from '../../lib/supabase';
import { useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { theme } = useSettingsStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const backgroundColor = theme === 'dark' || theme === 'system' ? '#0d0f12' : '#ffffff';
  const unselectedColor = '#8a8fa3';
  const tintColor = '#4f7cff';

  const offlineMode = !isSupabaseAvailable();

  const tabBarStyle = isWide
    ? {
        backgroundColor,
        borderTopColor: '#2a2f3d',
        paddingBottom: 0,
        paddingTop: 0,
        width: 80,
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
      }
    : {
        backgroundColor,
        borderTopColor: '#2a2f3d',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      };

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
        tabBarStyle,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: unselectedColor,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Learn',
          tabBarLabel: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Practice',
          tabBarLabel: 'Practice',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="reader" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
