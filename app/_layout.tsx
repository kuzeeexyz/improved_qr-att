import { useEffect, useState } from 'react';
import {
  Redirect,
  Stack,
  useSegments,
  useRouter,
} from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, Role } from '@/lib/profiles';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const userId = session?.user?.id;

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!userId) {
      setRole(null);
      setProfileError(null);
      setProfileLoading(false);

      return () => {
        active = false;
      };
    }

    setRole(null);
    setProfileError(null);
    setProfileLoading(true);

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            'Profile loading timed out. Check your connection and try again.'
          )
        );
      }, 10000);
    });

    Promise.race([getProfile(userId), timeout])
      .then((profile) => {
        if (!active) return;

        console.log('[PROFILE RESULT]', profile);

        if (!profile) {
          setProfileError(
            'Your account profile was not found. Check that your profile exists in Supabase.'
          );
          return;
        }

        setRole(profile.role);
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error('[PROFILE ERROR]', error);

        setProfileError(
          error instanceof Error
            ? error.message
            : 'Unable to load your account profile.'
        );
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);

        if (active) {
          setProfileLoading(false);
        }
      });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, retryKey]);

  console.log('[ROOT STATE]', {
    loading,
    userId,
    profileLoading,
    role,
    profileError,
    path: segments[0],
  });

  if (loading || (session && profileLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Loading your account...</Text>
      </View>
    );
  }

  if (session && !role && profileError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>
          Unable to load your profile
        </Text>

        <Text style={styles.subtitle}>{profileError}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setRetryKey((key) => key + 1)}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={async () => {
            const result = await signOut();

            if (result.error) {
              setProfileError(result.error);
              return;
            }

            router.replace('/login');
          }}
        >
          <Text style={styles.secondaryText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const path = segments[0];
  const inAuthGroup = path === 'login' || path === 'register';
  const inTabsGroup = path === '(tabs)';
  const inAdminRoute = path === 'admin';

  if (!session && (inTabsGroup || inAdminRoute)) {
    return <Redirect href="/login" />;
  }

if (session && role && inAuthGroup) {
  return role === 'admin'
    ? <Redirect href="/admin" />
    : <Redirect href="/(tabs)" />;
}

  if (session && inAdminRoute && role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 22,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 12,
    marginTop: 8,
  },
  secondaryText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
