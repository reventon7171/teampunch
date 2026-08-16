// Small map thumbnail built from a single raw OpenStreetMap XYZ tile (tile.openstreetmap.org) —
// there is no free "static map with marker" OSM service that reliably exists, so instead we
// fetch the one tile the point falls in and position our own pin marker over it in JS/RN,
// using the standard slippy-map tile math (https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).
//
// Volume here is trivial (a handful of check-ins/outs a day for ~10 staff), well within OSM's
// tile usage policy for casual/low-volume use — no API key needed.
const TILE_SIZE = 256;

const lonToWorldX = (lon: number, zoom: number) => ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
const latToWorldY = (lat: number, zoom: number) => {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * TILE_SIZE * 2 ** zoom;
};

export interface MapTileInfo {
  tileUrl: string;
  // 0..1 position of the point within the tile image, for placing a pin overlay
  pinXFraction: number;
  pinYFraction: number;
}

export const getMapTileInfo = (lat: number, lng: number, zoom = 16): MapTileInfo => {
  const worldX = lonToWorldX(lng, zoom);
  const worldY = latToWorldY(lat, zoom);
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  return {
    tileUrl: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
    pinXFraction: worldX / TILE_SIZE - tileX,
    pinYFraction: worldY / TILE_SIZE - tileY,
  };
};
