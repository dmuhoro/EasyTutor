import { lazy, Suspense } from 'react';
import { RouteFallback } from '../components/RouteFallback';

const Screen = lazy(() => import('../screens/profile'));

export default function ProfileTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
