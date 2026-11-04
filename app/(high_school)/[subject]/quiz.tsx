import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../../components/RouteFallback';

const Screen = lazy(() => import('../../../screens/high_school/[subject]/quiz'));

export default function HighSchoolSubjectQuizTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
