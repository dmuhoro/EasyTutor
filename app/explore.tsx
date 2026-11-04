import { lazy, Suspense } from 'react';
import { RouteFallback } from '../components/RouteFallback';

const Screen = lazy(() => import('../screens/explore'));

export default function ExploreTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
