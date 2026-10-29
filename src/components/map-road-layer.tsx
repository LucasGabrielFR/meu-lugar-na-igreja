import { useMemo } from 'react';
import type { projectHighways, buildRoadConnections } from '@/lib/map-roads.mjs';

export default function MapRoadLayer({
  roads,
  connections,
  towns,
  zoom,
}: {
  roads: ReturnType<typeof projectHighways>;
  connections: ReturnType<typeof buildRoadConnections>['connections'];
  towns: ReturnType<typeof buildRoadConnections>['towns'];
  zoom: number;
  center?: [number, number];
  units?: number;
  viewport?: { width: number; height: number };
}) {
  const roadPath = useMemo(() => roads.map(road => road.path).join(''), [roads]);
  const { accessPath, localPath } = useMemo(() => {
    let access = '';
    let local = '';
    for (const c of connections) {
      if (c.kind === 'local') local += c.path;
      else access += c.path;
    }
    return { accessPath: access, localPath: local };
  }, [connections]);

  if (zoom < 2 || (!roadPath && !accessPath && !localPath)) return null;

  const isRegional = zoom >= 8;
  const isCity = zoom >= 28;
  const curbWidth = isCity ? 4.2 : isRegional ? 2.6 : 1.7;
  const pavementWidth = isCity ? 2.6 : isRegional ? 1.5 : 0.95;

  return (
    <g pointerEvents="none" opacity={isRegional ? 0.92 : 0.68} strokeLinejoin="round" strokeLinecap="round">
      {roadPath && (
        <g data-real-road-count={roads.length} data-visible-towns={towns.length}>
          <path d={roadPath} fill="none" stroke="#d9d8bd" strokeWidth={curbWidth} vectorEffect="non-scaling-stroke" />
          <path d={roadPath} fill="none" stroke="#89948b" strokeWidth={pavementWidth} vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {isRegional && accessPath && (
        <g data-illustrative-road="access-batch">
          <path d={accessPath} fill="none" stroke="#d9d8bd" strokeWidth={curbWidth + 0.6} vectorEffect="non-scaling-stroke" />
          <path d={accessPath} fill="none" stroke="#89948b" strokeWidth={pavementWidth + 0.3} vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {isRegional && localPath && (
        <g data-illustrative-road="local-batch">
          <path d={localPath} fill="none" stroke="#d9d8bd" strokeWidth={curbWidth + 0.4} vectorEffect="non-scaling-stroke" />
          <path d={localPath} fill="none" stroke="#a19476" strokeWidth={pavementWidth + 0.2} vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  );
}
