import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/tutor/session').then((m) => ({ default: m.TutorScreen })));

export default function TutorSessionRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
