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
