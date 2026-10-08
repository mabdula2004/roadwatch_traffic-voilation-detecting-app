import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UploadCloud, CheckCircle2, HardDrive, RefreshCw, Video } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { pendingUploads } from '../../data/queue';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type ReportRow = { report_id: string; claimed_class: string; captured_at: string; status: string; geo_lat: number | null; geo_long: number | null };

export function Vault() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'pending' | 'sealed'>('pending');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data, error } = await supabase.from('reports').select('report_id,claimed_class,captured_at,status,geo_lat,geo_long').order('captured_at', { ascending: false }).limit(100);
        if (alive) {
          if (error) {
            setReports([]);
          } else {
            setReports(data ?? []);
          }
          setLoadError('');
        }
      } catch {
        if (alive) {
          setReports([]);
          setLoadError('');
        }
      }
    }
    void load();
    return () => { alive = false; };
  }, []);
  const pending = reports.filter(r => r.status === 'awaiting_upload' || r.status === 'failed');
  const sealed = reports.filter(r => !pending.includes(r));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.ink }]}>Evidence Vault</Text>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <UploadCloud size={16} color={colors.telemetry} />
            <Text style={[styles.statValue, { color: colors.ink }]}>{pending.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <CheckCircle2 size={16} color={colors.valid} />
            <Text style={[styles.statValue, { color: colors.ink }]}>{sealed.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Sealed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <HardDrive size={16} color={colors.muted} />
            <Text style={[styles.statValue, { color: colors.ink }]}>—</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>On device</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pending' && { backgroundColor: colors.canvas }]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === 'pending' ? colors.telemetry : colors.muted }]}>
              Pending Uploads
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sealed' && { backgroundColor: colors.canvas }]}
            onPress={() => setActiveTab('sealed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === 'sealed' ? colors.telemetry : colors.muted }]}>
              Sealed Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        {activeTab === 'pending' ? (
          <View style={styles.list}>
            {pending.map((u) => (
              <View key={u.report_id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                    <Video size={16} color={colors.muted} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.ink }]}>{u.claimed_class.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.cardSub, { color: colors.muted }]}>{new Date(u.captured_at).toLocaleString()} · {u.report_id.slice(0, 8)}</Text>
                  </View>
                  <View style={[
                    styles.badge,
                    styles.badgeMuted
                  ]}>
                    <Text style={[styles.badgeText, { color: colors.ink }]}>{u.status === 'failed' ? 'Failed' : 'Awaiting upload'}</Text>
                  </View>
                </View>

                <Text style={[styles.cardSub, { color: colors.muted }]}>Return to your recording if upload failed. Keep the video until it is confirmed.</Text>
              </View>
            ))}
            {!pending.length && <Text style={{ color: colors.muted }}>No pending uploads.</Text>}
          </View>
        ) : (
          <View style={styles.list}>
            {sealed.map((r) => (
              <View key={r.report_id} style={[styles.cardHeaderOnly, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                <View style={[styles.iconContainerValid, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                  <CheckCircle2 size={16} color={colors.valid} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.ink }]}>{r.claimed_class.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.cardSub, { color: colors.muted }]}>{r.report_id.slice(0, 8)} · {new Date(r.captured_at).toLocaleString()}</Text>
                </View>
                <View style={[
                  styles.badge,
                  r.status === 'accepted' ? styles.badgeValid : r.status === 'rejected' ? styles.badgeSignal : styles.badgeAccent
                ]}>
                  <Text style={[styles.badgeText, { color: colors.ink }]}>{r.status === 'uploaded' ? 'Analysis pending' : r.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
            ))}
            {!sealed.length && <Text style={{ color: colors.muted }}>No uploaded reports yet.</Text>}
          </View>
        )}
        {!!loadError && <Text accessibilityRole="alert" style={{ color: colors.signal, marginTop: 12 }}>{loadError}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.ink,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.muted,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.edge,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.canvas,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  tabTextActive: {
    color: Colors.telemetry,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  cardHeaderOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerValid: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  cardSub: {
    fontSize: 10,
    color: Colors.muted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTelemetry: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  badgeValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeSignal: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeAccent: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeMuted: {
    backgroundColor: Colors.surfaceElevated,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.edge,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.telemetry,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    width: 30,
    textAlign: 'right',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.signal,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
