import { useTheme } from '../../contexts/ThemeContext';
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Scan, Video } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import type { CapturedClip } from '../../lib/report';

interface LiveCaptureNativeProps {
  onCapture: (clip: CapturedClip) => void;
}

export function LiveCaptureNative({ onCapture }: LiveCaptureNativeProps) {
  const { colors, resolvedTheme } = useTheme();
  const camera = useRef<CameraView>(null);
  const recordingNow = useRef(false);
  const [permission, askCamera] = useCameraPermissions();
  const [micPermission, askMic] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  async function start() {
    if (recordingNow.current) return;
    if (!permission?.granted || !micPermission?.granted) {
      const [cameraResult, micResult] = await Promise.all([askCamera(), askMic()]);
      if (!cameraResult.granted || !micResult.granted) Alert.alert('Permissions required', 'Camera aur microphone access allow karein.');
      return;
    }
    if (!camera.current || !cameraReady) return;
    recordingNow.current = true;
    setPreparing(true);
    try {
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (!locationPermission.granted) throw new Error('Location access report ke liye zaroori hai.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy } = location.coords;
      setGps({ latitude, longitude, accuracy });
      const capturedAt = new Date().toISOString();
      const startMs = Date.now();
      setPreparing(false); setRecording(true);
      const result = await camera.current.recordAsync({ maxDuration: 10, maxFileSize: 50 * 1024 * 1024 });
      if (result?.uri) onCapture({ clientCaptureId: Crypto.randomUUID(), uri: result.uri, capturedAt, latitude, longitude, accuracy, durationMs: Date.now() - startMs });
    } catch (cause) { Alert.alert('Capture unavailable', cause instanceof Error ? cause.message : 'Video record nahi ho saka.'); }
    finally { recordingNow.current = false; setRecording(false); setPreparing(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        {permission?.granted && micPermission?.granted && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="video" onCameraReady={() => setCameraReady(true)} />}
        <View style={styles.overlay} />

        {/* Telemetry HUD */}
        <View style={styles.hudTop}>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{now.toLocaleTimeString()}</Text>
            <Text style={styles.dateText}>{now.toLocaleDateString()}</Text>
          </View>

          <View style={styles.gpsRow}>
            <View style={styles.gpsBadge}>
              <MapPin size={12} color={Colors.telemetry} />
              <Text style={styles.gpsText}>{gps ? `${gps.latitude.toFixed(5)}°, ${gps.longitude.toFixed(5)}°` : 'GPS on capture'}</Text>
            </View>
            <View style={styles.gpsAccuracyBadge}>
              <View style={styles.dotValid} />
              <Text style={styles.gpsAccuracyText}>{gps?.accuracy != null ? `GPS ±${Math.round(gps.accuracy)}m` : 'GPS pending'}</Text>
            </View>
          </View>
        </View>

        {/* Plate detection scanning reticle */}
        <View style={styles.scanArea}>
          <View style={styles.reticle}>
            <View style={styles.reticleTag}>
              <Text style={styles.reticleTagText}>FRAME GUIDE</Text>
            </View>
          </View>
          <View style={styles.scanBadge}>
            <Scan size={14} color={Colors.telemetry} />
            <Text style={styles.scanText}>{!permission?.granted ? 'TAP BELOW TO ALLOW CAMERA' : recording ? 'RECORDING · TAP TO STOP' : preparing ? 'GETTING GPS' : 'READY TO RECORD · STOP SAFELY'}</Text>
          </View>
        </View>

        {/* Shutter controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.shutterButton}
            onPress={recording ? () => camera.current?.stopRecording() : start}
            disabled={preparing}
            activeOpacity={0.8}
          >
            <Video size={28} color={Colors.canvas} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    justifyContent: 'space-between',
  },
  overlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.3)',
  },
  hudTop: {
    padding: 16,
  },
  timeBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(18, 24, 36, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    alignItems: 'flex-end',
  },
  timeText: {
    color: Colors.ink,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    color: Colors.muted,
    fontSize: 10,
  },
  gpsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 24, 36, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  gpsText: {
    color: Colors.ink,
    fontSize: 10,
    fontWeight: '600',
  },
  gpsAccuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 24, 36, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dotValid: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.valid,
  },
  gpsAccuracyText: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: '65%',
    height: 100,
    borderWidth: 1.5,
    borderColor: Colors.telemetry,
    borderRadius: 12,
    position: 'relative',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  reticleTag: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: Colors.canvas,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  reticleTagText: {
    color: Colors.telemetry,
    fontSize: 9,
    fontWeight: 'bold',
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 24, 36, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    marginTop: 12,
    gap: 6,
  },
  scanText: {
    color: Colors.telemetry,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  spacer: {
    width: 44,
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.accent,
    borderWidth: 4,
    borderColor: 'rgba(245, 158, 11, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 24, 36, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
