import React, { useState, useRef } from 'react';
import { View, Text, TextInput, NativeSyntheticEvent, TextInputKeyPressEventData, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}

export function OtpInput({ length = 6, value, onChange }: OtpInputProps) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  const handleChangeText = (text: string, index: number) => {
    const newDigits = [...digits];
    newDigits[index] = text.slice(-1);
    const updated = newDigits.join('');
    onChange(updated);

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputs.current[index] = ref; }}
          style={[
            styles.input,
            digits[index] ? styles.inputFilled : null,
          ]}
          keyboardType="number-pad"
          maxLength={1}
          value={digits[index] || ''}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  inputFilled: {
    borderColor: Colors.telemetry,
    backgroundColor: Colors.surfaceElevated,
  },
});
