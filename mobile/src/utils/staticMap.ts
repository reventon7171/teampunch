// Small map thumbnail built from a single raster XYZ tile, with our own pin marker positioned
// over it in JS/RN, using the standard slippy-map tile math
// (https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).
//
// Uses CARTO's free basemap tiles (basemaps.cartocdn.com), not tile.openstreetmap.org directly —
// OSM's own tile server started serving a watermarked "Access blocked" placeholder tile instead
// of the real tile for requests from the packaged app (their tile usage policy blocks generic/
// bulk-looking mobile-app traffic; a raw curl from a dev machine still works fine, which is what
// made this confusing to first diagnose). CARTO's basemaps are meant for exactly this kind of
// light embedded use and don't require an API key at this volume (a handful of check-ins/outs a
// day for ~10 staff).
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
    tileUrl: `https://basemaps.cartocdn.com/light_all/${zoom}/${tileX}/${tileY}.png`,
    pinXFraction: worldX / TILE_SIZE - tileX,
    pinYFraction: worldY / TILE_SIZE - tileY,
  };
};
