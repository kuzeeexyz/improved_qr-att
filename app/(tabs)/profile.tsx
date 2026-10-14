import { useState, useCallback  } from 'react';
import { StyleSheet, Text, View, Alert, Pressable, TextInput} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, Profile, updateProfile } from '@/lib/profiles'


export default function ProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const profile = await getProfile(user.id);
    setProfile(profile);
    setDraftName(profile?.full_name ?? '');
  }, [user]);

useFocusEffect(
  useCallback(() => {
    loadProfile();
  }, [loadProfile])
);


const handleSaveName = async () => {
  if (!user) return;
  setSaving(true);
  const { error } = await updateProfile(user.id, { full_name: draftName.trim() });
  setSaving(false);
  if (error) {
    Alert.alert('Error', error);
  } else {
    setProfile((prev) => (prev ? { ...prev, full_name: draftName.trim() } : prev));
    setEditing(false);
  }
};


  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.value}>{profile?.full_name || 'User'}</Text>
          {profile?.role === 'teacher' ? (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Teacher</Text>
          </View>
        ) : (
          <View style={[styles.roleBadge, styles.roleBadgeStudent]}>
            <Text style={styles.roleBadgeText}>Student</Text>
          </View>
        )}
        </View>


      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{profile?.email || 'user@gmail.com'}</Text>

        <Text style={styles.label}>User ID</Text>
        <Text style={styles.valueSmall}>{profile?.id || 'N/A'}</Text>
        {editing ? (
          <View style={styles.nameEditRow}>
            <TextInput style={styles.nameInput} value={draftName} onChangeText={setDraftName} placeholder="Enter your new full name" />
            <Pressable onPress={handleSaveName}>
              <Text style={styles.editHint}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
            <Text style={styles.editHint}>Tap here to Edit your Full Name</Text>
          </Pressable>
          
        )}
      </View>

      <AppButton
        title="Sign Out"
        icon="log-out-outline"
        onPress={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    width: 80,
    backgroundColor: '#98d1ff',
    alignItems: 'center',
  },
  roleBadgeStudent: {
    backgroundColor: '#22fc6b',
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  nameRow: {
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    color: COLORS.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameEditRow: {
    backgroundColor: COLORS.card,   
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingVertical:4,
    paddingHorizontal: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
  },

  editHint: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
  },

});
