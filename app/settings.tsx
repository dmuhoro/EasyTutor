import { lazy, Suspense } from 'react';
import { RouteFallback } from '../components/RouteFallback';

const Screen = lazy(() => import('../screens/settings/index').then((m) => ({ default: m.ProfileScreen })));

export default function SettingsTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
