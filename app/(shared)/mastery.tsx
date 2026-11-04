import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/shared/mastery'));

export default function SharedMasteryTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
