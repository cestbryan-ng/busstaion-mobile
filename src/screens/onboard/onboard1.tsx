import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

export default function Onboard1({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={[styles.skipText, { color: theme.textStrong }]}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/onboard1.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          Votre voyage commence ici
        </Text>
        <Text style={[styles.description, { color: theme.textStrong }]}>
          Bienvenue sur Bus Station. La plateforme moderne qui centralise et
          connecte les voyageurs, les agences de transport et les gares
          routières.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate('Onboard2')}
        >
          <Image
            source={
              isDark
                ? require('../../assets/images/onboard1_vector_dark.png')
                : require('../../assets/images/onboard1_vector_light.png')
            }
            style={styles.nextIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  skip: {
    alignSelf: 'flex-end',
  },
  skipText: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    letterSpacing: 0.5,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.85,
    height: height * 0.42,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextIcon: {
    width: 50,
    height: 50,
  },
});
