import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/roadmaps/[id]'));

export default function RoadmapsIdTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
