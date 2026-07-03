import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import type { TripDetail } from './trip-detail';
import { WS_URL } from '../../../../utils/config';

type Props = {
  visible: boolean;
  trip: TripDetail;
  lang: 'fr' | 'en';
  onClose: () => void;
  onConfirm: (seats: number[]) => void;
};

type SeatStatus = 'available' | 'selected' | 'temporary' | 'permanent';
type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

function generateSeatLayout(nbrPlaces: number): number[][] {
  // Generic layout : 2 columns of seats
  const rows: number[][] = [];
  let seatNum = 1;

  // Determine cols based on capacity
  const cols = nbrPlaces <= 40 ? 2 : nbrPlaces <= 60 ? 3 : 4;
  const regularRows = Math.floor(nbrPlaces / cols);
  const remaining = nbrPlaces % cols;

  for (let i = 0; i < regularRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      if (seatNum <= nbrPlaces) {
        row.push(seatNum++);
      }
    }
    rows.push(row);
  }

  if (remaining > 0) {
    const lastRow: number[] = [];
    for (let j = 0; j < remaining; j++) {
      lastRow.push(seatNum++);
    }
    rows.push(lastRow);
  }

  return rows;
}

// Format seat label ex: 1 → A01, 2 → A02, etc.
function formatSeatLabel(seatNum: number, cols: number): string {
  const col = (seatNum - 1) % cols;
  const row = Math.ceil(seatNum / cols);
  const colLetter = String.fromCharCode(65 + col); // A, B, C...
  return `${colLetter}${String(row).padStart(2, '0')}`;
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
}

function parseDuration(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const m = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0');
}

function formatDuration(raw: string | number): string {
  const mins = parseDuration(raw);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function SeatSelectionModal({
  visible,
  trip,
  lang,
  onClose,
  onConfirm,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [temporarySeats, setTemporarySeats] = useState<number[]>([]);
  const [permanentSeats, setPermanentSeats] = useState<number[]>(
    (trip.placeReservees || []).filter(n => n > 0),
  );
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');

  const stompClient = useRef<Client | null>(null);
  const mySeats = useRef<number[]>([]);

  const nbrPlaces = trip.vehicule?.nbrPlaces || trip.nbrPlaceReservable || 50;
  const cols = nbrPlaces <= 40 ? 2 : nbrPlaces <= 60 ? 3 : 4;
  const layout = generateSeatLayout(nbrPlaces);

  const t = {
    fr: {
      title: 'Sélection des sièges',
      available: 'Disponible',
      selected: 'Sélectionné',
      reserved: 'Réservé',
      selectedSeatsLabel: 'Sièges sélectionnés',
      total: 'Total',
      confirm: 'Confirmer la sélection',
      online: 'En ligne',
      connecting: 'Connexion...',
      reconnecting: 'Reconnexion...',
      routeLabel: (from: string, to: string) => `De ${from} vers ${to}`,
    },
    en: {
      title: 'Seat selection',
      available: 'Available',
      selected: 'Selected',
      reserved: 'Reserved',
      selectedSeatsLabel: 'Selected seats',
      total: 'Total',
      confirm: 'Confirm selection',
      online: 'Online',
      connecting: 'Connecting...',
      reconnecting: 'Reconnecting...',
      routeLabel: (from: string, to: string) => `From ${from} to ${to}`,
    },
  }[lang];

  const connectWebSocket = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      reconnectDelay: 5000,

      onConnect: () => {
        setConnectionStatus('connected');

        // Subscribe to topic
        client.subscribe(`/topic/voyage.${trip.idVoyage}`, message => {
          try {
            const data = JSON.parse(message.body);
            const { placeNumber, status } = data;
            if (placeNumber <= 0) return;
            if (status === 'RESERVED') {
              setTemporarySeats(prev => [...new Set([...prev, placeNumber])]);
            } else if (status === 'FREE') {
              setTemporarySeats(prev => prev.filter(s => s !== placeNumber));
            } else if (status === 'PERMANENT' || status === 'CONFIRMED') {
              setPermanentSeats(prev => [...new Set([...prev, placeNumber])]);
              setTemporarySeats(prev => prev.filter(s => s !== placeNumber));
            }
          } catch {
            // silent
          }
        });

        // Get initial state
        client.publish({
          destination: `/app/voyage/${trip.idVoyage}/get-state`,
        });
      },

      onDisconnect: () => setConnectionStatus('disconnected'),
      onStompError: () => setConnectionStatus('reconnecting'),
    });

    client.activate();
    stompClient.current = client;
  }, [trip.idVoyage]);

  useEffect(() => {
    if (visible) {
      setSelectedSeats([]);
      setTemporarySeats([]);
      setPermanentSeats((trip.placeReservees || []).filter(n => n > 0));
      connectWebSocket();
    }

    return () => {
      // Release seats on unmount
      if (stompClient.current?.connected) {
        mySeats.current.forEach(seatNum => {
          stompClient.current?.publish({
            destination: `/app/voyage/${trip.idVoyage}/reserver`,
            body: JSON.stringify({ placeNumber: seatNum, status: 'FREE' }),
          });
        });
        stompClient.current.deactivate();
      }
    };
  }, [visible, connectWebSocket, trip.idVoyage, trip.placeReservees]);

  const getSeatStatus = (seatNum: number): SeatStatus => {
    if (permanentSeats.includes(seatNum)) return 'permanent';
    if (temporarySeats.includes(seatNum) && !selectedSeats.includes(seatNum))
      return 'temporary';
    if (selectedSeats.includes(seatNum)) return 'selected';
    return 'available';
  };

  const handleSeatPress = (seatNum: number) => {
    const status = getSeatStatus(seatNum);
    if (status === 'permanent' || status === 'temporary') return;

    if (status === 'selected') {
      // Deselect
      setSelectedSeats(prev => prev.filter(s => s !== seatNum));
      mySeats.current = mySeats.current.filter(s => s !== seatNum);
      if (stompClient.current?.connected) {
        stompClient.current.publish({
          destination: `/app/voyage/${trip.idVoyage}/reserver`,
          body: JSON.stringify({ placeNumber: seatNum, status: 'FREE' }),
        });
      }
    } else {
      // Select
      setSelectedSeats(prev => [...prev, seatNum]);
      mySeats.current = [...mySeats.current, seatNum];
      if (stompClient.current?.connected) {
        stompClient.current.publish({
          destination: `/app/voyage/${trip.idVoyage}/reserver`,
          body: JSON.stringify({ placeNumber: seatNum, status: 'RESERVED' }),
        });
      }
    }
  };

  const getSeatStyle = (status: SeatStatus) => {
    switch (status) {
      case 'selected':
        return {
          borderColor: colors.success,
          backgroundColor: `${colors.success}40`,
        };
      case 'temporary':
        return { borderColor: '#f97316', backgroundColor: '#fed7aa' };
      case 'permanent':
        return {
          borderColor: colors.error,
          backgroundColor: `${colors.error}40`,
          opacity: 0.7,
        };
      default:
        return {
          borderColor: theme.border,
          backgroundColor: theme.backgroundAlt,
        };
    }
  };

  const getSeatTextColor = (status: SeatStatus) => {
    switch (status) {
      case 'selected':
        return colors.success;
      case 'temporary':
        return '#c2410c';
      case 'permanent':
        return colors.error;
      default:
        return theme.textStrong;
    }
  };

  const totalPrice = selectedSeats.length * trip.prix;

  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: { color: colors.success, text: t.online },
      connecting: { color: colors.primary, text: t.connecting },
      reconnecting: { color: '#f97316', text: t.reconnecting },
      disconnected: { color: colors.error, text: 'Offline' },
    }[connectionStatus];

    return (
      <View style={styles.connectionRow}>
        <View
          style={[
            styles.connectionDot,
            { backgroundColor: statusConfig.color },
          ]}
        />
        <Text style={[styles.connectionText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.textStrong} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Trip summary */}
          <View
            style={[
              styles.tripSummary,
              {
                backgroundColor: theme.backgroundAlt,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View
              style={[styles.summaryImage, { backgroundColor: theme.border }]}
            >
              {trip.smallImage ? (
                <Image
                  source={{ uri: trip.smallImage }}
                  style={styles.summaryImageInner}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="bus-outline" size={24} color={theme.text} />
              )}
            </View>
            <View style={styles.summaryInfo}>
              <View style={styles.summaryRouteRow}>
                <Text
                  style={[styles.summaryRoute, { color: theme.textStrong }]}
                >
                  {t.routeLabel(trip.lieuDepart, trip.lieuArrive)}
                </Text>
                <View
                  style={[
                    styles.classBadge,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Text
                    style={[styles.classBadgeText, { color: colors.primary }]}
                  >
                    {trip.nomClasseVoyage}
                  </Text>
                </View>
              </View>
              <Text style={[styles.summaryMeta, { color: theme.text }]}>
                {new Date(trip.dateDepartPrev).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-GB',
                  { day: 'numeric', month: 'long' },
                )}{' '}
                · {formatTime(trip.heureDepartEffectif)} · {formatDuration(trip.dureeVoyage)}
              </Text>
              <Text style={[styles.summaryMeta, { color: theme.text }]}>
                {trip.nomAgence}
              </Text>
            </View>
          </View>

          {/* Legend + Connection */}
          <View style={styles.legendRow}>
            <View style={styles.legend}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: theme.backgroundAlt,
                    borderColor: theme.border,
                  },
                ]}
              />
              <Text style={[styles.legendText, { color: theme.text }]}>
                {t.available}
              </Text>
            </View>
            <View style={styles.legend}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: `${colors.success}40`,
                    borderColor: colors.success,
                  },
                ]}
              >
                <Text style={{ fontSize: 6, color: colors.success }}>✓</Text>
              </View>
              <Text style={[styles.legendText, { color: theme.text }]}>
                {t.selected}
              </Text>
            </View>
            <View style={styles.legend}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: `${colors.error}40`,
                    borderColor: colors.error,
                  },
                ]}
              />
              <Text style={[styles.legendText, { color: theme.text }]}>
                {t.reserved}
              </Text>
            </View>
            <ConnectionIndicator />
          </View>

          {/* Bus layout */}
          <View
            style={[styles.busContainer, { backgroundColor: theme.background }]}
          >
            {/* Driver */}
            <View style={styles.driverRow}>
              <View
                style={[
                  styles.driverIcon,
                  {
                    backgroundColor: theme.backgroundAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.text} />
              </View>
            </View>

            {/* Seats grid */}
            <View style={styles.seatsGrid}>
              {layout.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.seatRow}>
                  {/* Left seats */}
                  <View style={styles.seatGroup}>
                    {row.slice(0, Math.ceil(cols / 2)).map(seatNum => {
                      const status = getSeatStatus(seatNum);
                      const seatStyle = getSeatStyle(status);
                      return (
                        <TouchableOpacity
                          key={seatNum}
                          style={[
                            styles.seat,
                            {
                              borderColor: seatStyle.borderColor,
                              backgroundColor: seatStyle.backgroundColor,
                            },
                          ]}
                          onPress={() => handleSeatPress(seatNum)}
                          disabled={
                            status === 'permanent' || status === 'temporary'
                          }
                        >
                          <Text
                            style={[
                              styles.seatText,
                              { color: getSeatTextColor(status) },
                            ]}
                          >
                            {formatSeatLabel(seatNum, cols)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Aisle */}
                  <View style={styles.aisle} />

                  {/* Right seats */}
                  <View style={styles.seatGroup}>
                    {row.slice(Math.ceil(cols / 2)).map(seatNum => {
                      const status = getSeatStatus(seatNum);
                      const seatStyle = getSeatStyle(status);
                      return (
                        <TouchableOpacity
                          key={seatNum}
                          style={[
                            styles.seat,
                            {
                              borderColor: seatStyle.borderColor,
                              backgroundColor: seatStyle.backgroundColor,
                            },
                          ]}
                          onPress={() => handleSeatPress(seatNum)}
                          disabled={
                            status === 'permanent' || status === 'temporary'
                          }
                        >
                          <Text
                            style={[
                              styles.seatText,
                              { color: getSeatTextColor(status) },
                            ]}
                          >
                            {formatSeatLabel(seatNum, cols)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          {/* Selected seats chips */}
          {selectedSeats.length > 0 && (
            <View style={styles.selectedRow}>
              <Text style={[styles.selectedLabel, { color: theme.text }]}>
                {t.selectedSeatsLabel}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
              >
                {selectedSeats.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: `${colors.success}15`,
                        borderColor: colors.success,
                      },
                    ]}
                    onPress={() => handleSeatPress(s)}
                  >
                    <Text style={[styles.chipText, { color: colors.success }]}>
                      {formatSeatLabel(s, cols)}
                    </Text>
                    <Ionicons name="close" size={12} color={colors.success} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.totalText, { color: theme.textStrong }]}>
                {t.total}
              </Text>
              <Text style={[styles.totalPrice, { color: colors.primary }]}>
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              {
                backgroundColor:
                  selectedSeats.length > 0 ? colors.primary : theme.border,
              },
            ]}
            onPress={() => selectedSeats.length > 0 && onConfirm(selectedSeats)}
            disabled={selectedSeats.length === 0}
          >
            <Text
              style={[
                styles.confirmBtnText,
                { color: selectedSeats.length > 0 ? '#fff' : theme.text },
              ]}
            >
              {t.confirm}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.lg },

  tripSummary: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  summaryImage: {
    width: 60,
    height: 50,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  summaryImageInner: { width: '100%', height: '100%' },
  summaryInfo: { flex: 1, gap: 3 },
  summaryRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryRoute: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  classBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  summaryMeta: { ...typography.body, fontSize: typography.sizes.xs },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexWrap: 'wrap',
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendText: { ...typography.body, fontSize: typography.sizes.xs },

  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { ...typography.body, fontSize: typography.sizes.xs },

  // Bus
  busContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  driverRow: { alignItems: 'center', marginBottom: spacing.md },
  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsGrid: { gap: spacing.sm, width: '100%' },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seatGroup: { flexDirection: 'row', gap: spacing.xs },
  aisle: { width: 24 },
  seat: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatText: { ...typography.bodyBold, fontSize: 10 },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  selectedRow: { gap: spacing.xs },
  selectedLabel: { ...typography.body, fontSize: typography.sizes.xs },
  chipsScroll: { flexGrow: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  totalText: { ...typography.body, fontSize: typography.sizes.sm },
  totalPrice: { ...typography.heading, fontSize: typography.sizes.lg },
  confirmBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    letterSpacing: 0.3,
  },
});
