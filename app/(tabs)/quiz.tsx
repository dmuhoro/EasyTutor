import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/tabs/quiz'));

export default function TabsQuizTsxRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
