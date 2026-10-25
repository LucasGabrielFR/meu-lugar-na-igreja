export function seededValue(seed) {
  let value=Math.imul(seed|0,1597334677);value=Math.imul(value^(value>>>16),2246822507);
  return ((value^(value>>>13))>>>0)/4294967296;
}
export {buildTownLayout, neighborhoodGeometry, neighborhoodPlot, estimateTownRadius, BLOCK_SIZE} from './block-layout.mjs';
