import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

function SkeletonBox({
  width,
  height,
  borderRadius = 4,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#2e2e2e' : '#e0e0e0',
          opacity,
        },
        style,
      ]}
    />
  );
}

function SkeletonHeader({ subtitle = false }: { subtitle?: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View
      style={[
        s.header,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}
    >
      <View style={{ gap: 6 }}>
        <SkeletonBox width={140} height={22} />
        {subtitle && <SkeletonBox width={100} height={13} />}
      </View>
      <SkeletonBox width={36} height={36} borderRadius={18} />
    </View>
  );
}

function SkeletonSearch() {
  return (
    <View style={s.searchRow}>
      <SkeletonBox width="100%" height={44} borderRadius={8} />
    </View>
  );
}

function SkeletonStats() {
  return (
    <View style={s.statsGrid}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={s.statCard}>
          <SkeletonBox width={36} height={36} borderRadius={8} />
          <SkeletonBox width={60} height={20} style={{ marginTop: 8 }} />
          <SkeletonBox width={80} height={12} style={{ marginTop: 5 }} />
        </View>
      ))}
    </View>
  );
}

function SkeletonListItem({ imageSize = 52 }: { imageSize?: number }) {
  return (
    <View style={s.listItem}>
      <SkeletonBox width={imageSize} height={imageSize} borderRadius={imageSize / 2} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="65%" height={14} />
        <SkeletonBox width="50%" height={12} />
        <SkeletonBox width="40%" height={12} />
      </View>
    </View>
  );
}

function SkeletonCard({ imageH = 88 }: { imageH?: number }) {
  return (
    <View style={s.card}>
      <SkeletonBox width={88} height={imageH} borderRadius={6} />
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBox width="75%" height={14} />
        <SkeletonBox width="55%" height={12} />
        <SkeletonBox width="45%" height={12} />
        <SkeletonBox width={72} height={22} borderRadius={11} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

// ─── Screen skeletons ───────────────────────────────────────────────────────

export function SkeletonHome() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader />
      <View style={s.pad}>
        <SkeletonBox width="100%" height={120} borderRadius={8} />
      </View>
      <View style={s.pad}>
        <SkeletonBox width={120} height={16} />
        <View style={[s.row, { marginTop: spacing.sm }]}>
          {[0, 1, 2].map(i => (
            <SkeletonBox key={i} width={175} height={170} borderRadius={8} />
          ))}
        </View>
      </View>
      <View style={s.pad}>
        <SkeletonBox width={100} height={16} />
        <View style={[s.row, { marginTop: spacing.sm }]}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonBox key={i} width={110} height={115} borderRadius={8} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonListScreen({ hasStats = false, subtitle = false }: { hasStats?: boolean; subtitle?: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader subtitle={subtitle} />
      <SkeletonSearch />
      {hasStats && <SkeletonStats />}
      <View style={s.cards}>
        {[0, 1, 2, 3].map(i => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonDashboard() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader />
      <View style={s.pad}>
        <SkeletonBox width="100%" height={72} borderRadius={8} />
      </View>
      <SkeletonStats />
      <View style={s.pad}>
        <SkeletonBox width={140} height={16} style={{ marginBottom: spacing.md }} />
        {[0, 1, 2].map(i => (
          <SkeletonListItem key={i} imageSize={40} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonProfileScreen({ subtitle = false }: { subtitle?: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader subtitle={subtitle} />
      <View style={[s.pad, s.profileCard]}>
        <SkeletonBox width={72} height={72} borderRadius={36} />
        <SkeletonBox width={140} height={18} style={{ marginTop: spacing.md }} />
        <SkeletonBox width={100} height={13} style={{ marginTop: 6 }} />
        <SkeletonBox width={160} height={12} style={{ marginTop: 5 }} />
      </View>
      {[0, 1].map(section => (
        <View key={section} style={[s.pad, { marginBottom: spacing.md }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={s.menuRow}>
              <SkeletonBox width={36} height={36} borderRadius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width="55%" height={14} />
                <SkeletonBox width="75%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SkeletonCalendarScreen() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader />
      <SkeletonStats />
      <View style={s.pad}>
        <SkeletonBox width="100%" height={300} borderRadius={8} />
      </View>
      <View style={s.pad}>
        <SkeletonBox width={140} height={16} style={{ marginBottom: spacing.md }} />
        {[0, 1, 2].map(i => (
          <SkeletonListItem key={i} imageSize={36} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonResourcesScreen() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <SkeletonHeader />
      <View style={[s.row, { paddingHorizontal: spacing.lg, marginVertical: spacing.md }]}>
        {[0, 1, 2, 3].map(i => (
          <SkeletonBox key={i} width={76} height={34} borderRadius={17} />
        ))}
      </View>
      <SkeletonSearch />
      <View style={s.cards}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={s.listItem}>
            <SkeletonBox width={72} height={56} borderRadius={4} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="65%" height={14} />
              <SkeletonBox width="45%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Client screens ─────────────────────────────────────────────────────────

export function SkeletonClientTripDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Carousel */}
      <SkeletonBox width="100%" height={240} borderRadius={0} />
      {/* Thumbnails */}
      <View style={[{ flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, backgroundColor: card }]}>
        {[0, 1, 2, 3].map(i => <SkeletonBox key={i} width={56} height={40} borderRadius={4} />)}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Class + status */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SkeletonBox width={70} height={24} borderRadius={12} />
          <SkeletonBox width={80} height={24} borderRadius={12} />
        </View>
        {/* Route */}
        <SkeletonBox width="80%" height={24} />
        {/* Date + duration */}
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width={80} height={14} />
        </View>

        {/* Agency card */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="60%" height={14} />
            <SkeletonBox width="40%" height={12} />
          </View>
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>

        {/* Price + seats */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View style={{ gap: 6 }}>
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={120} height={22} />
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={60} height={22} />
          </View>
        </View>

        {/* Description */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: 8 }]}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width="100%" height={12} />
          <SkeletonBox width="90%" height={12} />
          <SkeletonBox width="70%" height={12} />
        </View>

        {/* Timeline */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: spacing.md }]}>
          <SkeletonBox width={120} height={14} />
          {[0, 1].map(i => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <SkeletonBox width={12} height={12} borderRadius={6} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="60%" height={14} />
                <SkeletonBox width="40%" height={12} />
              </View>
              <SkeletonBox width={60} height={14} />
            </View>
          ))}
        </View>

        {/* Amenities */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={100} height={14} style={{ marginBottom: spacing.sm }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[0, 1, 2, 3, 4].map(i => <SkeletonBox key={i} width={80} height={32} borderRadius={4} />)}
          </View>
        </View>

        {/* Footer button */}
        <SkeletonBox width="100%" height={52} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonBannerDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Banner */}
      <SkeletonBox width="100%" height={180} borderRadius={0} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Logo + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <SkeletonBox width={60} height={60} borderRadius={30} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width="70%" height={18} />
            <SkeletonBox width="50%" height={13} />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <SkeletonBox width={16} height={16} borderRadius={8} />
              <SkeletonBox width={60} height={13} />
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[0, 1, 2, 3].map(i => <SkeletonBox key={i} width={72} height={60} borderRadius={8} />)}
        </View>

        {/* Description */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: 8 }]}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width="100%" height={12} />
          <SkeletonBox width="85%" height={12} />
        </View>

        {/* List items */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={120} height={14} style={{ marginBottom: spacing.md }} />
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.listItem, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border, paddingTop: i > 0 ? spacing.sm : 0 }]}>
              <SkeletonBox width={56} height={56} borderRadius={4} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width="65%" height={14} />
                <SkeletonBox width="45%" height={12} />
                <SkeletonBox width="55%" height={12} />
              </View>
              <SkeletonBox width={80} height={18} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonClientDashboard() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={140} height={20} />
        <SkeletonBox width={28} height={28} borderRadius={14} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Welcome banner */}
        <SkeletonBox width="100%" height={100} borderRadius={8} />

        {/* Stats grid 2x2 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailCard, { backgroundColor: card, borderColor: border, width: '47%', gap: 8 }]}>
              <SkeletonBox width={36} height={36} borderRadius={8} />
              <SkeletonBox width={50} height={22} />
              <SkeletonBox width={80} height={12} />
            </View>
          ))}
        </View>

        {/* Recent reservations */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={160} height={16} style={{ marginBottom: spacing.md }} />
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.listItem, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border, paddingTop: i > 0 ? spacing.sm : 0 }]}>
              <SkeletonBox width={44} height={44} borderRadius={4} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width="70%" height={14} />
                <SkeletonBox width="50%" height={12} />
              </View>
              <SkeletonBox width={70} height={24} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Agency screens ──────────────────────────────────────────────────────────

export function SkeletonAgencyInfo() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Logo upload */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }]}>
          <SkeletonBox width={88} height={88} borderRadius={44} />
          <SkeletonBox width={120} height={14} />
        </View>

        {/* Form fields */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: spacing.md }]}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={{ gap: 6 }}>
              <SkeletonBox width={90} height={12} />
              <SkeletonBox width="100%" height={44} borderRadius={4} />
            </View>
          ))}
        </View>

        <SkeletonBox width="100%" height={48} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonAgencyPlanning() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Agency banner */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
          <SkeletonBox width={56} height={56} borderRadius={8} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="65%" height={16} />
            <SkeletonBox width="45%" height={13} />
          </View>
        </View>

        {/* Tab bar */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[0, 1, 2].map(i => <SkeletonBox key={i} width={90} height={36} borderRadius={18} />)}
        </View>

        {/* Content sections */}
        {[0, 1].map(section => (
          <View key={section} style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: spacing.md }]}>
            <SkeletonBox width={120} height={14} />
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.listItem, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border, paddingTop: i > 0 ? spacing.sm : 0 }]}>
                <SkeletonBox width={36} height={36} borderRadius={18} />
                <View style={{ flex: 1, gap: 5 }}>
                  <SkeletonBox width="60%" height={13} />
                  <SkeletonBox width="40%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function SkeletonSubscription() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Current plan */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, gap: spacing.md }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 6 }}>
              <SkeletonBox width={100} height={12} />
              <SkeletonBox width={140} height={20} />
              <SkeletonBox width={80} height={16} />
            </View>
            <SkeletonBox width={60} height={26} borderRadius={13} />
          </View>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <SkeletonBox width={16} height={16} borderRadius={8} />
              <SkeletonBox width="70%" height={13} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonBox width="45%" height={12} />
            <SkeletonBox width="45%" height={12} />
          </View>
        </View>

        {/* Other plans */}
        <SkeletonBox width={120} height={16} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[0, 1].map(i => (
            <View key={i} style={[s.detailCard, { backgroundColor: card, borderColor: border, flex: 1, gap: spacing.sm }]}>
              <SkeletonBox width="60%" height={16} />
              <SkeletonBox width="80%" height={20} />
              {[0, 1, 2].map(j => <SkeletonBox key={j} width="90%" height={12} />)}
              <SkeletonBox width="100%" height={40} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Billing history */}
        <SkeletonBox width={140} height={16} />
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <SkeletonBox width="50%" height={13} />
              <SkeletonBox width={60} height={22} borderRadius={11} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Organisation screens ────────────────────────────────────────────────────

export function SkeletonOrgAgencyDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Banner */}
      <SkeletonBox width="100%" height={160} borderRadius={0} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Name + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 6 }}>
            <SkeletonBox width={180} height={20} />
            <SkeletonBox width={120} height={13} />
          </View>
          <SkeletonBox width={80} height={26} borderRadius={13} />
        </View>

        {/* Tab bar */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[0, 1, 2, 3].map(i => <SkeletonBox key={i} width={76} height={34} borderRadius={17} />)}
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailCard, { backgroundColor: card, borderColor: border, width: '47%', gap: 6 }]}>
              <SkeletonBox width={32} height={32} borderRadius={8} />
              <SkeletonBox width={60} height={20} />
              <SkeletonBox width={80} height={11} />
            </View>
          ))}
        </View>

        {/* Info rows */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <SkeletonBox width={16} height={16} borderRadius={8} />
                <SkeletonBox width={80} height={13} />
              </View>
              <SkeletonBox width={100} height={13} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonInfoDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Top card */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }]}>
          <SkeletonBox width={72} height={72} borderRadius={36} />
          <SkeletonBox width={160} height={18} />
          <SkeletonBox width={100} height={13} />
          <SkeletonBox width={80} height={26} borderRadius={13} />
        </View>

        {/* Info rows */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={120} height={14} style={{ marginBottom: spacing.md }} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <SkeletonBox width={16} height={16} borderRadius={8} />
                <SkeletonBox width={90} height={13} />
              </View>
              <SkeletonBox width={110} height={13} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── BSM screens ─────────────────────────────────────────────────────────────

export function SkeletonBsmDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Banner */}
      <SkeletonBox width="100%" height={160} borderRadius={0} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Name + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 8, flex: 1 }}>
            <SkeletonBox width="75%" height={20} />
            <SkeletonBox width="55%" height={13} />
            <SkeletonBox width="80%" height={13} />
          </View>
          <SkeletonBox width={70} height={26} borderRadius={13} />
        </View>

        {/* Info rows */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <SkeletonBox width={16} height={16} borderRadius={8} />
                <SkeletonBox width={80} height={13} />
              </View>
              <SkeletonBox width={100} height={13} />
            </View>
          ))}
        </View>

        {/* Action buttons */}
        {[0, 1].map(i => <SkeletonBox key={i} width="100%" height={48} borderRadius={4} />)}
      </View>
    </View>
  );
}

export function SkeletonTaxDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={120} height={18} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Hero card */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }]}>
          <SkeletonBox width={64} height={64} borderRadius={32} />
          <SkeletonBox width={160} height={22} />
          <SkeletonBox width={100} height={13} />
          <SkeletonBox width={120} height={32} borderRadius={4} />
          <SkeletonBox width={80} height={26} borderRadius={13} />
        </View>

        {/* Info rows */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <SkeletonBox width={90} height={13} />
              <SkeletonBox width={100} height={13} />
            </View>
          ))}
        </View>

        {/* Delete button */}
        <SkeletonBox width="100%" height={48} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonTaxeAffiliation() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header with subtitle */}
      <View style={[{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: 6 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <View style={{ gap: 4, alignItems: 'center' }}>
            <SkeletonBox width={160} height={18} />
            <SkeletonBox width={100} height={12} />
          </View>
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="65%" height={14} />
              <SkeletonBox width="45%" height={12} />
              <SkeletonBox width="35%" height={11} />
            </View>
            <View style={{ gap: spacing.xs }}>
              <SkeletonBox width={36} height={36} borderRadius={18} />
              <SkeletonBox width={36} height={36} borderRadius={18} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SkeletonBookingDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={160} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* QR Code area */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
            <SkeletonBox width={130} height={130} borderRadius={8} />
            <SkeletonBox width={140} height={14} />
            <SkeletonBox width={80} height={26} borderRadius={13} />
          </View>
        </View>

        {/* Trip route visual */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={100} height={13} style={{ marginBottom: spacing.md }} />
          <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ gap: 6, flex: 1 }}>
              <SkeletonBox width="80%" height={16} />
              <SkeletonBox width="60%" height={12} />
            </View>
            <SkeletonBox width={28} height={28} borderRadius={14} />
            <View style={{ gap: 6, flex: 1, alignItems: 'flex-end' }}>
              <SkeletonBox width="80%" height={16} />
              <SkeletonBox width="60%" height={12} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ gap: 4 }}>
                <SkeletonBox width={60} height={11} />
                <SkeletonBox width={80} height={14} />
              </View>
            ))}
          </View>
        </View>

        {/* Agency */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.listItem, { marginBottom: 0 }]}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="60%" height={14} />
              <SkeletonBox width="40%" height={12} />
            </View>
            <SkeletonBox width={36} height={36} borderRadius={18} />
          </View>
        </View>

        {/* Passengers */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={120} height={14} style={{ marginBottom: spacing.md }} />
          {[0, 1].map(i => (
            <View key={i} style={[s.listItem, { paddingVertical: spacing.sm, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <SkeletonBox width={32} height={32} borderRadius={16} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="55%" height={14} />
                <SkeletonBox width="40%" height={11} />
              </View>
              <SkeletonBox width={70} height={14} />
            </View>
          ))}
        </View>

        {/* Payment summary */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <SkeletonBox width={100} height={13} />
              <SkeletonBox width={80} height={i === 2 ? 18 : 13} />
            </View>
          ))}
        </View>

        {/* Cancel button */}
        <SkeletonBox width="100%" height={48} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonAgencyTripDetail() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Image */}
      <SkeletonBox width="100%" height={200} borderRadius={0} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Main info card */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <SkeletonBox width={160} height={20} />
            <SkeletonBox width={70} height={24} borderRadius={12} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <SkeletonBox width={90} height={13} />
            <SkeletonBox width={70} height={13} />
          </View>
        </View>

        {/* Stats row */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row' }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: border }}>
              <SkeletonBox width={50} height={20} />
              <SkeletonBox width={70} height={11} />
            </View>
          ))}
        </View>

        {/* Detail rows */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[s.detailRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <SkeletonBox width={16} height={16} borderRadius={8} />
                <SkeletonBox width={80} height={13} />
              </View>
              <SkeletonBox width={100} height={13} />
            </View>
          ))}
        </View>

        {/* Action buttons */}
        {[0, 1, 2].map(i => (
          <SkeletonBox key={i} width="100%" height={48} borderRadius={4} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonOrgDashboard() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? colors.dark.backgroundAlt : colors.light.backgroundAlt;
  const card = isDark ? colors.dark.background : colors.light.background;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <View style={[s.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.detailHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={{ gap: 6 }}>
          <SkeletonBox width={140} height={22} />
          <SkeletonBox width={90} height={13} />
        </View>
        <SkeletonBox width={36} height={36} borderRadius={18} />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Agency selector */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border, flexDirection: 'row', alignItems: 'center' }]}>
          <SkeletonBox width={48} height={48} borderRadius={8} />
          <View style={{ flex: 1, gap: 6, marginLeft: spacing.md }}>
            <SkeletonBox width="60%" height={16} />
            <SkeletonBox width="40%" height={12} />
          </View>
          <SkeletonBox width={20} height={20} borderRadius={10} />
        </View>

        {/* KPI grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.detailCard, { backgroundColor: card, borderColor: border, width: '47%', gap: 8 }]}>
              <SkeletonBox width={36} height={36} borderRadius={8} />
              <SkeletonBox width={70} height={22} />
              <SkeletonBox width={90} height={12} />
              <SkeletonBox width={60} height={11} />
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <SkeletonBox width={120} height={16} />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {[0, 1, 2].map(i => <SkeletonBox key={i} width={36} height={28} borderRadius={4} />)}
            </View>
          </View>
          <SkeletonBox width="100%" height={140} borderRadius={8} />
        </View>

        {/* Recent bookings */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <SkeletonBox width={140} height={16} style={{ marginBottom: spacing.md }} />
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.listItem, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: border, paddingTop: i > 0 ? spacing.sm : 0 }]}>
              <SkeletonBox width={38} height={38} borderRadius={19} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="65%" height={13} />
                <SkeletonBox width="45%" height={11} />
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <SkeletonBox width={60} height={20} borderRadius={10} />
                <SkeletonBox width={50} height={11} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Aliases ─────────────────────────────────────────────────────────────────
export const SkeletonTripDetail = SkeletonClientTripDetail;
export const SkeletonAgencyDetail = SkeletonBannerDetail;
export const SkeletonStationDetail = SkeletonBannerDetail;
export const SkeletonOrgProfile = SkeletonInfoDetail;
export const SkeletonServiceLineDetail = SkeletonInfoDetail;

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  pad: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cards: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
