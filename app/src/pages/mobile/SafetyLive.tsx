import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function SafetyLive() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.canvas }]}>
    <Text style={[styles.title, { color: colors.ink }]}>Safety</Text>
    <Text style={{ color: colors.muted, lineHeight: 22 }}>Only direct emergency calling is available. Automated SOS, face blur, plate lookup and stolen vehicle alerts are not connected.</Text>
    <TouchableOpacity style={[styles.button, { borderColor: colors.signal }]} onPress={() => void Linking.openURL('tel:15')}><Text style={{ color: colors.signal }}>Call Police 15</Text></TouchableOpacity>
    <TouchableOpacity style={[styles.button, { borderColor: colors.accent }]} onPress={() => void Linking.openURL('tel:1122')}><Text style={{ color: colors.accent }}>Call Rescue 1122</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, padding: 22, paddingTop: 54, gap: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  button: { borderWidth: 1, borderRadius: 12, alignItems: 'center', padding: 16 },
});
