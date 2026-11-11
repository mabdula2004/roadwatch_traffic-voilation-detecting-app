import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'success' | 'info';
  unread?: boolean;
}

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSheet({
  open,
  onClose,
}: NotificationSheetProps) {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const { data: auth } = await supabase.auth.getUser();
          if (!auth?.user?.id) return;
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', auth.user.id)
            .order('sent_at', { ascending: false })
            .limit(20);

          if (data && data.length > 0) {
            setNotifications(
              data.map((n) => ({
                id: n.notification_id || Math.random().toString(),
                title: n.type === 'reward_payout'
                  ? (isUrdu ? 'انعامی رقم والیٹ میں شامل' : 'Reward Bounty Credited')
                  : (isUrdu ? 'ٹریفک الرٹ' : 'Traffic Alert'),
                message: n.message || '',
                time: new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: n.type === 'reward_payout' ? 'success' : 'info',
                unread: true,
              }))
            );
          }
        } catch {}
      })();
    }
  }, [open, isUrdu]);

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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Bell size={18} color={colors.telemetry} />
              <Text style={[styles.title, { color: colors.ink }]}>{t('notificationsAlerts')}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifications.length} {isUrdu ? 'نئی' : 'new'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Notification List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 && (
              <Text style={{ color: colors.muted, padding: 20 }}>{t('noNotifications')}</Text>
            )}
            {notifications.map((n: AppNotification) => {
              const isAlert = n.type === 'alert';
              const isSuccess = n.type === 'success';

              let borderColor = colors.edge;
              let bgColor = colors.canvas;
              let iconBg = 'rgba(6, 182, 212, 0.15)';
              let iconColor = colors.telemetry;

              if (isAlert) {
                borderColor = 'rgba(239, 68, 68, 0.4)';
                bgColor = 'rgba(239, 68, 68, 0.05)';
                iconBg = 'rgba(239, 68, 68, 0.15)';
                iconColor = colors.signal;
              } else if (isSuccess) {
                borderColor = 'rgba(16, 185, 129, 0.4)';
                bgColor = 'rgba(16, 185, 129, 0.05)';
                iconBg = 'rgba(16, 185, 129, 0.15)';
                iconColor = colors.valid;
              }

              return (
                <View
                  key={n.id}
                  style={[
                    styles.notifCard,
                    { borderColor, backgroundColor: bgColor },
                  ]}
                >
                  <View
                    style={[styles.iconContainer, { backgroundColor: iconBg }]}
                  >
                    {isAlert ? (
                      <AlertTriangle size={18} color={iconColor} />
                    ) : isSuccess ? (
                      <CheckCircle2 size={18} color={iconColor} />
                    ) : (
                      <ShieldCheck size={18} color={iconColor} />
                    )}
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={[styles.notifTitle, { color: colors.ink }]}>{n.title}</Text>
                      <Text style={[styles.notifTime, { color: colors.muted }]}>{n.time}</Text>
                    </View>
                    <Text style={[styles.notifMessage, { color: colors.muted }]}>{n.message}</Text>
                  </View>

                  {n.unread && (
                    <View
                      style={[
                        styles.unreadDot,
                        {
                          backgroundColor: isAlert
                            ? colors.signal
                            : colors.telemetry,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
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
    maxHeight: '82%',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollList: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.ink,
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 10,
    color: Colors.muted,
  },
  notifMessage: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
