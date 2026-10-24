import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MAP_ZOOM, clampMapZoom, visibleMapTiles, zoomAround } from '../src/lib/map-navigation.mjs';

test('zoom reaches municipal scale while the world point under the cursor stays fixed', () => {
  const center = [-54,18], anchor = [-48.5,14.5], previous = 3.5, next = clampMapZoom(64);
  assert.ok(next>3.5);
  assert.equal(clampMapZoom(100000),MAX_MAP_ZOOM);
  const result = zoomAround(center,anchor,previous,next);
  for (let axis=0; axis<2; axis++) assert.ok(Math.abs((anchor[axis]-center[axis])*previous-(anchor[axis]-result[axis])*next)<1e-10);
});

test('street tiles cover the visible city and stay bounded on a wide screen', () => {
  const center=[-48.5,14.5];
  const tiles=visibleMapTiles(center,512,2400,600);
  assert.ok(tiles.length>0&&tiles.length<=64);
  assert.ok(tiles.every(tile=>tile.level>5));
  assert.ok(tiles.some(tile=>center[0]>=tile.left&&center[0]<=tile.left+tile.size&&center[1]>=tile.top&&center[1]<=tile.top+tile.size));
  assert.deepEqual(visibleMapTiles([30,0],512,800,600),[]);
});
