import dynamic from 'next/dynamic';
import React from 'react';

import { ChartSkeleton } from '../skeletons/ChartSkeleton';

const LazyCore = dynamic(() => import('./appointments-overview-chart-core'), {
  ssr: false,
  loading: () => <ChartSkeleton height="360px" />
});

const AppointmentsOverviewChart = (props: any) => {
  return <LazyCore {...props} />;
};

export default React.memo(AppointmentsOverviewChart);
