'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as MapPointerEvent, WheelEvent as MapWheelEvent } from 'react';
import geo from '../../public/data/brasil.json';
import municipalSeats from '../../public/data/municipio-sedes.json';
import { clampMapZoom, visibleMapTiles, zoomAround } from '@/lib/map-navigation.mjs';
import { buildTownLayout, estimateTownRadius } from '@/lib/town-layout.mjs';
import { minimumLabelParishes, selectMapLabels } from '@/lib/map-labels.mjs';
import { buildTownScales, regionFor, STATE_NAMES } from '@/lib/map-territories.mjs';
import { cachedTownLayout, cachedTownOutline, scopedCityCodes } from '@/lib/map-rendering.mjs';
import type { City, CityWorld, MapFocus, MapSelection } from '@/lib/types';
import MapLoading from './map-loading';
import TownArt from './town-art';
import { buildRoadConnections } from '@/lib/map-roads.mjs';
import MapRoadLayer from './map-road-layer';
import IllustrativeFlights from './illustrative-flights';
import { useRoadData } from './use-road-data';

const states: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};
const mercatorY = (latitude: number) => (-Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * 180) / Math.PI;
const seats = new Map((municipalSeats as [number, number, number][]).map(([code, lon, lat]) => [code, { lon, lat, y: mercatorY(lat) }]));
const localScale = (latitude: number) => 4.2 / (111320 * Math.cos((latitude * Math.PI) / 180));
const biome = (uf: string) =>
  ['AC', 'AM', 'AP', 'PA', 'RO', 'RR'].includes(uf)
    ? '#6c8f73'
    : ['AL', 'BA', 'CE', 'PB', 'PE', 'PI', 'RN', 'SE'].includes(uf)
      ? '#9ea47c'
      : ['RS', 'SC', 'PR'].includes(uf)
        ? '#8ba57d'
        : '#859b75';

function TownEmblem({ size, populated }: { size: number; populated: boolean }) {
  return (
    <g transform={`scale(${size / 10})`}>
      <ellipse cy="4" rx="10" ry="5" fill={populated ? '#f0d27a' : '#d8d7b0'} opacity=".85" />
      <path d="M-5-5H5V7H-5Z" fill="#f4e9cc" stroke="#53674e" strokeWidth=".8" />
      <path d="M-7-5L0-12L7-5Z" fill="#af8050" />
      <path d="M0-17V-11M-3-14H3" stroke="#5f6046" strokeWidth="1.1" />
      <path d="M-1 7V1H2V7" fill="#6f8985" />
      {populated && (
        <>
          <path d="M-12 0L-8-4L-4 0V7H-12Z" fill="#e69b6c" stroke="#6c7b58" strokeWidth=".6" />
          <path d="M5 1L9-3L13 1V8H5Z" fill="#d9b468" stroke="#6c7b58" strokeWidth=".6" />
        </>
      )}
    </g>
  );
}

type BoundaryRecord = { code: number; path: string; bounds: number[] };

export default function WorldMap({
  cities,
  worlds,
  loadCity,
  focus,
  zoom,
  onZoom,
  uf,
  onState,
  showRoads,
  showHighways,
  selectedHouse,
  selectedParish,
  selectedCity,
  animateFlights,
  onInspect,
}: {
  cities: City[];
  worlds: Record<number, CityWorld>;
  loadCity: (code: number) => Promise<CityWorld>;
  focus: MapFocus;
  zoom: number;
  onZoom: (zoom: number) => void;
  uf: string;
  onState: (uf: string) => void;
  showRoads: boolean;
  showHighways: boolean;
  selectedHouse: number | null;
  selectedParish: number | null;
  selectedCity: number | null;
  animateFlights: boolean;
  onInspect: (selection: MapSelection) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [center, setCenter] = useState<[number, number]>(() => {
    const point = focus.code ? seats.get(focus.code) : null;
    return point ? [point.lon, point.y] : [-54, 18];
  });
  const [tileView, setTileView] = useState({ center: [-54, 18], zoom: 1, width: 800, height: 600 });
  const [settledTiles, setSettledTiles] = useState<Set<string>>(() => new Set());
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [hoveredCity, setHoveredCity] = useState<number | null>(null);
  const [hoveredParish, setHoveredParish] = useState<number | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const boundaryCache = useRef<Map<number, BoundaryRecord | null>>(new Map());
  const [boundaries, setBoundaries] = useState<Record<number, BoundaryRecord>>({});
  const [boundaryError, setBoundaryError] = useState<{ code: number; message: string } | null>(null);

  const boundary = selectedCity ? boundaries[selectedCity] ?? null : null;
  const boundaryStatus = !selectedCity
    ? ''
    : boundary?.code === selectedCity
      ? 'Território municipal oficial · IBGE'
      : boundaryError?.code === selectedCity
        ? boundaryError.message
        : 'Carregando território municipal…';

  const { highways, failed: roadsFailed, warmed: roadsWarmed, warmProgress: roadWarmProgress, detailTiles } = useRoadData(tileView, showHighways);
  const [citiesPreloaded, setCitiesPreloaded] = useState(false);
  const appliedFocus = useRef('');
  const moved = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; center: [number, number]; units: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number; center: [number, number]; anchor: number[] } | null>(null);
  const liveCamera = useRef({ center, zoom });
  const cameraFrame = useRef<number | null>(null);
  const inputUntil = useRef(0);

  useEffect(() => {
    if (cameraFrame.current === null) liveCamera.current = { center, zoom };
  }, [center, zoom]);

  useEffect(
    () => () => {
      if (cameraFrame.current !== null) cancelAnimationFrame(cameraFrame.current);
    },
    []
  );

  const queueCamera = useCallback(
    (nextCenter: [number, number], nextZoom: number) => {
      liveCamera.current = { center: nextCenter, zoom: nextZoom };
      inputUntil.current = performance.now() + 200;
      if (cameraFrame.current !== null) return;
      cameraFrame.current = requestAnimationFrame(() => {
        cameraFrame.current = null;
        setCenter(liveCamera.current.center);
        onZoom(liveCamera.current.zoom);
      });
    },
    [onZoom]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingExpired(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setTileView({ center, zoom, ...viewport }), 260);
    return () => window.clearTimeout(timer);
  }, [center, zoom, viewport]);

  // Pre-load initial/featured cities and their layouts during the MapLoading screen
  useEffect(() => {
    let cancelled = false;
    const priorityCodes = new Set<number>();
    if (focus.code) priorityCodes.add(focus.code);
    const topCities = [...cities]
      .filter(c => c.active && (c.houses > 0 || c.parishes > 0))
      .sort((a, b) => b.houses * 100 - a.houses * 100 + (b.parishes - a.parishes))
      .slice(0, 6);
    for (const c of topCities) priorityCodes.add(c.code);

    Promise.all(
      [...priorityCodes].map(code =>
        loadCity(code)
          .then(w => {
            const layout = cachedTownLayout(w);
            cachedTownOutline(layout);
          })
          .catch(() => {})
      )
    ).finally(() => {
      if (!cancelled) setCitiesPreloaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cities, focus.code, loadCity]);

  const tiles = useMemo(() => (showRoads ? visibleMapTiles(tileView.center, tileView.zoom, tileView.width, tileView.height) : []), [tileView, showRoads]);
  const layouts = useMemo<Record<number, ReturnType<typeof buildTownLayout>>>(
    () => Object.fromEntries(Object.entries(worlds).map(([code, world]) => [code, cachedTownLayout(world)])),
    [worlds]
  );
  const radii = useMemo(() => Object.fromEntries(cities.map(city => [city.code, estimateTownRadius(city.houses, city.parishes)])), [cities]);
  const townScales = useMemo(() => buildTownScales(cities, seats, radii), [cities, radii]);
  const outlines = useMemo(() => Object.fromEntries(Object.entries(layouts).map(([code, layout]) => [code, cachedTownOutline(layout)])), [layouts]);

  const roadNetwork = useMemo(
    () =>
      showHighways && highways.length && tileView.zoom >= 10
        ? buildRoadConnections(cities, seats, highways, radii, townScales, scopedCityCodes(cities, seats, tileView, radii, townScales))
        : { connections: [], exits: {} as Record<number, number[]>, towns: [], unconnected: [] },
    [cities, highways, radii, townScales, tileView, showHighways]
  );

  const dimension = 48 / zoom;
  const units = dimension / Math.max(1, Math.min(viewport.width, viewport.height));

  const shapes = useMemo(
    () =>
      geo.features.map(feature => {
        const geometry = feature.geometry as { type: string; coordinates: number[][][] | number[][][][] };
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : (geometry.coordinates as number[][][][]);
        const path = polygons
          .map(polygon => polygon.map(ring => ring.map(([lon, lat], i) => `${i ? 'L' : 'M'}${lon.toFixed(5)},${mercatorY(lat).toFixed(6)}`).join('') + 'Z').join(''))
          .join('');
        const ring = polygons[0][0];
        const x = (Math.min(...ring.map(p => p[0])) + Math.max(...ring.map(p => p[0]))) / 2;
        const y = mercatorY((Math.min(...ring.map(p => p[1])) + Math.max(...ring.map(p => p[1]))) / 2);
        const coordinates = polygons.flatMap(p => p.flatMap(r => r.map(([lon, lat]) => [lon, mercatorY(lat)])));
        const bounds = coordinates.reduce(
          (b, [lon, lat]) => [Math.min(b[0], lon), Math.min(b[1], lat), Math.max(b[2], lon), Math.max(b[3], lat)],
          [Infinity, Infinity, -Infinity, -Infinity]
        );
        return { uf: states[feature.properties.codarea], path, x, y, bounds };
      }),
    []
  );

  const stateTotals = useMemo(() => {
    const totals: Record<string, { parishes: number; houses: number; cities: number }> = {};
    for (const c of cities) {
      if (!c.active) continue;
      const entry = (totals[c.uf] ??= { parishes: 0, houses: 0, cities: 0 });
      entry.parishes += c.parishes;
      entry.houses += c.houses;
      entry.cities += 1;
    }
    return totals;
  }, [cities]);

  useEffect(() => {
    const key = `${focus.sequence}:${viewport.width}:${viewport.height}`;
    if (appliedFocus.current === key) return;
    const frame = requestAnimationFrame(() => {
      const point = focus.code ? seats.get(focus.code) : null;
      if (!point) {
        const parts = shapes.filter(s => (focus.uf ? s.uf === focus.uf : focus.region ? regionFor(s.uf) === focus.region : false));
        if (parts.length) {
          const box = parts.reduce(
            (b, s) => [Math.min(b[0], s.bounds[0]), Math.min(b[1], s.bounds[1]), Math.max(b[2], s.bounds[2]), Math.max(b[3], s.bounds[3])],
            [Infinity, Infinity, -Infinity, -Infinity]
          );
          setCenter([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]);
          onZoom(
            clampMapZoom(
              48 /
                Math.max(
                  ((box[2] - box[0]) * Math.min(viewport.width, viewport.height)) / viewport.width,
                  ((box[3] - box[1]) * Math.min(viewport.width, viewport.height)) / viewport.height
                ) /
                1.2
            )
          );
        } else {
          setCenter([-54, 18]);
          onZoom(1);
        }
      } else {
        const city = cities.find(c => c.code === focus.code);
        const scale = (townScales[focus.code!] ?? localScale(point.lat)) * 1.18;
        const plot = focus.houseId ? layouts[focus.code!]?.plots.find(p => p.house.id === focus.houseId) : null;
        const district = focus.parishId ? layouts[focus.code!]?.districts.find(p => p.parish.id === focus.parishId) : null;
        if (focus.municipal) {
          if (boundary?.code !== focus.code) return;
          const box = boundary.bounds;
          setCenter([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]);
          onZoom(
            clampMapZoom(
              48 /
                Math.max(
                  ((box[2] - box[0]) * Math.min(viewport.width, viewport.height)) / viewport.width,
                  ((box[3] - box[1]) * Math.min(viewport.width, viewport.height)) / viewport.height
                ) /
                1.2
            )
          );
        } else if (plot) {
          setCenter([point.lon + plot.x * scale, point.y + plot.y * 0.7 * scale]);
          onZoom(clampMapZoom(48 / (100 * scale)));
        } else if (district) {
          setCenter([point.lon + district.x * scale, point.y + district.y * 0.7 * scale]);
          onZoom(clampMapZoom(48 / (384 * scale)));
        } else {
          setCenter([point.lon, point.y]);
          onZoom(city?.parishes ? clampMapZoom(48 / ((layouts[city.code]?.radius ?? estimateTownRadius(city.houses, city.parishes)) * scale * 2.9)) : 128);
        }
      }
      appliedFocus.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, viewport, cities, layouts, onZoom, townScales, shapes, boundary]);

  const visibleCities = useMemo(() => {
    const halfW = (viewport.width * units) / 2;
    const halfH = (viewport.height * units) / 2;
    const list: { city: City; point: { lon: number; lat: number; y: number }; radius: number; scale: number; pixels: number }[] = [];
    for (const city of cities) {
      const point = seats.get(city.code);
      if (!point) continue;
      const radius = radii[city.code] ?? estimateTownRadius(city.houses, city.parishes);
      const scale = (townScales[city.code] ?? localScale(point.lat)) * 1.18;
      const pixels = (radius * scale) / units;
      const margin = (pixels + 90) * units;
      if (Math.abs(point.lon - center[0]) > halfW + margin || Math.abs(point.y - center[1]) > halfH + margin) continue;
      list.push({ city, point, radius, scale, pixels });
    }
    return list;
  }, [cities, radii, townScales, units, viewport.width, viewport.height, center]);

  // Settled visible cities (updated only when tileView settles after pan/zoom) to avoid network/layout spikes mid-gesture
  const settledVisibleCities = useMemo(() => {
    const tUnits = 48 / tileView.zoom / Math.max(1, Math.min(tileView.width, tileView.height));
    const halfW = (tileView.width * tUnits) / 2;
    const halfH = (tileView.height * tUnits) / 2;
    const list: { city: City; point: { lon: number; lat: number; y: number }; pixels: number; dist: number }[] = [];
    for (const city of cities) {
      if (!city.active) continue;
      const point = seats.get(city.code);
      if (!point) continue;
      const radius = radii[city.code] ?? estimateTownRadius(city.houses, city.parishes);
      const scale = (townScales[city.code] ?? localScale(point.lat)) * 1.18;
      const pixels = (radius * scale) / tUnits;
      const margin = (pixels + 90) * tUnits;
      const dx = point.lon - tileView.center[0];
      const dy = point.y - tileView.center[1];
      if (Math.abs(dx) > halfW + margin || Math.abs(dy) > halfH + margin) continue;
      list.push({ city, point, pixels, dist: Math.hypot(dx, dy) });
    }
    return list;
  }, [cities, radii, townScales, tileView]);

  // Batch-load municipal territory polygons for settled visible cities at regional/city zoom
  const wantedBoundaryCodes = useMemo(() => {
    const codes = new Set<number>();
    if (selectedCity) codes.add(selectedCity);
    if (hoveredCity && zoom >= 2.2) codes.add(hoveredCity);
    if (tileView.zoom >= 2.8) {
      const prioritized = [...settledVisibleCities]
        .sort(
          (a, b) =>
            (b.city.code === selectedCity ? 1e6 : 0) - (a.city.code === selectedCity ? 1e6 : 0) +
            b.city.houses * 50 - a.city.houses * 50 +
            b.city.parishes * 5 - a.city.parishes * 5 -
            (a.dist - b.dist) * 10
        )
        .slice(0, 80);
      for (const item of prioritized) codes.add(item.city.code);
    }
    return [...codes].join(',');
  }, [selectedCity, hoveredCity, zoom, tileView.zoom, settledVisibleCities]);

  useEffect(() => {
    const missing = wantedBoundaryCodes
      .split(',')
      .filter(Boolean)
      .map(Number)
      .filter(code => !boundaryCache.current.has(code));
    if (!missing.length) return;
    const controller = new AbortController();

    if (missing.length === 1 && missing[0] === selectedCity) {
      const code = missing[0];
      fetch(`/api/cities/${code}/boundary`, { signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw Error('boundary');
          const data = (await response.json()) as BoundaryRecord;
          if (!controller.signal.aborted) {
            boundaryCache.current.set(code, data);
            setBoundaries(prev => ({ ...prev, [code]: data }));
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            boundaryCache.current.set(code, null);
            setBoundaryError({ code, message: 'Limite municipal indisponível agora. Área virtual destacada.' });
          }
        });
      return () => controller.abort();
    }

    fetch(`/api/cities/boundaries?codes=${missing.join(',')}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw Error('boundaries');
        const data = (await response.json()) as { boundaries?: BoundaryRecord[] };
        if (controller.signal.aborted) return;
        const found = new Set<number>();
        const patch: Record<number, BoundaryRecord> = {};
        for (const row of data.boundaries ?? []) {
          found.add(row.code);
          boundaryCache.current.set(row.code, row);
          patch[row.code] = row;
        }
        for (const code of missing) {
          if (!found.has(code)) {
            boundaryCache.current.set(code, null);
            if (code === selectedCity) {
              setBoundaryError({ code, message: 'Limite municipal indisponível agora. Área virtual destacada.' });
            }
          }
        }
        if (Object.keys(patch).length) {
          setBoundaries(prev => ({ ...prev, ...patch }));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [wantedBoundaryCodes, selectedCity]);

  const needed = useMemo(
    () =>
      settledVisibleCities
        .filter(({ city, pixels }) => city.active && pixels >= 22 && !worlds[city.code] && !errors[city.code])
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
        .map(({ city }) => city.code)
        .join(','),
    [settledVisibleCities, worlds, errors]
  );

  const minimumParishes = minimumLabelParishes(zoom);
  const cityLabels = useMemo(
    () =>
      selectMapLabels(
        visibleCities
          .filter(({ city }) => city.parishes >= minimumParishes || city.code === focus.code || city.houses > 0)
          .map(({ city, point, pixels }) => ({
            id: city.code,
            x: (point.lon - center[0]) / units + viewport.width / 2,
            y: (point.y - center[1]) / units + viewport.height / 2 - 36,
            width: Math.max(65, city.name.length * 7 + 14),
            height: pixels >= 45 ? 34 : 19,
            priority: (city.code === selectedCity ? 1e9 : 0) + city.houses * 500 + city.parishes * 100,
          })),
        { ...viewport, limit: Math.max(5, Math.floor((viewport.width * viewport.height) / 18000)), padding: 7 }
      ),
    [visibleCities, minimumParishes, focus.code, center, units, viewport, selectedCity]
  );

  const cityLabelIds = useMemo(() => new Set(cityLabels.map(label => label.id)), [cityLabels]);

  const renderedCities = useMemo(() => {
    const candidates = visibleCities.filter(
      ({ city, pixels }) =>
        pixels >= 18 || zoom >= 8 || city.houses > 0 || city.parishes >= Math.max(1, Math.floor(minimumParishes / 3)) || city.code === focus.code
    );
    if (candidates.length <= 120) return candidates;
    return [...candidates]
      .sort(
        (a, b) =>
          (b.city.code === selectedCity || b.city.code === focus.code ? 1e9 : 0) -
            (a.city.code === selectedCity || a.city.code === focus.code ? 1e9 : 0) +
          (b.pixels >= 18 ? 1e7 : 0) - (a.pixels >= 18 ? 1e7 : 0) +
          b.city.houses * 1000 - a.city.houses * 1000 +
          b.city.parishes - a.city.parishes
      )
      .slice(0, 120);
  }, [visibleCities, zoom, minimumParishes, focus.code, selectedCity]);

  const visibleBoundaries = useMemo(() => {
    if (zoom < 2.2 && !selectedCity && !hoveredCity) return [];
    const list: { record: BoundaryRecord; city: City | undefined }[] = [];
    const seen = new Set<number>();
    for (const item of visibleCities) {
      const b = boundaries[item.city.code];
      if (b && !seen.has(b.code)) {
        seen.add(b.code);
        list.push({ record: b, city: item.city });
      }
    }
    if (selectedCity && boundaries[selectedCity] && !seen.has(selectedCity)) {
      seen.add(selectedCity);
      list.push({ record: boundaries[selectedCity], city: cities.find(c => c.code === selectedCity) });
    }
    if (hoveredCity && boundaries[hoveredCity] && !seen.has(hoveredCity)) {
      seen.add(hoveredCity);
      list.push({ record: boundaries[hoveredCity], city: cities.find(c => c.code === hoveredCity) });
    }
    return list;
  }, [zoom, selectedCity, hoveredCity, visibleCities, boundaries, cities]);

  useEffect(() => {
    let active = true;
    for (const code of needed.split(',').filter(Boolean).map(Number))
      void loadCity(code).catch(error => {
        if (active && error.name !== 'AbortError') setErrors(previous => ({ ...previous, [code]: 'Não foi possível carregar os moradores.' }));
      });
    return () => {
      active = false;
    };
  }, [needed, loadCity]);

  const wheelZoom = (event: MapWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const current = liveCamera.current;
    const next = clampMapZoom(current.zoom * Math.exp(-Math.max(-180, Math.min(180, event.deltaY)) * 0.0025));
    const box = event.currentTarget.getBoundingClientRect();
    const step = 48 / current.zoom / Math.min(viewport.width, viewport.height);
    const anchor = [
      current.center[0] + (event.clientX - box.left - box.width / 2) * step,
      current.center[1] + (event.clientY - box.top - box.height / 2) * step,
    ];
    queueCamera(zoomAround(current.center, anchor, current.zoom, next) as [number, number], next);
  };

  const startDrag = (event: MapPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    if (!(event.target as Element).closest('[role="button"]')) event.currentTarget.focus({ preventScroll: true });
    moved.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const box = event.currentTarget.getBoundingClientRect();
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
        center,
        anchor: [
          center[0] + (((a.x + b.x) / 2 - box.left - box.width / 2) * units),
          center[1] + (((a.y + b.y) / 2 - box.top - box.height / 2) * units),
        ],
      };
      drag.current = null;
    } else {
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        center: liveCamera.current.center,
        units: 48 / liveCamera.current.zoom / Math.min(viewport.width, viewport.height),
      };
    }
    if (!(event.target as Element).closest('[data-town],[data-city-marker]')) event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: MapPointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const next = clampMapZoom((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch.current.distance));
      moved.current = true;
      if (!isDragging) setIsDragging(true);
      queueCamera(zoomAround(pinch.current.center, pinch.current.anchor, pinch.current.zoom, next) as [number, number], next);
      return;
    }
    const origin = drag.current;
    if (!origin || origin.id !== event.pointerId) return;
    if (!event.buttons) {
      drag.current = null;
      if (isDragging) setIsDragging(false);
      return;
    }
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.hypot(dx, dy) > 4) {
      moved.current = true;
      if (!isDragging) setIsDragging(true);
    }
    queueCamera([origin.center[0] - dx * origin.units, origin.center[1] - dy * origin.units], liveCamera.current.zoom);
  };

  const endPointer = (event: MapPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    drag.current = null;
    pinch.current = null;
    if (isDragging) setIsDragging(false);
  };

  const failed = visibleCities.find(({ city }) => errors[city.code]);
  const summaryCity = cities.find(c => c.code === (hoveredCity ?? (hoveredState ? null : selectedCity)));
  const summaryParish = summaryCity && (hoveredParish ?? selectedParish) ? worlds[summaryCity.code]?.parishes.find(p => p.id === (hoveredParish ?? selectedParish)) : null;
  const stateCities = hoveredState ? cities.filter(c => c.active && c.uf === hoveredState) : [];

  const bootReady = (roadsWarmed && citiesPreloaded) || loadingExpired;
  const bootProgress = Math.min(100, Math.round(roadWarmProgress * 75 + (citiesPreloaded ? 25 : 5)));

  return (
    <div className="national-map-screen illustrated-world" ref={container} data-road-detail-tiles={detailTiles}>
      {!bootReady ? (
        <MapLoading
          label={!roadsWarmed ? 'Carregando e projetando malha rodoviária e territórios…' : 'Preparando comunidades e bairros paroquiais…'}
          loaded={bootProgress}
          total={100}
        />
      ) : (
        showRoads &&
        zoom < 2 &&
        settledTiles.size < tiles.length &&
        !loadingExpired && <MapLoading label="Preparando a cartografia…" loaded={settledTiles.size} total={Math.max(1, tiles.length)} />
      )}
      <svg
        viewBox={`${center[0] - dimension / 2} ${center[1] - dimension / 2} ${dimension} ${dimension}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        tabIndex={0}
        aria-label="Mapa contínuo do Brasil e suas comunidades"
        data-map-zoom={zoom.toFixed(2)}
        onKeyDown={event => {
          const step = units * 65;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) event.preventDefault();
          if (event.key === 'ArrowLeft') setCenter([center[0] - step, center[1]]);
          if (event.key === 'ArrowRight') setCenter([center[0] + step, center[1]]);
          if (event.key === 'ArrowUp') setCenter([center[0], center[1] - step]);
          if (event.key === 'ArrowDown') setCenter([center[0], center[1] + step]);
          if (event.key === '+' || event.key === '=') onZoom(clampMapZoom(zoom * 1.35));
          if (event.key === '-') onZoom(clampMapZoom(zoom / 1.35));
        }}
        onWheel={wheelZoom}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClickCapture={event => {
          if (moved.current) {
            event.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {showRoads && (
          <defs>
            <clipPath id="brazil-land-clip">
              {shapes.map((shape, i) => (
                <path key={i} d={shape.path} clipRule="evenodd" />
              ))}
            </clipPath>
          </defs>
        )}

        <rect x={center[0] - 250} y={center[1] - 250} width="500" height="500" fill="#183652" />

        <g pointerEvents={isDragging ? 'none' : undefined}>
          {shapes.map((shape, i) => {
            const isHighlighted = shape.uf === uf || focus.region === regionFor(shape.uf);
            return (
              <path
                key={i}
                d={shape.path}
                fill={isHighlighted ? '#b39d5b' : biome(shape.uf)}
                fillRule="evenodd"
                stroke="#f0e4bc"
                strokeWidth="1.25"
                vectorEffect="non-scaling-stroke"
                onClick={() => {
                  if (zoom < 2.2 && shape.uf) onState(shape.uf);
                }}
              />
            );
          })}

          {showRoads && (
            <g clipPath="url(#brazil-land-clip)" pointerEvents="none">
              {tiles.map(tile => (
                <image
                  key={tile.key}
                  href={`https://tile.openstreetmap.org/${tile.key}.png`}
                  x={tile.left}
                  y={tile.top}
                  width={tile.size}
                  height={tile.size}
                  preserveAspectRatio="none"
                  opacity=".75"
                  onLoad={() => setSettledTiles(previous => new Set(previous).add(tile.key))}
                  onError={() => setSettledTiles(previous => new Set(previous).add(tile.key))}
                />
              ))}
            </g>
          )}

          {/* Camada de Territórios Municipais Reais (IBGE) */}
          {visibleBoundaries.map(({ record, city }) => {
            const isSelected = record.code === selectedCity || record.code === hoveredCity;
            const hasHouses = (city?.houses ?? 0) > 0;
            return (
              <path
                key={`mun-boundary-${record.code}`}
                d={record.path}
                fill={isSelected ? '#e8bd55' : hasHouses ? '#c98842' : '#557a59'}
                fillOpacity={isSelected ? '.28' : hasHouses ? '.18' : '.07'}
                stroke={isSelected ? '#ffda66' : hasHouses ? '#f2c86b' : '#dfd3a9'}
                strokeOpacity={isSelected ? '1' : '.48'}
                strokeWidth={isSelected ? '2.4' : '.95'}
                vectorEffect="non-scaling-stroke"
                onPointerEnter={() => {
                  if (performance.now() < inputUntil.current) return;
                  setHoveredState(null);
                  setHoveredCity(record.code);
                }}
                onPointerLeave={() => {
                  if (performance.now() < inputUntil.current) return;
                  setHoveredCity(prev => (prev === record.code ? null : prev));
                }}
                onClick={event => {
                  event.stopPropagation();
                  if (city) onInspect({ city });
                }}
              />
            );
          })}

          {showHighways && (
            <MapRoadLayer
              roads={highways}
              connections={roadNetwork.connections}
              towns={roadNetwork.towns}
              zoom={zoom}
              center={center}
              units={units}
              viewport={viewport}
            />
          )}

          {renderedCities.map(({ city, point, scale, pixels }) => {
            const world = worlds[city.code];
            const layout = layouts[city.code];
            const town = !!world?.parishes.length && (pixels >= 42 || (city.code === selectedCity && pixels >= 22));
            const labelY = -24;
            return (
              <g
                key={city.code}
                data-city-marker={city.code}
                data-seat-longitude={point.lon}
                data-seat-latitude={point.lat}
                transform={`translate(${point.lon},${point.y})`}
                onPointerOver={event => {
                  if (performance.now() < inputUntil.current) return;
                  setHoveredCity(city.code);
                  const parish = (event.target as Element).closest('[data-parish-id]');
                  setHoveredParish(parish ? Number(parish.getAttribute('data-parish-id')) : null);
                }}
                onPointerLeave={() => {
                  if (performance.now() < inputUntil.current) return;
                  setHoveredCity(null);
                  setHoveredParish(null);
                }}
                onClick={() => onInspect({ city })}
              >
                {town ? (
                  <g transform={`scale(${scale})`}>
                    <path
                      d={outlines[city.code]}
                      fill="#cbb87d"
                      fillOpacity=".18"
                      role="button"
                      tabIndex={0}
                      aria-label={`Território virtual de ${city.name}`}
                      onFocus={() => setHoveredCity(city.code)}
                      onBlur={() => setHoveredCity(null)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          onInspect({ city });
                        }
                      }}
                    />
                    <TownArt
                      exits={showHighways ? roadNetwork.exits[city.code] ?? [] : []}
                      city={city}
                      world={world}
                      layout={layout}
                      bounds={{
                        left: (center[0] - (viewport.width * units) / 2 - point.lon) / scale,
                        right: (center[0] + (viewport.width * units) / 2 - point.lon) / scale,
                        top: (center[1] - (viewport.height * units) / 2 - point.y) / scale,
                        bottom: (center[1] + (viewport.height * units) / 2 - point.y) / scale,
                      }}
                      unitPixels={scale / units}
                      selectedHouse={selectedHouse}
                      selectedParish={selectedParish}
                      onInspect={onInspect}
                    />
                    {(hoveredCity === city.code || selectedCity === city.code) && (
                      <path
                        d={outlines[city.code]}
                        fill="#f5c84c"
                        fillOpacity=".08"
                        stroke="#ffda66"
                        strokeWidth="2.6"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                ) : (
                  <g
                    transform={`scale(${units})`}
                    role="button"
                    tabIndex={0}
                    className="world-city-emblem"
                    aria-label={`Informações de ${city.name}`}
                    onClick={event => {
                      event.stopPropagation();
                      onInspect({ city });
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onInspect({ city });
                      }
                    }}
                  >
                    <rect x="-18" y="-22" width="36" height="42" fill="transparent" />
                    <TownEmblem size={4.5 + Math.min(6, Math.log2(city.houses + 1))} populated={city.houses > 0} />
                  </g>
                )}
                {cityLabelIds.has(city.code) && !(selectedParish && selectedCity === city.code) && (
                  <g data-city-label={city.code} transform={`scale(${units})`} pointerEvents="none">
                    <text y={labelY} textAnchor="middle" className="svg-city-name">
                      {city.name}
                    </text>
                    {pixels >= 45 && (
                      <text y={labelY + 16} textAnchor="middle" className="svg-city-count">
                        {city.houses} casas · {city.parishes} bairros paroquiais
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Pílulas de Estados (UF) na visão macro, inspiradas no Domine */}
          {zoom >= 0.7 &&
            zoom < 5.5 &&
            shapes.map((shape, i) => {
              if (!shape.uf) return null;
              const st = stateTotals[shape.uf];
              const badgeText = st?.houses ? `${shape.uf} · 🏠 ${st.houses}` : `${shape.uf} · ⛪ ${st?.parishes ?? 0}`;
              const width = Math.max(58, badgeText.length * 6.5 + 14);
              return (
                <g
                  key={`uf-pill-${i}`}
                  transform={`translate(${shape.x},${shape.y}) scale(${units})`}
                  style={{ cursor: 'pointer' }}
                  onClick={event => {
                    event.stopPropagation();
                    onState(shape.uf);
                  }}
                >
                  <rect
                    x={-width / 2}
                    y="-12"
                    width={width}
                    height="22"
                    rx="11"
                    fill="#fffdf7f2"
                    stroke={hoveredState === shape.uf ? '#d49b35' : '#18384b'}
                    strokeWidth="1.4"
                  />
                  <text x="0" y="3" textAnchor="middle" fill="#153549" fontSize="10.5" fontWeight="800">
                    {badgeText}
                  </text>
                </g>
              );
            })}
        </g>

        <IllustrativeFlights center={center} units={units} viewport={viewport} active={animateFlights && !isDragging} />
      </svg>

      {summaryCity ? (
        <aside className="map-hover-summary" role="status">
          <small>{summaryParish ? 'BAIRRO PAROQUIAL' : 'MUNICÍPIO · TERRITÓRIO COMUNITÁRIO'}</small>
          <strong>{summaryParish?.name ?? summaryCity.name}</strong>
          <span>
            {summaryParish ? `${summaryCity.name} · ` : ''}
            {STATE_NAMES[summaryCity.uf]} ({summaryCity.uf}) · {regionFor(summaryCity.uf)}
          </span>
          <span>
            {summaryParish
              ? `${worlds[summaryCity.code]?.houses.filter(h => h.parish_id === summaryParish.id).length ?? 0} casas nesta paróquia`
              : `${summaryCity.parishes} paróquias · ${summaryCity.houses} casas`}
          </span>
          {!summaryParish && <small>Clique no território para ver a cidade; numa igreja para ver a paróquia.</small>}
          <small>
            Dourado: área ilustrada
            {boundaryStatus && selectedCity === summaryCity.code ? ` · ${boundaryStatus}` : ''}
          </small>
        </aside>
      ) : hoveredState ? (
        <aside className="map-hover-summary" role="status">
          <small>ESTADO · {regionFor(hoveredState)}</small>
          <strong>{STATE_NAMES[hoveredState]}</strong>
          <span>
            {stateCities.length} cidades no mapa · {stateCities.reduce((sum, c) => sum + c.parishes, 0)} paróquias
          </span>
          <span>{stateCities.reduce((sum, c) => sum + c.houses, 0)} casas</span>
          <small>Clique para explorar o estado.</small>
        </aside>
      ) : null}

      {roadsFailed && showHighways && (
        <div className="world-data-status" role="status">
          Não foi possível carregar as rodovias. Recarregue o mapa para tentar novamente.
        </div>
      )}
      {failed && (
        <div className="world-data-status" role="status">
          {errors[failed.city.code]}{' '}
          <button
            onClick={() =>
              setErrors(previous => {
                const next = { ...previous };
                delete next[failed.city.code];
                return next;
              })
            }
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
