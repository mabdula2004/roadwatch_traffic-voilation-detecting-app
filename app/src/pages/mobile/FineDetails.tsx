import { useTheme } from '../../contexts/ThemeContext';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, Play, Gavel, AlertTriangle, MapPin, User, Hash } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { fines } from '../../data/fines';
import { media, type MediaKey } from '../../data/media';

interface FineDetailsProps {
  fineId?: string;
  onBack: () => void;
}

export function FineDetails({ fineId, onBack }: FineDetailsProps) {
  const { colors, resolvedTheme } = useTheme();
  const fine = fines.find((f) => f.id === fineId) ?? fines[0];

  const [secs, setSecs] = useState(fine.slaHoursLeft * 3600);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pct = Math.min((secs / (48 * 3600)) * 100, 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back to Wallet</Text>
        </TouchableOpacity>
        <View
          style={[
            styles.statusBadge,
            fine.status === 'disputed' ? styles.badgeDisputed : styles.badgeDue,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              fine.status === 'disputed' ? { color: Colors.telemetry } : { color: Colors.signal },
            ]}
          >
            {fine.status === 'disputed' ? 'UNDER REVIEW' : 'PAYMENT DUE'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offense Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.alertRef}>
                <Hash size={12} color={Colors.textMuted} />
                <Text style={styles.refText}>8070 ALERT · REF {fine.id}</Text>
              </View>
              <Text style={styles.violationTitle}>{fine.violation}</Text>
              <Text style={styles.violationMeta}>
                {fine.plate} · {fine.issuedAt}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.fineLabel}>FINE</Text>
              <Text style={styles.fineAmount}>{fine.amountPkr.toLocaleString()}</Text>
              <Text style={styles.pkrLabel}>PKR</Text>
            </View>
          </View>

          {/* Evidence Image */}
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: media[fine.evidenceThumb as MediaKey] }}
              style={styles.evidenceImage}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Play size={20} color={Colors.text} fill={Colors.text} style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>
            <View style={styles.clipDuration}>
              <Text style={styles.clipText}>00:0{fine.clipSeconds % 10}</Text>
            </View>
          </View>

          {/* Details List */}
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelGroup}>
                <MapPin size={15} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Location</Text>
              </View>
              <Text style={styles.detailValue}>{fine.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelGroup}>
                <User size={15} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Verifying officer</Text>
              </View>
              <Text style={styles.detailValue}>{fine.officer}</Text>
            </View>
          </View>
        </View>

        {/* SLA Countdown */}
        <View style={styles.slaCard}>
          <View style={styles.slaHeader}>
            <Text style={styles.slaTitle}>48-HOUR DISPUTE WINDOW</Text>
            <View style={styles.slaBadge}>
              <Text style={styles.slaBadgeText}>SLA</Text>
            </View>
          </View>
          <Text style={styles.timerText}>
            {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </Text>
          <Text style={styles.slaNote}>Remaining time to contest before the challan is final.</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeBanner}>
          <AlertTriangle size={18} color={Colors.accent} style={{ marginTop: 2 }} />
          <Text style={styles.noticeText}>
            <Text style={{ fontWeight: '800' }}>Fee applies only if your dispute is rejected.</Text>{' '}
            Filing is free; a PKR 500 review fee is charged after the decision if the challan is
            upheld by human review.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.disputeButton} onPress={onBack}>
          <Gavel size={18} color="#000" />
          <Text style={styles.disputeText}>File Dispute for Human Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.payButton} onPress={onBack}>
          <Text style={styles.payText}>Pay PKR {fine.amountPkr.toLocaleString()} now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.canvas,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeDisputed: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.surface,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  violationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  violationMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fineLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  fineAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.accent,
    marginTop: 2,
  },
  pkrLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  mediaContainer: {
    marginTop: 14,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipDuration: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clipText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  detailsList: {
    marginTop: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  slaCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: Colors.surface,
    padding: 16,
  },
  slaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  slaBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slaBadgeText: {
    color: Colors.signal,
    fontSize: 10,
    fontWeight: '800',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.signal,
    marginTop: 8,
  },
  slaNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.edge,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.signal,
  },
  noticeBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  disputeButton: {
    marginTop: 16,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disputeText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  payButton: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
