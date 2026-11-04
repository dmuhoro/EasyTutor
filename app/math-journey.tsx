import { lazy, Suspense } from 'react';
import { RouteFallback } from '../components/RouteFallback';

const Screen = lazy(() => import('../screens/math-journey'));

export default function MathJourneyTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
