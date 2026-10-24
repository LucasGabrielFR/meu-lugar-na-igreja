export function churchConstructionLevel(activeHouseCount) {
  if (activeHouseCount >= 48) return 4;
  if (activeHouseCount >= 24) return 3;
  if (activeHouseCount >= 8) return 2;
  return 1;
}
