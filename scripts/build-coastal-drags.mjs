import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTownScales } from '../src/lib/map-territories.mjs';

const data = JSON.parse(gunzipSync(readFileSync('db/geography/municipality-boundaries.geojson.gz')));
const rawSeats = JSON.parse(readFileSync('public/data/municipio-sedes.json', 'utf8'));
const seats = new Map(rawSeats.map(([code, lon, lat]) => [code, { lon, lat }]));
const catalog = JSON.parse(readFileSync('public/data/municipios.json', 'utf8'));
const geo = JSON.parse(readFileSync('public/data/brasil.json', 'utf8'));

const coastalUfs = new Set(['AP', 'PA', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS']);

function makeRing(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { pts, box: [minX, minY, maxX, maxY] };
}

function pointInRing(pt, r) {
  const [minX, minY, maxX, maxY] = r.box;
  if (pt[0] < minX || pt[0] > maxX || pt[1] < minY || pt[1] > maxY) return false;
  let inside = false;
  const poly = r.pts;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const stateRings = geo.features.flatMap(f => {
  if (f.geometry.type === 'Polygon') return [makeRing(f.geometry.coordinates[0])];
  return f.geometry.coordinates.map(poly => makeRing(poly[0]));
});

function inBrazilLand(pt) {
  for (const r of stateRings) {
    if (pointInRing(pt, r)) return true;
  }
  return false;
}

function getCentroid(feature) {
  const geom = feature.geometry;
  const rawRings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);
  let maxArea = -1, bestCentroid = null;
  for (const ring of rawRings) {
    let area = 0, cx = 0, cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p1 = ring[j], p2 = ring[i];
      const f = p1[0] * p2[1] - p2[0] * p1[1];
      area += f;
      cx += (p1[0] + p2[0]) * f;
      cy += (p1[1] + p2[1]) * f;
    }
    area = Math.abs(area) / 2;
    if (area > maxArea) {
      maxArea = area;
      bestCentroid = [cx / (6 * (area || 1)), cy / (6 * (area || 1))];
    }
  }
  return bestCentroid;
}

const byCode = new Map(data.features.map(f => [Number(f.properties.codarea), f]));
const scales = buildTownScales(catalog.map(c => ({ ...c, active: true, parishes: 10 })), seats);

const coastalDrags = {};
let count = 0;

for (const city of catalog) {
  if (!coastalUfs.has(city.uf)) continue;
  const feat = byCode.get(city.code);
  if (!feat) continue;
  const seat = seats.get(city.code);
  if (!seat) continue;

  const scale = (scales[city.code] ?? 0.00003) * 1.18;

  // Check if points around the seat at typical town radius touch the ocean (outside Brazil land)
  let inOcean = false;
  // Test at 200m, 500m, 900m in 16 directions
  for (const dist of [200, 500, 900]) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const testLon = seat.lon + Math.cos(a) * dist * scale;
      const testLat = seat.lat + Math.sin(a) * dist * scale;
      if (!inBrazilLand([testLon, testLat])) {
        inOcean = true;
        break;
      }
    }
    if (inOcean) break;
  }

  if (inOcean) {
    const centroid = getCentroid(feat);
    if (!centroid) continue;

    // We drag t = 0.40 towards the centroid to place the town securely in the land territory of the municipality
    const t = 0.40;
    const targetLon = Number(((1 - t) * seat.lon + t * centroid[0]).toFixed(6));
    const targetLat = Number(((1 - t) * seat.lat + t * centroid[1]).toFixed(6));
    const dLon = Number((targetLon - seat.lon).toFixed(6));
    const dLat = Number((targetLat - seat.lat).toFixed(6));
    coastalDrags[city.code] = [dLon, dLat];
    count++;
  }
}

console.log(`Identified ${count} coastal municipalities with inland drag.`);
writeFileSync('public/data/municipio-coastal-drags.json', JSON.stringify(coastalDrags, null, 2) + '\n');
console.log('Saved to public/data/municipio-coastal-drags.json');
console.log('Recife:', coastalDrags[2611606]);
console.log('Olinda:', coastalDrags[2609600]);
console.log('Jaboatão:', coastalDrags[2607901]);
console.log('Rio de Janeiro:', coastalDrags[3304557]);
