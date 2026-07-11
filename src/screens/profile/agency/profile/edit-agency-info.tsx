import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { useToast } from '../../../../components/toast';
import type { RootStackParamList } from '../../../../navigation';

export default function AgencyEditInfo() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agencyId, setAgencyId] = useState('');
  const [longName, setLongName] = useState('');
  const [shortName, setShortName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [socialNetwork, setSocialNetwork] = useState('');
  const [longNameError, setLongNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const t = {
    fr: {
      title: "Modifier l'agence",
      longName: 'Nom complet',
      shortName: 'Nom court',
      location: 'Localisation',
      description: 'Description',
      greeting: "Message d'accueil",
      greetingPlaceholder: 'Bienvenue chez notre agence !',
      socialNetwork: 'Réseau social',
      socialPlaceholder: 'facebook.com/mon-agence',
      cancel: 'Annuler',
      save: 'Enregistrer les modifications',
      required: 'Ce champ est requis.',
      errorGeneric: 'Une erreur est survenue.',
      changesSaved: 'Modifications enregistrées',
      saveError: 'Erreur lors de la sauvegarde',
    },
    en: {
      title: 'Edit agency',
      longName: 'Full name',
      shortName: 'Short name',
      location: 'Location',
      description: 'Description',
      greeting: 'Greeting message',
      greetingPlaceholder: 'Welcome to our agency!',
      socialNetwork: 'Social network',
      socialPlaceholder: 'facebook.com/my-agency',
      cancel: 'Cancel',
      save: 'Save changes',
      required: 'This field is required.',
      errorGeneric: 'An error occurred.',
      changesSaved: 'Changes saved',
      saveError: 'Save error',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const res = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgencyId(data.id || '');
        setLongName(data.longName || data.long_name || '');
        setShortName(data.shortName || data.short_name || '');
        setLocation(data.location || '');
        setDescription(data.description || '');
        setGreetingMessage(data.greetingMessage || data.greeting_message || '');
        setSocialNetwork(data.socialNetwork || data.social_network || '');
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!longName.trim()) {
      setLongNameError(t.required);
      return;
    }
    if (!agencyId) return;

    setSubmitting(true);
    setApiError('');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/agence/${agencyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          long_name: longName,
          short_name: shortName,
          location: location,
          description: description,
          greeting_message: greetingMessage,
          social_network: socialNetwork,
        }),
      });

      if (res.ok) {
        toast.success(t.changesSaved);
        navigation.goBack();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(t.saveError);
        setApiError(data.message || t.errorGeneric);
      }
    } catch {
      toast.error(t.saveError);
      setApiError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nom */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.longName} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  borderColor: longNameError ? colors.error : theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={longName}
              onChangeText={v => {
                setLongName(v);
                setLongNameError('');
              }}
              placeholderTextColor={theme.placeholder}
            />
            {longNameError !== '' && (
              <Text style={[styles.fieldError, { color: colors.error }]}>
                {longNameError}
              </Text>
            )}
          </View>

          {/* Nom court */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.shortName}
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={shortName}
              onChangeText={setShortName}
              placeholder="CAV"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          {/* Localisation */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.location}
            </Text>
            <View
              style={[
                styles.locationInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons name="location-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.locationTextInput, { color: theme.textStrong }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Yaoundé, Centre"
                placeholderTextColor={theme.placeholder}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.description}
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                styles.fieldTextarea,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Message d'accueil */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.greeting}
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                styles.fieldTextarea,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={greetingMessage}
              onChangeText={setGreetingMessage}
              placeholder={t.greetingPlaceholder}
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Réseau social */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.socialNetwork}
            </Text>
            <View
              style={[
                styles.locationInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color={theme.text}
              />
              <TextInput
                style={[styles.locationTextInput, { color: theme.textStrong }]}
                value={socialNetwork}
                onChangeText={setSocialNetwork}
                placeholder={t.socialPlaceholder}
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          {apiError !== '' && (
            <Text style={[styles.apiError, { color: colors.error }]}>
              {apiError}
            </Text>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: theme.textStrong }]}>
              {t.cancel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  title: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    flex: 1,
    textAlign: 'center',
  },
  content: { padding: spacing.lg },

  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  fieldTextarea: { height: 90, paddingTop: spacing.sm },
  fieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 3,
  },

  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  locationTextInput: {
    flex: 1,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },

  apiError: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
