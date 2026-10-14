
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AttendanceRow = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
};

type StudentProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type EventRow = {
  id: string;
  title: string;
  event_code: string;
};

type AttendanceItem = AttendanceRow & {
  studentName: string;
  studentEmail: string;
  eventTitle: string;
  eventCode: string;
};

export default function AdminAttendanceScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      if (authLoading) return;

      if (!session?.user?.id) {
        router.replace('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const profile = await getProfile(session.user.id);

        if (!profile || profile.role !== 'admin') {
          router.replace('/(tabs)');
          return;
        }

        const [attendanceResult, profilesResult, eventsResult] =
          await Promise.all([
            supabase
              .from('attendance')
              .select('id, student_id, event_id, scanned_at')
              .order('scanned_at', { ascending: false }),
            supabase
              .from('profiles')
              .select('id, email, full_name, role'),
            supabase
              .from('events')
              .select('id, title, event_code'),
          ]);

        if (attendanceResult.error) throw attendanceResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (eventsResult.error) throw eventsResult.error;

        const profiles = (profilesResult.data ?? []) as StudentProfile[];
        const events = (eventsResult.data ?? []) as EventRow[];
        const attendance = (attendanceResult.data ?? []) as AttendanceRow[];

        const profileMap = new Map(
          profiles.map((student) => [student.id, student])
        );

        const eventMap = new Map(
          events.map((event) => [event.id, event])
        );

        const mappedRecords: AttendanceItem[] = attendance.map((record) => {
          const student = profileMap.get(record.student_id);
          const event = eventMap.get(record.event_id);

          return {
            ...record,
            studentName: student?.full_name?.trim() || 'Unknown student',
            studentEmail: student?.email || 'No email available',
            eventTitle: event?.title || 'Unknown event',
            eventCode: event?.event_code || 'N/A',
          };
        });

        if (active) {
          setRecords(mappedRecords);
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load attendance records.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAttendance();

    return () => {
      active = false;
    };
  }, [session?.user?.id, authLoading, reloadKey]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return records;

    return records.filter((record) =>
      [
        record.studentName,
        record.studentEmail,
        record.eventTitle,
        record.eventCode,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [records, search]);

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/admin')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Attendance Records</Text>
        <Text style={styles.subtitle}>
          {records.length} total record
          {records.length === 1 ? '' : 's'}
        </Text>
      </View>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search student, email, or event"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={styles.loader}
        />
      ) : error ? (
        <View style={styles.message}>
          <Text style={styles.error}>{error}</Text>

          <TouchableOpacity
            onPress={() => setReloadKey((key) => key + 1)}
          >
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => setReloadKey((key) => key + 1)}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No attendance records found.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.studentName}>
                  {item.studentName}
                </Text>
                <Text style={styles.recordBadge}>Present</Text>
              </View>

              <Text style={styles.email}>{item.studentEmail}</Text>

              <View style={styles.divider} />

              <Text style={styles.label}>Event</Text>
              <Text style={styles.value}>{item.eventTitle}</Text>

              <Text style={styles.label}>Event Code</Text>
              <Text style={styles.value}>{item.eventCode}</Text>

              <Text style={styles.label}>Scanned At</Text>
              <Text style={styles.value}>
                {formatDate(item.scanned_at)}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  search: {
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
  recordCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  recordBadge: {
    color: '#176B45',
    backgroundColor: '#E2F5E9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  loader: {
    marginTop: 40,
  },
  message: {
    padding: 20,
  },
  error: {
    color: '#C62828',
    fontSize: 14,
  },
  retry: {
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 12,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    padding: 28,
  },
});
