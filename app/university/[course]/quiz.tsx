import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../../components/RouteFallback';

const Screen = lazy(() => import('../../../screens/university/[course]/quiz'));

export default function UniversityCourseQuizTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
