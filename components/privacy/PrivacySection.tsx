import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { getConsent, grantConsent, withdrawConsent } from '../../lib/privacy/consent';
import { deleteUserData } from '../../lib/privacy/dataDeletion';
import { downloadUserData } from '../../lib/privacy/dataExport';
import { t } from '../../src/locales/privacyT';

/**
 * Reachable privacy controls on the real /settings route.
 * Destructive actions always require an explicit confirmation, and the status
 * line reports the real outcome (including a failed or partial deletion).
 */
export function PrivacySection() {
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getConsent().then((record) => {
      if (active) setConsented(Boolean(record.consented));
    });
    return () => { active = false; };
  }, []);

  const handleConsent = (next: boolean): void => {
    if (next) {
      void grantConsent({ dataProcessing: true }).then(() => {
        setConsented(true);
        setStatus(t('privacy.consentGranted'));
      });
      return;
    }
    Alert.alert(t('privacy.confirmWithdrawTitle'), t('privacy.confirmWithdrawMessage'), [
      { text: t('privacy.cancel'), style: 'cancel' },
      {
        text: t('privacy.withdraw'),
        style: 'destructive',
        onPress: () => {
          void withdrawConsent().then(() => {
            setConsented(false);
            setStatus(t('privacy.consentWithdrawn'));
          });
        },
      },
    ]);
  };

  const handleExport = (): void => {
    void downloadUserData().then((ok) => {
      setStatus(t(ok ? 'privacy.exportSuccess' : 'privacy.exportFailed'));
    });
  };

  const handleDelete = (): void => {
    Alert.alert(t('privacy.confirmDeleteTitle'), t('privacy.confirmDeleteMessage'), [
      { text: t('privacy.cancel'), style: 'cancel' },
      {
        text: t('privacy.confirmDeleteAction'),
        style: 'destructive',
        onPress: () => {
          void deleteUserData().then((report) => {
            setStatus(t(report.ok
              ? 'privacy.deleteSuccess'
              : 'privacy.deleteFailed', { auditId: report.auditId }));
          });
        },
      },
    ]);
  };

  return (
    <View className="bg-surface-card p-5 rounded-2xl border border-surface-border mb-4">
      <Text className="text-text-primary font-bold font-syne text-lg mb-1">{t('privacy.title')}</Text>
      <Text className="text-text-secondary text-xs font-dmsans mb-4">{t('privacy.deleteHelp')}</Text>

      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 pr-4">
          <Text className="text-text-primary font-dmsans text-sm">{t('privacy.consentLabel')}</Text>
          <Text className="text-text-secondary text-xs font-dmsans mt-1">{t('privacy.consentHelp')}</Text>
        </View>
        <Switch
          value={consented}
          onValueChange={handleConsent}
          accessibilityLabel={t('privacy.consentLabel')}
        />
      </View>

      <TouchableOpacity
        onPress={handleExport}
        accessibilityRole="button"
        accessibilityLabel={t('privacy.export')}
        className="flex-row items-center justify-between py-3 border-t border-surface-border"
      >
        <Text className="text-text-primary font-dmsans text-sm">{t('privacy.export')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={t('privacy.delete')}
        className="flex-row items-center justify-between py-3 border-t border-surface-border"
      >
        <Text className="text-error-light font-dmsans text-sm">{t('privacy.delete')}</Text>
      </TouchableOpacity>

      {status ? (
        <Text className="text-text-secondary text-xs font-dmsans mt-3">{status}</Text>
      ) : null}
    </View>
  );
}
