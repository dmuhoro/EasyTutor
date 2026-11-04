import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase, isSupabaseAvailable } from '../../lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { track } from '../../lib/analytics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const authLock = useRef(false);

  const handleAuth = async () => {
    if (authLock.current || loading) return;
    
    // Guard: Check if Supabase is available
    if (!isSupabaseAvailable()) {
      Alert.alert(
        'Offline Mode', 
        'Authentication is not available offline. Please check your internet connection and try again.'
      );
      return;
    }

    authLock.current = false;

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      authLock.current = false;
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        // Track sign-up event — user_id available immediately from signup response
        if (data.user?.id) {
          track('user_registered', { user_id: data.user.id });
        }
        Alert.alert('Success', 'Check your email for the confirmation link!');
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      authLock.current = false;
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/auth_background.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <LinearGradient
          colors={['transparent', 'rgba(13, 15, 18, 0.8)', '#0d0f12']}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo/Header Session */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-[#4f7cff] rounded-3xl items-center justify-center shadow-2xl shadow-[#4f7cff]/40 mb-6">
                <Ionicons name="school" size={40} color="white" />
              </View>
              <Text className="text-white text-4xl font-bold font-syne text-center">
                EasyTutor
              </Text>
              <Text className="text-[#8a8fa3] text-lg font-dmsans text-center mt-2">
                Your AI Study Partner
              </Text>
            </View>

            {/* Input Session */}
            <View className="bg-[#161920]/80 p-6 rounded-[40px] border border-[#2a2f3d]/50 backdrop-blur-xl">
              <Text className="text-white text-2xl font-bold font-syne mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text className="text-[#8a8fa3] font-dmsans mb-8">
                {isSignUp ? 'Join the community of self-taught learners.' : 'Sign in to continue your learning journey.'}
              </Text>

              <View className="mb-4">
                <View className="bg-[#0d0f12] border border-[#2a2f3d] rounded-2xl flex-row items-center px-4 mb-4">
                  <Ionicons name="mail" size={20} color="#8a8fa3" />
                  <TextInput
                    placeholder="Email Address"
                    placeholderTextColor="#4b5563"
                    className="flex-1 h-16 text-white ml-3 font-dmsans"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View className="bg-[#0d0f12] border border-[#2a2f3d] rounded-2xl flex-row items-center px-4">
                  <Ionicons name="lock-closed" size={20} color="#8a8fa3" />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#4b5563"
                    className="flex-1 h-16 text-white ml-3 font-dmsans"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              {!isSignUp && (
                <TouchableOpacity className="self-end mb-8">
                  <Text className="text-[#4f7cff] font-bold font-dmsans">Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={async () => {
                  if (!isSupabaseAvailable()) {
                    Alert.alert('Offline Mode', 'Authentication is not available offline.');
                    return;
                  }
                  setLoading(true);
                  try {
                    const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google' });
                    if (error) throw error;
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Google sign-in failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-white h-16 rounded-2xl items-center justify-center mt-4"
              >
                <Text className="text-black font-bold font-dmsans">Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAuth}
                disabled={loading || authLock.current}
                className="bg-[#4f7cff] h-16 rounded-2xl items-center justify-center shadow-lg shadow-[#4f7cff]/20"
                style={{ marginTop: isSignUp ? 12 : 0 }}
              >
                {loading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" className="mr-2" />
                    <Text className="text-white text-lg font-bold font-syne">
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-lg font-bold font-syne">
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Switch Mode */}
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              className="mt-8 self-center flex-row"
            >
              <Text className="text-[#8a8fa3] font-dmsans">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <Text className="text-[#4f7cff] font-bold font-dmsans">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
