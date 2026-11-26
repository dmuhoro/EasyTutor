import { LEGACY_COLORS } from '../src/design/legacyPalette';
/**
 * ProfileSwitcher - Shared-device profile management UI
 *
 * Shows the current active profile and allows switching between profiles,
 * creating new profiles, and managing PIN protection.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useActiveProfileStore } from '../store/activeProfileStore';
import { getActiveProfile, loadProfiles, switchProfile, createProfile, profileHasPin, verifyPin, deleteProfile } from '../lib/auth/localProfiles';

export const ProfileSwitcher = () => {
  const { activeProfileId, setActiveProfileId, switchToProfile, isLoading } = useActiveProfileStore();
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string>('');
  const [createMode, setCreateMode] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState('👤');

  type ProfileType = {
    id: string;
    name: string;
    avatar?: string;
    createdAt: string;
    lastActiveAt: string;
    pinHash?: string;
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const refreshProfiles = async () => {
    const ps = await loadProfiles();
    setProfiles(ps);
  };

  const handleSwitch = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    // Check if PIN is set
    const hasPin = await profileHasPin(profileId);
    if (hasPin) {
      setPendingProfileId(profileId);
      setShowPinPrompt(true);
      return;
    }

    await switchToProfile(profileId);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingProfileId) return;
    const ok = await verifyPin(pendingProfileId, pin);
    if (ok) {
      await switchToProfile(pendingProfileId);
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
    }
    setShowPinPrompt(false);
    setPendingProfileId('');
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Enter a name', 'Please give your profile a name.');
      return;
    }
    const profile = await createProfile(newProfileName, newProfileAvatar);
    await switchToProfile(profile.id);
    setNewProfileName('');
    setCreateMode(false);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      Alert.alert('Cannot delete', 'You must keep at least one profile.');
      return;
    }
    const confirmed = await Alert.alert(
      'Delete profile?',
      'This profile and all its data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const ok = await deleteProfile(profileId);
          if (ok) {
            setProfiles(await loadProfiles());
            if (activeProfileId === profileId) {
              const remaining = await loadProfiles();
              if (remaining.length > 0) {
                await switchToProfile(remaining[0].id);
              }
            }
          }
        }},
      ]
    );
  };

  if (isLoading || isSwitching) {
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="large" color={LEGACY_COLORS.blueRibbon} />
      </View>
    );
  }

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: LEGACY_COLORS.nightCanvas }}>
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: LEGACY_COLORS.nightSurface, borderWidth: 2, borderColor: activeProfileId ? LEGACY_COLORS.blueRibbon : LEGACY_COLORS.nightBorder, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={(activeProfile?.avatar || 'person') as any} size={28} color={activeProfileId ? LEGACY_COLORS.blueRibbon : LEGACY_COLORS.nightTextMuted} />
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ color: LEGACY_COLORS.whiteShort, fontSize: 18, fontWeight: 'bold' }}>{activeProfile?.name || 'No profile'}</Text>
            <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 14 }}>{activeProfileId ? 'Active profile' : 'No active profile'}</Text>
          </View>
          <TouchableOpacity onPress={() => setCreateMode(true)} style={{ marginLeft: 12 }}>
            <Ionicons name="create" size={24} color={LEGACY_COLORS.blueRibbon} />
          </TouchableOpacity>
        </View>

        <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 14, marginBottom: 12, marginLeft: 4 }}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
        </Text>

        <View style={{ marginBottom: 20 }}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => handleSwitch(profile.id)}
                style={{
                  backgroundColor: isActive ? LEGACY_COLORS.nightSurface : LEGACY_COLORS.nightCanvas,
                  borderWidth: 2,
                  borderColor: isActive ? LEGACY_COLORS.blueRibbon : LEGACY_COLORS.nightBorder,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isActive ? LEGACY_COLORS.blueRibbon : LEGACY_COLORS.nightBorder, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={(profile.avatar || 'person') as any} size={22} color={isActive ? LEGACY_COLORS.whiteShort : LEGACY_COLORS.nightTextMuted} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: LEGACY_COLORS.whiteShort, fontSize: 16, fontWeight: 'medium' }}>{profile.name}</Text>
                  <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 12, marginTop: 2 }}>
                    {profile.pinHash ? 'PIN protected' : 'No PIN'} • Last active {new Date(profile.lastActiveAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleSwitch(profile.id)} style={{ marginRight: 10 }}>
                    <Ionicons name={isActive ? 'checkmark-circle' : 'radio-button-off'} size={20} color={isActive ? LEGACY_COLORS.blueRibbon : LEGACY_COLORS.nightTextMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteProfile(profile.id)} style={{ marginRight: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={LEGACY_COLORS.red500} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setCreateMode(true)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: LEGACY_COLORS.blueRibbon, borderRadius: 12 }}>
            <Ionicons name="add" size={20} color={LEGACY_COLORS.blueRibbon} />
            <Text style={{ color: LEGACY_COLORS.blueRibbon, fontWeight: 'bold', marginLeft: 12 }}>Add profile</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => {
          setActiveProfileId(null);
        }} style={{ padding: 16 }}>
          <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 14 }}>Use cloud account ({user?.email || 'none'})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const ProfileSwitcherModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  if (!visible) return null;
  return (
    <ProfileSwitcher />
  );
};