import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../../components/RouteFallback';

const Screen = lazy(() => import('../../../screens/high_school/[subject]/roadmap'));

export default function HighSchoolSubjectRoadmapTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
