import dynamic from 'next/dynamic';
import React from 'react';

import { PieChartSkeleton } from '../skeletons/ChartSkeleton';

const LazyCore = dynamic(() => import('./appointments-status-chart-core'), {
  ssr: false,
  loading: () => <PieChartSkeleton height="360px" />
});

const AppointmentsStatusChart = (props: any) => {
  return <LazyCore {...props} />;
};

export default React.memo(AppointmentsStatusChart);
