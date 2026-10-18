import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface OptionSheetProps<T extends string> {
  open: boolean;
  title: string;
  options: Option<T>[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <View style={[styles.handle, { backgroundColor: colors.edge }]} />
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <View style={[styles.optionsList, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
            {options.map((item, index) => {
              const isSelected = item.value === value;
              return (
                <View key={item.value}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.edge }]} />}
                  <TouchableOpacity
                    style={styles.optionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <Text style={[styles.optionLabel, { color: colors.ink }]}>{item.label}</Text>
                    {isSelected && <Check size={18} color={colors.accent} />}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.edge,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.edge,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.ink,
    marginBottom: 14,
  },
  optionsList: {
    backgroundColor: Colors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.edge,
  },
});
