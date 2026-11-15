export type LayerScope = 'global' | 'regional' | 'local'

export interface MapLayer {
  id: string
  name: string
  scope: LayerScope
  resolution_m: number
  tile_url: string
  format: 'image/jpeg' | 'image/png'
  min_zoom: number
  max_zoom: number
  extent: [number, number, number, number]
  attribution: string
  source_url: string
}

export interface MapCatalog {
  crs: string
  radius_m: number
  default_center: [number, number]
  default_zoom: number
  layers: MapLayer[]
}

export interface MarsLandmarkProperties {
  name: string
  category: string
  summary: string
  source: string
}

export interface MarsLandmarkFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: MarsLandmarkProperties
}

export interface MarsLandmarksGeoJson {
  type: 'FeatureCollection'
  features: MarsLandmarkFeature[]
}

export const MARS_CRS = 'IAU2000:104905'
export const MARS_RADIUS_M = 3_396_190.0
export const MARS_EQUATORIAL_METERS_PER_DEGREE = (Math.PI * MARS_RADIUS_M) / 180
export const MARS_WORLD_EXTENT: [number, number, number, number] = [-180, -90, 180, 90]
export const MARS_MAX_VIEW_ZOOM = 17

export const DEFAULT_MAP_CATALOG: MapCatalog = {
  crs: MARS_CRS,
  radius_m: MARS_RADIUS_M,
  default_center: [77.452019, 18.444796],
  default_zoom: 12,
  layers: [
    {
      id: 'mola-color-hillshade',
      name: 'MOLA Color Hillshade (463 m/px)',
      scope: 'global',
      resolution_m: 463.0,
      tile_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
      format: 'image/jpeg',
      min_zoom: 0,
      max_zoom: 7,
      extent: [-180.0, -89.9991635, 179.9983271, 90.0],
      attribution: 'NASA / JPL / MOLA Science Team (Mars Trek)',
      source_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    },
    {
      id: 'viking-mdim21',
      name: 'Viking MDIM 2.1 Color Mosaic (232 m/px)',
      scope: 'global',
      resolution_m: 232.0,
      tile_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
      format: 'image/jpeg',
      min_zoom: 0,
      max_zoom: 7,
      extent: [-180.0, -90.0, 180.0, 90.0],
      attribution: 'USGS Astrogeology / NASA Mars Trek',
      source_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
    },
    {
      id: 'jezero-ctx-ortho',
      name: 'Jezero CTX Orthomosaic (6 m/px)',
      scope: 'regional',
      resolution_m: 6.0,
      tile_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/default/default028mm/{z}/{y}/{x}.png',
      format: 'image/png',
      min_zoom: 0,
      max_zoom: 13,
      extent: [77.1604655, 18.2110274, 77.6991776, 18.7211945],
      attribution: 'USGS Astrogeology Science Center / NASA / JPL / MSSS',
      source_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
    },
    {
      id: 'jezero-hirise-ortho',
      name: 'Jezero HiRISE Orthomosaic (0.25 m/px)',
      scope: 'local',
      resolution_m: 0.25,
      tile_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{y}/{x}.png',
      format: 'image/png',
      min_zoom: 0,
      max_zoom: 17,
      extent: [77.2229331, 18.3067994, 77.583964, 18.669315],
      attribution: 'USGS Astrogeology Science Center / NASA / JPL / University of Arizona',
      source_url:
        'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    },
  ],
}

export const DEFAULT_LANDMARKS: MarsLandmarksGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'octavia-e-butler-landing',
      geometry: {
        type: 'Point',
        coordinates: [77.452019, 18.444796],
      },
      properties: {
        name: 'Octavia E. Butler Landing',
        category: 'landing-site',
        summary: 'Mars 2020 Perseverance touchdown site (traverse FID 0).',
        source: 'NASA Mars Trek (Perseverance_Traverse_Path)',
      },
    },
    {
      type: 'Feature',
      id: 'jezero-western-delta',
      geometry: {
        type: 'Point',
        coordinates: [77.40475, 18.4908],
      },
      properties: {
        name: 'Jezero Western Delta (Jezero_DL)',
        category: 'science-region',
        summary: 'Center of USGS Jezero_DL 1 m/px HiRISE DTM tile.',
        source: 'USGS Astrogeology (DOI: 10.5066/P9REJ9JN)',
      },
    },
    {
      type: 'Feature',
      id: 'crism-hydrous-detection',
      geometry: {
        type: 'Point',
        coordinates: [77.349998, 18.559999],
      },
      properties: {
        name: 'CRISM Hydrous Mineral Detection',
        category: 'mineralogy',
        summary: 'Orbital CRISM detection of hydrous minerals in Jezero.',
        source: 'NASA Mars Trek (Hydrous_Mineral_Detections_OMEGA_CRISM)',
      },
    },
    {
      type: 'Feature',
      id: 'jezero-crater-center',
      geometry: {
        type: 'Point',
        coordinates: [77.687349, 18.4082],
      },
      properties: {
        name: 'Jezero Crater Center',
        category: 'crater',
        summary: 'Approximate center of Jezero Crater (45.0 km diameter).',
        source: 'USGS Gazetteer of Planetary Nomenclature / Mars Trek',
      },
    },
  ],
}

/** Compute horizontal degrees-per-pixel factor adjusted for planetocentric latitude on Mars. */
export function getMarsPointResolution(resolution: number, coordinate: readonly number[]): number {
  const lat = coordinate[1] ?? 0
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180))
  return resolution * cosLat
}

/** Build equirectangular WMTS resolutions for a 2x1 root grid (`z=0` spans 180° vertically across 256 px). */
export function buildMarsResolutions(maxZoom: number): number[] {
  return Array.from({ length: maxZoom + 1 }, (_, z) => 180 / (256 * 2 ** z))
}

/** Format planetocentric longitude/latitude with explicit N/S and E/W hemispheres. */
export function formatMarsCoordinate(lon: number, lat: number): string {
  const normalizedLon = ((((lon + 180) % 360) + 360) % 360) - 180
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = normalizedLon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(normalizedLon).toFixed(4)}° ${lonDir}`
}
