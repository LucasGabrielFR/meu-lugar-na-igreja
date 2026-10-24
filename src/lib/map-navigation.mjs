export const MIN_MAP_ZOOM = .45;
export const MAX_MAP_ZOOM = 8192;

export function clampMapZoom(zoom) {
  return Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, zoom));
}

export function zoomAround(center, anchor, previousZoom, nextZoom) {
  return anchor.map((coordinate, axis) => coordinate - (coordinate - center[axis]) * previousZoom / nextZoom);
}

// Request only the current viewport, bounded by Brazil; keep unusually wide screens below 64 tiles.
export function visibleMapTiles(center, zoom, width, height) {
  const dimension = 48 / zoom;
  const aspect = width / Math.max(1, height);
  const halfWidth = dimension * Math.max(1, aspect) / 2;
  const halfHeight = dimension * Math.max(1, 1 / aspect) / 2;
  const west = Math.max(-75, center[0] - halfWidth), east = Math.min(-33, center[0] + halfWidth);
  const north = Math.max(-6, center[1] - halfHeight), south = Math.min(42, center[1] + halfHeight);
  if (west >= east || north >= south) return [];
  let level = Math.max(5, Math.min(18, Math.floor(5 + Math.log2(zoom))));
  while (level >= 5) {
    const count = 2 ** level, size = 360 / count;
    const minX = Math.floor((west + 180) / size), maxX = Math.ceil((east + 180) / size) - 1;
    const minY = Math.floor((north + 180) / size), maxY = Math.ceil((south + 180) / size) - 1;
    if ((maxX - minX + 1) * (maxY - minY + 1) <= 64 || level === 5) {
      const tiles = [];
      for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
        tiles.push({ key: `${level}/${x}/${y}`, level, x, y, left: x * size - 180, top: y * size - 180, size });
      }
      return tiles;
    }
    level--;
  }
  return [];
}
