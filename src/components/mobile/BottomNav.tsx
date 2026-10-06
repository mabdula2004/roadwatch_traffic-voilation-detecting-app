import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Shield, Lock, Wallet, Camera, Settings } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const { colors } = useTheme();

  const tabs = [
    { key: 'wallet', label: 'Wallet', Icon: Wallet },
    { key: 'vault', label: 'Vault', Icon: Lock },
    { key: 'capture', label: 'Capture', Icon: Camera },
    { key: 'safety', label: 'Safety', Icon: Shield },
    { key: 'settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <View style={[styles.nav, { backgroundColor: colors.surface, borderTopColor: colors.edge }]}>
      {tabs.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tabItem}
            onPress={() => onSelectTab(key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconActive]}>
              <Icon size={20} color={isActive ? colors.telemetry : colors.muted} />
            </View>
            <Text style={[styles.tabLabel, { color: isActive ? colors.telemetry : colors.muted }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    paddingVertical: 8,
    paddingBottom: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
  },
  labelActive: {
    color: Colors.telemetry,
  },
});
