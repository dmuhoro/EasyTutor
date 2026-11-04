import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/university/school-details'));

export default function UniversitySchoolDetailsTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
