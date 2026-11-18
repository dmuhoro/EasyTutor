import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../../components/RouteFallback';

const Screen = lazy(() => import('../../../screens/high_school/[subject]/topics'));

export default function HighSchoolSubjectTopicsTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
