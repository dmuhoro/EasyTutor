import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../../components/RouteFallback';

const Screen = lazy(() => import('../../../screens/university/[course]/roadmap'));

export default function UniversityCourseRoadmapTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
