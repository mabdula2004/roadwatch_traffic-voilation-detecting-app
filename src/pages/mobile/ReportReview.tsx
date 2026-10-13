import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  PanResponder,
  Modal,
} from 'react-native';
import {
  ChevronLeft,
  EyeOff,
  Lock,
  RotateCcw,
  Scissors,
  Crop,
  Play,
  Check,
  Clock,
  Sparkles,
  WifiOff,
  Maximize2,
  Crosshair,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  uploadReport,
  saveLocalReport,
  saveFramesToDisk,
  type CapturedClip,
  type StoredCaseReport,
} from '../../lib/report';
import { analyzeTrafficViolation, type AiEvidentiaryResult } from '../../lib/aiAnalysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReportReviewProps {
  clip: CapturedClip;
  onBack: () => void;
  onSubmit: (id: string, aiResult: AiEvidentiaryResult) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}



export function ReportReview({ clip, onBack, onSubmit }: ReportReviewProps) {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showRemakeModal, setShowRemakeModal] = useState(false);

  // Video Trimming & Editing State
  const totalDurationSec = Math.max(5, Math.round(clip.durationMs / 1000));
  const [trimStartSec, setTrimStartSec] = useState<number>(0);
  const [trimEndSec, setTrimEndSec] = useState<number>(totalDurationSec);
  const [activeTool, setActiveTool] = useState<'none' | 'trim' | 'crop'>('none');
  const [isTrimApplied, setIsTrimApplied] = useState<boolean>(false);
  const [filmstrip, setFilmstrip] = useState<string[]>([]);
  const [timelineWidth, setTimelineWidth] = useState<number>(SCREEN_WIDTH - 64);

  // Touch-Adjustable Video Crop State (1.0x Full to 3.0x Zoom)
  const [cropZoom, setCropZoom] = useState<number>(1.0);
  const cropZoomRef = useRef<number>(1.0);
  const dragCropZoomRef = useRef<number>(1.0);
  const cropSliderWidthRef = useRef<number>(SCREEN_WIDTH - 64);
  const [cropSliderWidth, setCropSliderWidth] = useState<number>(SCREEN_WIDTH - 64);

  useEffect(() => {
    cropZoomRef.current = cropZoom;
  }, [cropZoom]);

  // Touch Drag Refs for Smooth PanResponder Interaction
  const trimStartSecRef = useRef<number>(0);
  const trimEndSecRef = useRef<number>(totalDurationSec);
  const timelineWidthRef = useRef<number>(SCREEN_WIDTH - 64);
  const dragStartSecRef = useRef<number>(0);
  const dragEndSecRef = useRef<number>(totalDurationSec);

  const player = useVideoPlayer(clip.uri);

  // Keep refs synchronized with state
  useEffect(() => {
    trimStartSecRef.current = trimStartSec;
  }, [trimStartSec]);

  useEffect(() => {
    trimEndSecRef.current = trimEndSec;
  }, [trimEndSec]);

  useEffect(() => {
    timelineWidthRef.current = timelineWidth;
  }, [timelineWidth]);

  // Extract filmstrip thumbnails for interactive visual trimming
  useEffect(() => {
    let alive = true;
    async function loadFilmstrip() {
      const dur = Math.max(5000, clip.durationMs);
      const points = [0.08, 0.28, 0.5, 0.72, 0.94];
      const thumbs: string[] = [];
      for (const p of points) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(clip.uri, {
            time: Math.floor(dur * p),
            quality: 0.25,
          });
          if (uri && alive) thumbs.push(uri);
        } catch {}
      }
      if (alive && thumbs.length > 0) {
        setFilmstrip(thumbs);
      }
    }
    void loadFilmstrip();
    return () => {
      alive = false;
    };
  }, [clip.uri, clip.durationMs]);

  // Left Handle PanResponder (Touch-drag start time)
  const leftPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartSecRef.current = trimStartSecRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = timelineWidthRef.current;
        if (width <= 0) return;
        const deltaSec = (gestureState.dx / width) * totalDurationSec;
        const maxAllowed = trimEndSecRef.current - 5; // Enforce legal minimum 5 seconds
        const newStart = Math.max(0, Math.min(maxAllowed, dragStartSecRef.current + deltaSec));
        const rounded = Math.round(newStart * 10) / 10;
        setTrimStartSec(rounded);
        setIsTrimApplied(true);
        try {
          player.currentTime = rounded;
        } catch {}
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Right Handle PanResponder (Touch-drag end time)
  const rightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragEndSecRef.current = trimEndSecRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = timelineWidthRef.current;
        if (width <= 0) return;
        const deltaSec = (gestureState.dx / width) * totalDurationSec;
        const minAllowed = trimStartSecRef.current + 5; // Enforce legal minimum 5 seconds
        const newEnd = Math.min(totalDurationSec, Math.max(minAllowed, dragEndSecRef.current + deltaSec));
        const rounded = Math.round(newEnd * 10) / 10;
        setTrimEndSec(rounded);
        setIsTrimApplied(true);
        try {
          player.currentTime = rounded;
        } catch {}
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Touch Drag Slider PanResponder for Crop Zoom
  const cropSliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragCropZoomRef.current = cropZoomRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const width = cropSliderWidthRef.current;
        if (width <= 0) return;
        const delta = (gestureState.dx / width) * 2.0;
        const next = Math.max(1.0, Math.min(3.0, dragCropZoomRef.current + delta));
        const rounded = Math.round(next * 10) / 10;
        setCropZoom(rounded);
      },
    })
  ).current;

  // Touch Resizing Frame PanResponder on Video
  const cropFramePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragCropZoomRef.current = cropZoomRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = -(gestureState.dx + gestureState.dy) / 80;
        const next = Math.max(1.0, Math.min(3.0, dragCropZoomRef.current + delta));
        const rounded = Math.round(next * 10) / 10;
        setCropZoom(rounded);
      },
    })
  ).current;

  // Fine-tune Steppers
  function adjustStart(delta: number) {
    const nextStart = Math.max(0, Math.min(trimStartSec + delta, trimEndSec - 5));
    setTrimStartSec(nextStart);
    setIsTrimApplied(nextStart > 0 || trimEndSec < totalDurationSec);
    try {
      player.currentTime = nextStart;
    } catch {}
  }

  function adjustEnd(delta: number) {
    const nextEnd = Math.min(totalDurationSec, Math.max(trimEndSec + delta, trimStartSec + 5));
    setTrimEndSec(nextEnd);
    setIsTrimApplied(trimStartSec > 0 || nextEnd < totalDurationSec);
    try {
      player.currentTime = nextEnd;
    } catch {}
  }

  function handlePreviewTrim() {
    try {
      player.currentTime = trimStartSec;
      player.play();
    } catch {}
  }

  function handleResetTrim() {
    setTrimStartSec(0);
    setTrimEndSec(totalDurationSec);
    setIsTrimApplied(false);
    try {
      player.currentTime = 0;
    } catch {}
  }



  function handleRemakeVideo() {
    setShowRemakeModal(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const effectiveDurationMs = isTrimApplied
        ? Math.round((trimEndSec - trimStartSec) * 1000)
        : clip.durationMs;

      const trimmedClip: CapturedClip = {
        ...clip,
        durationMs: effectiveDurationMs,
        trimStartMs: isTrimApplied ? Math.round(trimStartSec * 1000) : 0,
        trimEndMs: isTrimApplied ? Math.round(trimEndSec * 1000) : clip.durationMs,
        cropZoom: cropZoom > 1.05 ? Number(cropZoom.toFixed(2)) : undefined,
        cropLabel: cropZoom > 1.05 ? `${cropZoom.toFixed(1)}x Touch Crop` : undefined,
      };

      // 1. Attempt AI analysis with automatic offline resilience fallback
      let result: AiEvidentiaryResult;
      let isOffline = false;

      try {
        result = await analyzeTrafficViolation({
          videoUri: trimmedClip.uri,
          durationMs: trimmedClip.durationMs,
          trimStartMs: trimmedClip.trimStartMs,
          trimEndMs: trimmedClip.trimEndMs,
          cropZoom: trimmedClip.cropZoom,
          cropLabel: trimmedClip.cropLabel,
          claimedClass: 'auto_ai_detect',
          capturedAt: trimmedClip.capturedAt,
          latitude: trimmedClip.latitude,
          longitude: trimmedClip.longitude,
          locationName: trimmedClip.locationName,
        });
      } catch (analysisErr) {
        console.log('AI verification network offline notice:', analysisErr);
        isOffline = true;
        result = {
          caseId: `LOCAL-${Date.now().toString().slice(-6)}`,
          violationDetected: false,
          violationType: null,
          violationName: 'Offline Evidence (Pending Sync)',
          vehicleDistance: 'optimal',
          plateStatus: 'clear',
          plateNumber: null,
          plateConfidence: 0,
          clarityScore: 100,
          rejectionReason: 'none',
          vehicleMakeModel: 'Pending Sync',
          vehicleColor: 'Unknown',
          vehicleType: 'Unknown',
          fineAmountPkr: 0,
          status: 'no_violation',
          statusLabel: 'Saved to Local Vault (Auto-Sync Queue)',
          reasoning: 'Evidence video preserved offline on device disk. AI violation verification will automatically execute once internet connectivity is restored.',
          notes: 'Evidence video cached locally on device storage.',
          analyzedAt: new Date().toISOString(),
          locationName: trimmedClip.locationName,
        };
      }

      // 2. Persist evidence report (always saved to local vault first)
      const id = await uploadReport(trimmedClip, 'auto_ai_detect', result);

      if (isOffline) {
        Alert.alert(
          isUrdu ? 'مقامی والٹ میں محفوظ!' : 'Saved to Local Vault!',
          isUrdu
            ? 'انٹرنیٹ میسر نہ ہونے کی وجہ سے ویڈیو آپ کے نجی والٹ میں محفوظ کر دی گئی ہے۔ جیسے ہی انٹرنیٹ آئے گا یہ خودکار تجزیہ کے لیے سنک ہو جائے گی۔'
            : 'No active internet connection. Video evidence has been securely preserved in your Private Offline Vault and will automatically sync once online.',
          [{ text: 'OK', onPress: () => onSubmit(id, result) }]
        );
      } else {
        onSubmit(id, result);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Save failed. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveDurationSec = isTrimApplied
    ? Math.round((trimEndSec - trimStartSec) * 10) / 10
    : totalDurationSec;

  const leftPercent = Math.max(0, Math.min(100, (trimStartSec / totalDurationSec) * 100));
  const rightPercent = Math.max(0, Math.min(100, (trimEndSec / totalDurationSec) * 100));
  const windowWidthPercent = Math.max(0, rightPercent - leftPercent);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>{isUrdu ? 'کیمرہ' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{isUrdu ? 'شواہد کا جائزہ اور ایڈیٹنگ' : 'Review & Edit Evidence'}</Text>
          <Text style={styles.subtitle}>
            {isUrdu
              ? 'ویڈیو ٹرم کریں، گاڑی پر کراپ فوکس کریں یا والٹ میں جمع کرائیں۔'
              : 'Touch-slide to trim violation window, crop focus, or submit to vault.'}
          </Text>
        </View>

        {/* Video Card with Live Touch Crop/Zoom Effect */}
        <View style={styles.mediaCard}>
          <View style={styles.imageWrapper}>
            <View style={[styles.videoCropContainer, { transform: [{ scale: cropZoom }] }]}>
              <VideoView player={player} style={styles.evidenceImage} nativeControls contentFit="cover" />
            </View>

            {/* Interactive Touch-Adjustable Crop Frame (ONLY shown when Crop Tool is active) */}
            {activeTool === 'crop' && (
              <View style={styles.touchCropOverlay} pointerEvents="box-none">
                <View
                  style={[
                    styles.cropInteractiveFrame,
                    {
                      width: `${Math.max(45, Math.min(92, 92 / cropZoom))}%`,
                      height: `${Math.max(45, Math.min(92, 92 / cropZoom))}%`,
                    },
                  ]}
                  {...cropFramePanResponder.panHandlers}
                >
                  {/* Rule of thirds grid */}
                  <View style={styles.gridLineH1} />
                  <View style={styles.gridLineH2} />
                  <View style={styles.gridLineV1} />
                  <View style={styles.gridLineV2} />

                  {/* 4 Corner Touch Handles */}
                  <View style={[styles.cornerBracket, styles.cornerTL]} />
                  <View style={[styles.cornerBracket, styles.cornerTR]} />
                  <View style={[styles.cornerBracket, styles.cornerBL]} />
                  <View style={[styles.cornerBracket, styles.cornerBR]} />

                  {/* Center Crop Zoom Indicator Pill */}
                  <View style={styles.cropCenterPill}>
                    <Crop size={12} color="#000" />
                    <Text style={styles.cropCenterPillText}>{cropZoom.toFixed(1)}x</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* High-Contrast Interactive Edit Action Bar */}
          <View style={styles.editTabBar}>
            {/* Trim Tool Tab */}
            <TouchableOpacity
              style={[
                styles.toolTabBtn,
                activeTool === 'trim' && styles.toolTabBtnActive,
              ]}
              onPress={() => setActiveTool(activeTool === 'trim' ? 'none' : 'trim')}
            >
              <Scissors size={15} color={activeTool === 'trim' ? '#000' : '#06b6d4'} />
              <Text style={[styles.toolTabText, activeTool === 'trim' ? { color: '#000' } : { color: '#06b6d4' }]}>
                {isUrdu ? 'ٹچ سے ٹرم کریں (Trim)' : 'Touch Trim Slider'}
              </Text>
              {isTrimApplied && (
                <View style={styles.appliedDot} />
              )}
            </TouchableOpacity>

            {/* Crop Tool Tab */}
            <TouchableOpacity
              style={[
                styles.toolTabBtn,
                activeTool === 'crop' && styles.toolTabBtnActiveCrop,
              ]}
              onPress={() => setActiveTool(activeTool === 'crop' ? 'none' : 'crop')}
            >
              <Crop size={15} color={activeTool === 'crop' ? '#000' : '#f59e0b'} />
              <Text style={[styles.toolTabText, activeTool === 'crop' ? { color: '#000' } : { color: '#f59e0b' }]}>
                {isUrdu ? 'ٹچ سے کراپ کریں (Crop)' : 'Touch Crop & Zoom'}
              </Text>
              {cropZoom > 1.05 && (
                <View style={[styles.appliedDot, { backgroundColor: '#f59e0b' }]} />
              )}
            </TouchableOpacity>
          </View>

          {/* =========================================================================
              TOOL 1: TOUCH-BASED SLIDER VIDEO TRIMMING STUDIO
              ========================================================================= */}
          {activeTool === 'trim' && (
            <View style={styles.trimStudioCard}>
              <View style={styles.studioHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Scissors size={14} color="#06b6d4" />
                  <Text style={styles.studioTitle}>
                    {isUrdu ? 'انگلی سے سلائیڈ کر کے دورانیہ منتخب کریں' : 'Slide Handles with Finger to Trim'}
                  </Text>
                </View>
                <Text style={styles.studioHelp}>
                  {isUrdu ? 'کم از کم 5 سیکنڈ لازمی' : 'Min. 5s Legal Proof'}
                </Text>
              </View>

              {/* Touch Drag Filmstrip Track */}
              <View
                style={styles.touchTimelineWrapper}
                onLayout={(e) => setTimelineWidth(e.nativeEvent.layout.width)}
              >
                {/* Visual Thumbnails Strip */}
                <View style={styles.filmstripRow}>
                  {filmstrip.length > 0 ? (
                    filmstrip.map((thumbUri, i) => (
                      <Image key={i} source={{ uri: thumbUri }} style={styles.filmstripThumb} resizeMode="cover" />
                    ))
                  ) : (
                    <View style={styles.filmstripPlaceholder}>
                      <ActivityIndicator size="small" color="#06b6d4" />
                    </View>
                  )}
                </View>

                {/* Shaded Mask: Left Excluded Segment */}
                <View
                  style={[styles.excludedMaskLeft, { width: `${leftPercent}%` }]}
                  pointerEvents="none"
                />

                {/* Shaded Mask: Right Excluded Segment */}
                <View
                  style={[styles.excludedMaskRight, { width: `${100 - rightPercent}%` }]}
                  pointerEvents="none"
                />

                {/* Active Highlighted Trim Window (Illuminated Border) */}
                <View
                  style={[
                    styles.activeTrimWindow,
                    { left: `${leftPercent}%`, width: `${windowWidthPercent}%` },
                  ]}
                  pointerEvents="none"
                />

                {/* TOUCH DRAG HANDLE: LEFT (START TRIM) */}
                <View
                  style={[styles.dragHandle, styles.dragHandleLeft, { left: `${leftPercent}%` }]}
                  {...leftPanResponder.panHandlers}
                >
                  <View style={styles.handleBadge}>
                    <Text style={styles.handleBadgeText}>{formatTime(trimStartSec)}</Text>
                  </View>
                  <View style={styles.handleBarGrip}>
                    <View style={styles.gripStripe} />
                    <View style={styles.gripStripe} />
                  </View>
                </View>

                {/* TOUCH DRAG HANDLE: RIGHT (END TRIM) */}
                <View
                  style={[styles.dragHandle, styles.dragHandleRight, { left: `${rightPercent}%` }]}
                  {...rightPanResponder.panHandlers}
                >
                  <View style={[styles.handleBadge, styles.handleBadgeRight]}>
                    <Text style={styles.handleBadgeText}>{formatTime(trimEndSec)}</Text>
                  </View>
                  <View style={styles.handleBarGrip}>
                    <View style={styles.gripStripe} />
                    <View style={styles.gripStripe} />
                  </View>
                </View>
              </View>

              <Text style={styles.touchGuidanceText}>
                {isUrdu
                  ? '👈 انگلی سے دونوں سروں کو دائیں بائیں کھینچیں (Slide) 👉'
                  : '👈 Touch & slide the cyan handles left or right to trim 👉'}
              </Text>

              {/* Fine-Tuning Precision Steppers */}
              <View style={styles.trimControlsRow}>
                {/* Start Steppers */}
                <View style={styles.trimBox}>
                  <Text style={styles.trimBoxLabel}>START</Text>
                  <Text style={styles.trimBoxValue}>{formatTime(trimStartSec)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustStart(-1)}
                      disabled={trimStartSec <= 0}
                    >
                      <Text style={[styles.stepBtnText, trimStartSec <= 0 && { color: Colors.edge }]}>-1s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustStart(1)}
                      disabled={trimStartSec >= trimEndSec - 5}
                    >
                      <Text style={[styles.stepBtnText, trimStartSec >= trimEndSec - 5 && { color: Colors.edge }]}>+1s</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Legal Duration Badge */}
                <View style={styles.trimDurationBox}>
                  <Clock size={16} color="#06b6d4" />
                  <Text style={styles.trimDurationNumber}>{effectiveDurationSec}s</Text>
                  <Text style={[styles.trimDurationSub, { color: effectiveDurationSec >= 5 ? '#10b981' : '#ef4444' }]}>
                    {effectiveDurationSec >= 5 ? '✓ Legal Valid' : 'Min 5s required'}
                  </Text>
                </View>

                {/* End Steppers */}
                <View style={styles.trimBox}>
                  <Text style={styles.trimBoxLabel}>END</Text>
                  <Text style={styles.trimBoxValue}>{formatTime(trimEndSec)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustEnd(-1)}
                      disabled={trimEndSec <= trimStartSec + 5}
                    >
                      <Text style={[styles.stepBtnText, trimEndSec <= trimStartSec + 5 && { color: Colors.edge }]}>-1s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustEnd(1)}
                      disabled={trimEndSec >= totalDurationSec}
                    >
                      <Text style={[styles.stepBtnText, trimEndSec >= totalDurationSec && { color: Colors.edge }]}>+1s</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Studio Actions */}
              <View style={styles.studioActionsRow}>
                <TouchableOpacity style={styles.studioSecondaryBtn} onPress={handlePreviewTrim}>
                  <Play size={13} color="#fff" fill="#fff" />
                  <Text style={styles.studioSecondaryText}>
                    {isUrdu ? 'ٹرم پیش نظارہ' : 'Play Trimmed Window'}
                  </Text>
                </TouchableOpacity>

                {isTrimApplied && (
                  <TouchableOpacity style={styles.studioResetBtn} onPress={handleResetTrim}>
                    <RotateCcw size={13} color={Colors.textMuted} />
                    <Text style={styles.studioResetText}>{isUrdu ? 'ری سیٹ' : 'Reset Full'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* =========================================================================
              TOOL 2: TOUCH-ADJUSTABLE CROP & FRAMING ZOOM STUDIO
              ========================================================================= */}
          {activeTool === 'crop' && (
            <View style={[styles.trimStudioCard, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
              <View style={styles.studioHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Crop size={14} color="#f59e0b" />
                  <Text style={[styles.studioTitle, { color: '#f59e0b' }]}>
                    {isUrdu ? 'ٹچ سے کراپ ایڈجسٹ کریں' : 'Touch & Drag to Crop'}
                  </Text>
                </View>
                <View style={styles.cropActiveBadge}>
                  <Text style={styles.cropActiveBadgeText}>{cropZoom.toFixed(1)}x Zoom</Text>
                </View>
              </View>

              {/* Touch Drag Zoom Slider Track */}
              <View
                style={styles.cropSliderContainer}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) {
                    setCropSliderWidth(w);
                    cropSliderWidthRef.current = w;
                  }
                }}
                {...cropSliderPanResponder.panHandlers}
              >
                <View style={styles.cropSliderTrack}>
                  <View
                    style={[
                      styles.cropSliderTrackFill,
                      { width: `${((cropZoom - 1.0) / 2.0) * 100}%` },
                    ]}
                  />
                </View>
                {/* Touch Knob */}
                <View
                  style={[
                    styles.cropSliderKnob,
                    { left: `${Math.max(0, Math.min(92, ((cropZoom - 1.0) / 2.0) * 100))}%` },
                  ]}
                >
                  <View style={styles.cropKnobDot} />
                </View>
              </View>

              {/* Touch Steppers & Mobile Quick Presets */}
              <View style={styles.cropControlsRow}>
                {/* Steppers */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setCropZoom((prev) => Math.max(1.0, Math.round((prev - 0.2) * 10) / 10))}
                    disabled={cropZoom <= 1.0}
                  >
                    <Text style={[styles.stepBtnText, cropZoom <= 1.0 && { color: Colors.edge }]}>-0.2x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setCropZoom((prev) => Math.min(3.0, Math.round((prev + 0.2) * 10) / 10))}
                    disabled={cropZoom >= 3.0}
                  >
                    <Text style={[styles.stepBtnText, cropZoom >= 3.0 && { color: Colors.edge }]}>+0.2x</Text>
                  </TouchableOpacity>
                </View>

                {/* Mobile Quick Tap Chips */}
                <View style={styles.cropChipsRow}>
                  {[
                    { label: '1.0x Full', zoom: 1.0 },
                    { label: '1.4x Lane', zoom: 1.4 },
                    { label: '1.8x Vehicle', zoom: 1.8 },
                    { label: '2.5x Plate', zoom: 2.5 },
                  ].map((chip) => {
                    const isSelected = Math.abs(cropZoom - chip.zoom) < 0.1;
                    return (
                      <TouchableOpacity
                        key={chip.label}
                        style={[
                          styles.cropChipBtn,
                          isSelected && styles.cropChipBtnActive,
                        ]}
                        onPress={() => setCropZoom(chip.zoom)}
                      >
                        <Text
                          style={[
                            styles.cropChipText,
                            isSelected && { color: '#000', fontWeight: '800' },
                          ]}
                        >
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Studio Actions */}
              <View style={styles.studioActionsRow}>
                <TouchableOpacity
                  style={[styles.studioSecondaryBtn, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                  onPress={() => setActiveTool('none')}
                >
                  <Check size={13} color="#f59e0b" />
                  <Text style={[styles.studioSecondaryText, { color: '#f59e0b' }]}>
                    {isUrdu ? 'مکمل (Done)' : 'Done Cropping'}
                  </Text>
                </TouchableOpacity>

                {cropZoom > 1.05 && (
                  <TouchableOpacity
                    style={styles.studioResetBtn}
                    onPress={() => setCropZoom(1.0)}
                  >
                    <RotateCcw size={13} color={Colors.textMuted} />
                    <Text style={styles.studioResetText}>{isUrdu ? 'اصل سائز' : 'Reset 1.0x'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Action 1: Submit to Private Vault */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Lock size={18} color="#000" />
          )}
          <Text style={styles.submitText}>
            {submitting
              ? (isUrdu ? 'تجزیہ اور والٹ میں محفوظ ہو رہا ہے…' : 'Analyzing & Submitting to Private Vault…')
              : (isUrdu ? 'نجی والٹ میں جمع کرائیں' : 'Submit to Private Vault')}
          </Text>
        </TouchableOpacity>

        {/* Action 2: Remake / Retake Video */}
        <TouchableOpacity style={styles.remakeFullBtn} onPress={handleRemakeVideo} disabled={submitting}>
          <RotateCcw size={16} color={colors.ink} />
          <Text style={[styles.remakeFullBtnText, { color: colors.ink }]}>
            {isUrdu ? 'ویڈیو مسترد کریں اور نئی ویڈیو بنائیں' : 'Discard & Remake Video'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          {isUrdu
            ? 'انٹرنیٹ نہ ہونے کی صورت میں ویڈیو خودکار طور پر آپ کے آف لائن والٹ میں محفوظ رہے گی۔'
            : 'If offline, evidence is safely cached in your Local Vault and automatically syncs once connected.'}
        </Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.signal, marginTop: 8, textAlign: 'center' }}>{error}</Text>}
      </ScrollView>

      {/* Theme-Matching Discard & Remake Confirmation Modal */}
      <Modal
        visible={showRemakeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemakeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <View style={styles.modalIconBadge}>
              <RotateCcw size={28} color="#ef4444" />
            </View>

            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              {isUrdu ? 'ویڈیو مسترد اور دوبارہ ریکارڈ کریں؟' : 'Discard & Remake Video?'}
            </Text>

            <Text style={[styles.modalDesc, { color: colors.muted }]}>
              {isUrdu
                ? 'کیا آپ موجودہ ریکارڈنگ کو مسترد کر کے دوبارہ لائیو کیمرے پر واپس جانا چاہتے ہیں تاکہ نئی ویڈیو بن سکے؟ یہ کارروائی واپس نہیں ہو سکتی۔'
                : 'Are you sure you want to discard this recorded evidence and return to the live camera to record fresh footage? This action cannot be undone.'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalDiscardBtn}
                onPress={() => {
                  setShowRemakeModal(false);
                  onBack();
                }}
              >
                <RotateCcw size={16} color="#ffffff" />
                <Text style={styles.modalDiscardText}>
                  {isUrdu ? 'ہاں، ویڈیو مسترد اور دوبارہ بنائیں' : 'Discard & Remake Video'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.edge, backgroundColor: colors.surfaceElevated }]}
                onPress={() => setShowRemakeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.ink }]}>
                  {isUrdu ? 'منسوخ کریں (جائزہ جاری رکھیں)' : 'Keep Reviewing'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  mediaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: 'hidden',
    marginBottom: 18,
  },
  imageWrapper: {
    width: '100%',
    height: 290,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  videoCropContainer: {
    width: '100%',
    height: '100%',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  // Touch Crop Frame Overlay
  touchCropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropInteractiveFrame: {
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  gridLineH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.3%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.6%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.6%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#f59e0b',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  cropCenterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cropCenterPillText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },

  // Edit Action Tab Bar
  editTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  toolTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    position: 'relative',
  },
  toolTabBtnActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  toolTabBtnActiveCrop: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  toolTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  appliedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
    position: 'absolute',
    top: 6,
    right: 8,
  },

  // Trimming Studio Panel
  trimStudioCard: {
    backgroundColor: '#090d16',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    gap: 12,
  },
  studioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studioTitle: {
    color: Colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  studioHelp: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '700',
  },

  // Touch Drag Filmstrip Track
  touchTimelineWrapper: {
    height: 68,
    borderRadius: 10,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'visible',
    marginTop: 14,
    marginBottom: 4,
  },
  filmstripRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  filmstripThumb: {
    flex: 1,
    height: '100%',
  },
  filmstripPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludedMaskLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  excludedMaskRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  activeTrimWindow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },

  // Drag Handles
  dragHandle: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  dragHandleLeft: {
    marginLeft: -16,
  },
  dragHandleRight: {
    marginLeft: -16,
  },
  handleBadge: {
    position: 'absolute',
    top: -22,
    backgroundColor: '#06b6d4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  handleBadgeRight: {
    backgroundColor: '#06b6d4',
  },
  handleBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  handleBarGrip: {
    width: 24,
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#06b6d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  gripStripe: {
    width: 2,
    height: 24,
    backgroundColor: '#000',
    borderRadius: 1,
  },
  touchGuidanceText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  // Steppers Controls
  trimControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  trimBox: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 8,
    alignItems: 'center',
  },
  trimBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  trimBoxValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: Colors.ink,
    marginVertical: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  stepBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  stepBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  trimDurationBox: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  trimDurationNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.ink,
    marginTop: 2,
  },
  trimDurationSub: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Studio Actions
  studioActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#06b6d4',
  },
  studioSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  studioResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  studioResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  // Touch Crop Studio Slider & Controls
  cropActiveBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cropActiveBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  cropSliderContainer: {
    height: 44,
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  cropSliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.edge,
    overflow: 'hidden',
  },
  cropSliderTrackFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  cropSliderKnob: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  cropKnobDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  cropControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  cropChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end',
  },
  cropChipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  cropChipBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  cropChipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Main Submit & Remake Actions
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  submitText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  remakeFullBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  remakeFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  // Theme-Matching Discard & Remake Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  modalIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 22,
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalDiscardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalDiscardText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
