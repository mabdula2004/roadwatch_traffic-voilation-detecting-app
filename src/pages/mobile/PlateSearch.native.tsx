import { useTheme } from '../../contexts/ThemeContext';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ChevronLeft, Search, CheckCircle2, AlertTriangle, Car } from 'lucide-react-native';
import { Colors } from '../../constants/theme';

interface PlateSearchNativeProps {
  onBack: () => void;
}

interface Record {
  plate: string;
  model: string;
  color: string;
  owner: string;
  pendingFines: number;
  totalPkr: number;
  fraudFlag: boolean;
}

const registry: Record[] = [];

export function PlateSearchNative({ onBack }: PlateSearchNativeProps) {
  const { colors, resolvedTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    setResult(null);
    setNotFound(true);
  };

  const handleSelectPlate = (r: Record) => {
    setQuery(r.plate);
    setResult(r);
    setNotFound(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back to Safety</Text>
        </TouchableOpacity>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>REGISTRY PENDING</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Check a plate before you buy</Text>
        <Text style={styles.subtitle}>
          Official plate records are not connected yet. This screen cannot confirm clearance.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(text) => setQuery(text.toUpperCase())}
            placeholder="ABC-1234"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Search size={18} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Preset Badges */}
        <View style={styles.presetContainer}>
          {registry.map((r) => (
            <TouchableOpacity
              key={r.plate}
              style={styles.presetTag}
              onPress={() => handleSelectPlate(r)}
            >
              <Text style={styles.presetText}>Try {r.plate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {notFound && (
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Search unavailable for “{query}”</Text>
            <Text style={styles.notFoundSub}>
              Government registry access is required. Verify documents through official channels.
            </Text>
          </View>
        )}

        {result && (
          <View
            style={[
              styles.resultCard,
              result.pendingFines > 0 || result.fraudFlag
                ? styles.resultNotClear
                : styles.resultClear,
            ]}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.plateText}>{result.plate}</Text>
                <View style={styles.modelRow}>
                  <Car size={14} color={Colors.textMuted} />
                  <Text style={styles.modelText}>
                    {result.model} · {result.color}
                  </Text>
                </View>
              </View>

              {result.pendingFines === 0 && !result.fraudFlag ? (
                <View style={styles.clearedBadge}>
                  <CheckCircle2 size={12} color={Colors.valid} />
                  <Text style={styles.clearedText}>CLEARED</Text>
                </View>
              ) : (
                <View style={styles.flaggedBadge}>
                  <AlertTriangle size={12} color={Colors.signal} />
                  <Text style={styles.flaggedText}>NOT CLEAR</Text>
                </View>
              )}
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>PENDING CHALLANS</Text>
                <Text style={styles.statValue}>{result.pendingFines}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>OUTSTANDING</Text>
                <Text style={styles.statValue}>PKR {result.totalPkr.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.ownerRow}>
              <Text style={styles.ownerLabel}>Registered owner</Text>
              <Text style={styles.ownerValue}>{result.owner}</Text>
            </View>

            {result.fraudFlag && (
              <View style={styles.fraudBanner}>
                <Text style={styles.fraudText}>
                  Excise flag: colour on record does not match last three sightings. Possible plate
                  cloning — do not purchase without an Excise verification letter.
                </Text>
              </View>
            )}
          </View>
        )}
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
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetTag: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  notFoundCard: {
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 16,
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  notFoundSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  resultClear: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  resultNotClear: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  plateText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  modelText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearedText: {
    color: Colors.valid,
    fontSize: 10,
    fontWeight: '800',
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flaggedText: {
    color: Colors.signal,
    fontSize: 10,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 10,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  ownerLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ownerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  fraudBanner: {
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
  },
  fraudText: {
    fontSize: 11,
    color: Colors.text,
    lineHeight: 16,
  },
});
