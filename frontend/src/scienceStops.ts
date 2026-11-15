import React, { useState } from 'react'

export type SurfaceCondition =
  'natural' | 'abraded' | 'regolith_banked' | 'dust_covered' | 'shadowed' | 'drill_tailings'

export interface CoreSample {
  name: string
  publicSampleNo: number
  missionDesignation: string
  sol: number
  coringDatePds: string
  coordinates: {
    lat: number
    lon: number
  }
  surfaceCondition: SurfaceCondition
}

export interface AbrasionPatch {
  name: string
  sol: number
  depthMm?: number
  surfaceCondition: 'abraded'
  purpose: string
  superCamTarget?: string
}

export interface NaturalSurfaceTarget {
  name: string
  sol?: number
  surfaceCondition: 'natural'
  description?: string
}

export interface SourceLink {
  title: string
  citation?: string
  url: string
  type?: 'pds' | 'catalog' | 'photojournal' | 'paper' | 'spectra'
}

export interface CompetingInterpretation {
  title: string
  source: string
  summary: string
  evidence: string[]
}

export interface ProposedFieldTask {
  title: string
  fieldQuestion: string
  taskDescription: string
  condition: 'unresolved'
  justification: string
  protocolNotes?: string[]
}

export interface ScienceStopData {
  id: 'wildcat-ridge' | 'skinner-ridge' | string
  name: string
  stratigraphicUnit: string
  formation: string
  locationDescription: string
  geologicalSummary: string
  coordinates: [number, number] // [lon, lat]
  elevationM?: number
  nearestRmc?: string
  cores: CoreSample[]
  abrasionPatch: AbrasionPatch
  naturalTargets?: NaturalSurfaceTarget[]
  competingInterpretations?: {
    hypotheses: CompetingInterpretation[]
    ambiguityNote: string
    clarification: string
  }
  proposedFieldTask: ProposedFieldTask
  sources: SourceLink[]
}

export const WILDCAT_RIDGE_STOP: ScienceStopData = {
  id: 'wildcat-ridge',
  name: 'Wildcat Ridge',
  stratigraphicUnit: 'Hogwallow Flats member',
  formation: 'Shenandoah formation',
  locationDescription: "Front of Jezero crater's western delta",
  geologicalSummary:
    'Horizontally layered, fine-grained, sulfate-bearing mudstone to coarse siltstone likely in place; cut by light-toned calcium-sulfate veins (gypsum/bassanite/anhydrite).',
  coordinates: [77.40588851, 18.45863707],
  elevationM: -2526.4,
  nearestRmc: '26_1222',
  cores: [
    {
      name: 'Hazeltop',
      publicSampleNo: 12,
      missionDesignation: 'M2020-509-14',
      sol: 509,
      coringDatePds: '2022-07-25',
      coordinates: { lat: 18.45863707, lon: 77.40588851 },
      surfaceCondition: 'abraded',
    },
    {
      name: 'Bearwallow',
      publicSampleNo: 13,
      missionDesignation: 'M2020-516-15',
      sol: 516,
      coringDatePds: '2022-08-02',
      coordinates: { lat: 18.45863832, lon: 77.40588685 },
      surfaceCondition: 'abraded',
    },
  ],
  abrasionPatch: {
    name: 'Berry Hollow',
    sol: 515,
    surfaceCondition: 'abraded',
    purpose:
      'Shared abrasion patch on Hazeltop block ground down to expose unweathered rock and pristine vein cross-sections for contact science.',
    superCamTarget: 'Berry Hollow calibrated VISIR spectra (sol 515)',
  },
  naturalTargets: [
    {
      name: 'Natural scarp & weathered face',
      sol: 518,
      surfaceCondition: 'natural',
      description:
        'Weathered natural outcrop face displaying horizontal bedding laminae and intersecting calcium-sulfate vein networks.',
    },
  ],
  proposedFieldTask: {
    title: 'Calcium-Sulfate Vein Continuity & Cross-Cutting Task',
    fieldQuestion:
      'Do the calcium-sulfate veins cut across sedimentary bedding, demonstrating post-depositional fracture precipitation, or are they concordant with bedding?',
    taskDescription:
      'Photograph an exposed vein and adjacent laminated host rock with a 2 cm scale bar. Determine whether vein cuts across layers (cross-cutting post-depositional) or parallels bedding (concordant). Record orientation (strike/dip) and vein thickness.',
    condition: 'unresolved',
    justification:
      'Pending close field inspection; contact between vein and bedding is obscured by windblown reddish dust and drill tailings from coring on natural scarp faces. Outcome remains strictly unresolved until verified on-site.',
    protocolNotes: [
      'Scale photography with 2 cm scale bar or gnomon',
      'Surface condition documentation: abraded (Berry Hollow) vs natural/dust on weathered scarp',
      'Vein thickness (1–3 mm micro-veins) and orientation measurements',
      '5-item mandatory specification required if contact is obscured (defer rather than guess)',
    ],
  },
  sources: [
    {
      title:
        'Mars 2020 Initial Reports, Volume 2 Release 2, Section 14 (Hazeltop) & Section 15 (Bearwallow)',
      citation: 'PDS Geosciences Node, Mars 2020 Initial Reports Release 2, sections 14 & 15',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf',
      type: 'pds',
    },
    {
      title: 'NASA Mars Rock Samples Catalog (Hazeltop #12, Bearwallow #13)',
      citation: 'NASA/JPL-Caltech Perseverance Public Sample Catalog',
      url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/',
      type: 'catalog',
    },
    {
      title: 'SuperCam VIS IRSpec Calibrated Spectra — Berry Hollow (Sol 515)',
      citation:
        'PDS Geosciences Node, scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p01.xml',
      url: 'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00515/scam_0515_0712658963_589_cp2_scam01515_berry_hollow_515_sca_01p01.xml',
      type: 'spectra',
    },
    {
      title: 'NASA Photojournal PIA24928: Sample Collection and Rock Analysis at Wildcat Ridge',
      citation: 'NASA/JPL-Caltech annotated Mastcam-Z outcrop mosaic, Sol 518',
      url: 'https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/',
      type: 'photojournal',
    },
    {
      title: 'NASA Photojournal PIA24929: Perseverance Rock Cores from Wildcat Ridge',
      citation: 'NASA/JPL-Caltech, rock cores inside drill bit carousel',
      url: 'https://www.jpl.nasa.gov/images/pia24929-perseverance-rock-cores-from-wildcat-ridge/',
      type: 'photojournal',
    },
  ],
}

export const SKINNER_RIDGE_STOP: ScienceStopData = {
  id: 'skinner-ridge',
  name: 'Skinner Ridge',
  stratigraphicUnit: 'Lower Rockytop member',
  formation: 'Shenandoah formation',
  locationDescription: 'Front of Jezero western delta, base of Rockytop scarp',
  geologicalSummary:
    'Isolated ~1 m sandstone block with thin planar laminations (~1 cm or thinner). Disputed origin: in-place Lower Rockytop bedrock vs displaced Upper Rockytop float block.',
  coordinates: [77.40617078, 18.458931],
  elevationM: -2523.1,
  nearestRmc: '26_1004',
  cores: [
    {
      name: 'Swift Run',
      publicSampleNo: 10,
      missionDesignation: 'M2020-490-11',
      sol: 490,
      coringDatePds: '2022-07-06',
      coordinates: { lat: 18.458931, lon: 77.40617078 },
      surfaceCondition: 'abraded',
    },
    {
      name: 'Skyland',
      publicSampleNo: 11,
      missionDesignation: 'M2020-495-12',
      sol: 495,
      coringDatePds: '2022-07-11',
      coordinates: { lat: 18.458931, lon: 77.40617078 },
      surfaceCondition: 'abraded',
    },
  ],
  abrasionPatch: {
    name: 'Thornton Gap',
    sol: 493,
    depthMm: 7,
    surfaceCondition: 'abraded',
    purpose:
      'Ground 7 mm into block to expose unweathered sandstone for SuperCam and PIXL contact science.',
    superCamTarget: 'Thornton Gap calibrated spectra (sol 493)',
  },
  naturalTargets: [
    {
      name: 'Shop Hollow',
      sol: 493,
      surfaceCondition: 'natural',
      description: 'SuperCam natural rock target on unweathered lamina',
    },
    {
      name: 'Sawlog Ridge',
      sol: 493,
      surfaceCondition: 'natural',
      description: 'SuperCam natural rock target on adjacent bench',
    },
    {
      name: 'Oventop Mountain',
      sol: 493,
      surfaceCondition: 'natural',
      description: 'SuperCam natural surface target for spectral calibration',
    },
  ],
  competingInterpretations: {
    hypotheses: [
      {
        title: '1. In-Place Bedrock (Lower Rockytop Member)',
        source: 'PDS Initial Reports, Vol 2 Rel 2, Section 11',
        summary:
          'Thin laminated planar bedding (~1 cm thick or thinner) appears parallel to prevailing Rockytop scarp bedding strike & dip (~082°, dip ~3.5°). Full mechanical stability without shifting or tilting during rotary-percussive coring.',
        evidence: [
          'Laminated bedding parallels regional Rockytop scarp bedding attitude',
          'Complete mechanical stability under abrasion wheel and drill forces',
          'Interpreted in initial mission report as anchored Lower Rockytop bedrock',
        ],
      },
      {
        title: '2. Upper Rockytop Float Block (Displaced)',
        source: 'Williams et al. (2026), Icarus 457, 117161; Fig. S3',
        summary:
          "Alternating protruding and recessive weathering layers at ~2 cm scale closely match Upper Rockytop bedrock and nearby float blocks (Betty's Rock), contrasting with recessive light-toned Lower Rockytop (Fig. 3C). SuperCam and PIXL geochemistry matches Betty's Rock.",
        evidence: [
          "Protruding and recessive weathering layers match Upper Rockytop / Betty's Rock facies (Fig. S3)",
          'Distinct from light-toned, thin-bedded, slope-forming Lower Rockytop facies (Fig. 3C)',
          "SuperCam and PIXL elemental and spectral affinity to Betty's Rock float",
        ],
      },
    ],
    ambiguityNote:
      'Parallel bedding fits both hypotheses! A coherent translational slide or slump can preserve regional strike and dip without back-tilting. Parallel bedding provides zero diagnostic power to decide between bedrock and float.',
    clarification:
      'Direct physical contact observation at the block margin is the sole deciding test. Banked regolith and eastern fractures are common natural features and strictly insufficient to call the block detached.',
  },
  proposedFieldTask: {
    title: 'Contact Observation Protocol & Bedding Continuity Inspection',
    fieldQuestion:
      'Is the Skinner Ridge block part of the lower Rockytop bedrock it sits in, or a float block that came down from upper Rockytop?',
    taskDescription:
      'Trace individual laminated beds to the block edge and determine physical contact outcome: continuous (in-place bedrock), separated (float block), or unresolved (covered by regolith/shadow). Perform two-sided bedding protocol.',
    condition: 'unresolved',
    justification:
      'Basal contact is blanketed by 10–15 cm of loose sandy regolith banked against western and northern flanks; eastern fracture is obscured by shadow. Outcome remains unresolved (defer rather than guess). Banked regolith or eastern fracture is insufficient to call it detached.',
    protocolNotes: [
      'Deciding observation: trace bedding across margin into adjacent Lower Rockytop outcrop',
      'Two-sided bedding protocol: strike/dip, thickness, grain size, younging direction (not_determinable)',
      'Strict rule: Banked regolith and eastern fracture are insufficient to classify as detached',
      'Mandatory 5-item specification for unresolved outcome; block excluded from stratigraphic section extension',
    ],
  },
  sources: [
    {
      title: 'Mars 2020 Initial Reports, Volume 2 Release 2, Section 11 (Swift Run)',
      citation: 'PDS Geosciences Node, Section 11',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf',
      type: 'pds',
    },
    {
      title: 'NASA Mars Rock Samples Catalog (Swift Run #10, Skyland #11)',
      citation: 'NASA/JPL-Caltech Perseverance Public Sample Catalog',
      url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/',
      type: 'catalog',
    },
    {
      title: 'Williams et al. (2026), Icarus 457, 117161: Classification of Rockytop float rocks',
      citation: 'Icarus 457, 117161, doi:10.1016/j.icarus.2026.117161',
      url: 'https://doi.org/10.1016/j.icarus.2026.117161',
      type: 'paper',
    },
    {
      title: 'Williams et al. (2026) Supplementary Information, Figure S3',
      citation: 'Caltech Authors Repository, 1-s2.0-S0019103526002277-mmc1.pdf',
      url: 'https://authors.library.caltech.edu/records/3jm2k-zn247/files/1-s2.0-S0019103526002277-mmc1.pdf?download=1',
      type: 'paper',
    },
    {
      title: 'SuperCam VIS IRSpec Calibrated Spectra — Thornton Gap, Sol 493',
      citation:
        'PDS Geosciences Node, scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml',
      url: 'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml',
      type: 'spectra',
    },
    {
      title: 'NASA Photojournal PIA24924: 2 Perseverance Sampling Locations in Jezero’s Delta',
      citation: 'NASA/JPL-Caltech/ASU/MSSS regional context',
      url: 'https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/',
      type: 'photojournal',
    },
    {
      title: 'NASA Photojournal PIA24925: Perseverance’s View of Thornton Gap Abrasion Patch',
      citation: 'NASA/JPL-Caltech Thornton Gap view',
      url: 'https://photojournal.jpl.nasa.gov/catalog/PIA24925',
      type: 'photojournal',
    },
  ],
}

export const SCIENCE_STOPS: Record<string, ScienceStopData> = {
  'wildcat-ridge': WILDCAT_RIDGE_STOP,
  'skinner-ridge': SKINNER_RIDGE_STOP,
}

export interface ScienceStopCardProps {
  /** Stop identifier or custom stop data object. Defaults to rendering both cards or selectable tabs. */
  stop?: ScienceStopData | 'wildcat-ridge' | 'skinner-ridge'
  stopId?: 'wildcat-ridge' | 'skinner-ridge' | string
  className?: string
  defaultTab?: 'all' | 'skinner-ridge' | 'wildcat-ridge'
}

/**
 * Reusable Science Stop Card component strictly compliant with the CrimsonHorizon
 * 3-color palette design system (--ch-black, --ch-white, --ch-accent).
 */
export function ScienceStopCard({
  stop,
  stopId,
  className = '',
  defaultTab = 'all',
}: ScienceStopCardProps) {
  const resolvedStop: ScienceStopData | null =
    typeof stop === 'object' && stop !== null
      ? stop
      : typeof stop === 'string'
        ? (SCIENCE_STOPS[stop] ?? null)
        : stopId
          ? (SCIENCE_STOPS[stopId] ?? null)
          : null

  const [activeTab, setActiveTab] = useState<'all' | 'skinner-ridge' | 'wildcat-ridge'>(defaultTab)

  if (resolvedStop) {
    return React.createElement(SingleStopCardView, { stop: resolvedStop, className })
  }

  // Multi-stop container with tabs
  return React.createElement(
    'section',
    {
      'aria-label': 'Science Stop Cards',
      className: `rounded-xl border border-[#333333] bg-[#212121] p-4 text-[#EBEBEB] ${className}`,
      style: {
        backgroundColor: 'var(--ch-black, #212121)',
        color: 'var(--ch-white, #EBEBEB)',
        borderColor: 'var(--color-card-border, #333333)',
      },
    },
    // Header & Tabs
    React.createElement(
      'div',
      {
        className:
          'flex flex-wrap items-center justify-between gap-2 border-b border-[#333333] pb-3',
      },
      React.createElement(
        'div',
        null,
        React.createElement(
          'span',
          {
            className:
              'inline-flex items-center rounded-md border border-[#8F5A53]/40 bg-[#8F5A53]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#EBEBEB]',
          },
          'HAWKSBILL GAP · SCIENCE STOPS',
        ),
        React.createElement(
          'h2',
          { className: 'mt-1 text-base font-bold tracking-tight text-[#EBEBEB]' },
          'Perseverance Delta Front Science Cards',
        ),
      ),
      // Tabs
      React.createElement(
        'div',
        {
          role: 'tablist',
          'aria-label': 'Select science stop view',
          className: 'flex items-center gap-1 rounded-lg border border-[#333333] bg-[#1A1A1A] p-1',
        },
        React.createElement(
          'button',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': activeTab === 'all',
            onClick: () => setActiveTab('all'),
            className: `rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-[#8F5A53] ${
              activeTab === 'all'
                ? 'bg-[#8F5A53] text-[#EBEBEB]'
                : 'text-[#A3A3A3] hover:text-[#EBEBEB]'
            }`,
          },
          'All Stops',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': activeTab === 'skinner-ridge',
            onClick: () => setActiveTab('skinner-ridge'),
            className: `rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-[#8F5A53] ${
              activeTab === 'skinner-ridge'
                ? 'bg-[#8F5A53] text-[#EBEBEB]'
                : 'text-[#A3A3A3] hover:text-[#EBEBEB]'
            }`,
          },
          'Skinner Ridge',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': activeTab === 'wildcat-ridge',
            onClick: () => setActiveTab('wildcat-ridge'),
            className: `rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-[#8F5A53] ${
              activeTab === 'wildcat-ridge'
                ? 'bg-[#8F5A53] text-[#EBEBEB]'
                : 'text-[#A3A3A3] hover:text-[#EBEBEB]'
            }`,
          },
          'Wildcat Ridge',
        ),
      ),
    ),
    // Stop cards list
    React.createElement(
      'div',
      { className: 'mt-4 space-y-6' },
      (activeTab === 'all' || activeTab === 'skinner-ridge') &&
        React.createElement(SingleStopCardView, { stop: SKINNER_RIDGE_STOP }),
      (activeTab === 'all' || activeTab === 'wildcat-ridge') &&
        React.createElement(SingleStopCardView, { stop: WILDCAT_RIDGE_STOP }),
    ),
  )
}

/**
 * Individual Science Stop Card view for a single stop
 */
export function SingleStopCardView({
  stop,
  className = '',
}: {
  stop: ScienceStopData
  className?: string
}) {
  return React.createElement(
    'article',
    {
      'data-testid': `science-stop-card-${stop.id}`,
      'aria-labelledby': `stop-heading-${stop.id}`,
      className: `rounded-xl border border-[#333333] bg-[#212121] p-4 text-[#EBEBEB] transition ${className}`,
      style: {
        backgroundColor: 'var(--ch-black, #212121)',
        color: 'var(--ch-white, #EBEBEB)',
        borderColor: 'var(--color-card-border, #333333)',
      },
    },
    // Header
    React.createElement(
      'header',
      { className: 'border-b border-[#333333] pb-3' },
      React.createElement(
        'div',
        { className: 'flex flex-wrap items-center justify-between gap-2' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement('span', {
            className: 'h-3 w-3 rotate-45 border border-[#EBEBEB]',
            style: { backgroundColor: 'var(--ch-accent, #8F5A53)' },
            'aria-hidden': 'true',
          }),
          React.createElement(
            'h3',
            {
              id: `stop-heading-${stop.id}`,
              className: 'text-base font-bold text-[#EBEBEB]',
            },
            stop.name,
          ),
          React.createElement(
            'span',
            {
              className:
                'rounded-md border border-[#8F5A53]/40 bg-[#8F5A53]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#EBEBEB]',
            },
            stop.stratigraphicUnit,
          ),
        ),
        React.createElement(
          'div',
          { className: 'font-mono text-xs text-[#A3A3A3]' },
          `${stop.coordinates[1].toFixed(6)}° N, ${stop.coordinates[0].toFixed(6)}° E${
            stop.elevationM !== undefined ? ` · ${stop.elevationM.toFixed(1)} m` : ''
          }`,
        ),
      ),
      React.createElement(
        'p',
        { className: 'mt-2 text-xs leading-relaxed text-[#A3A3A3]' },
        stop.geologicalSummary,
      ),
    ),
    // Core samples section
    React.createElement(
      'section',
      {
        className: 'mt-3.5',
        'aria-labelledby': `cores-heading-${stop.id}`,
      },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'h4',
          {
            id: `cores-heading-${stop.id}`,
            className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]',
          },
          'Core Samples & Observations',
        ),
        React.createElement(
          'span',
          { className: 'text-[11px] text-[#737373]' },
          `${stop.cores.length} cores drilled`,
        ),
      ),
      React.createElement(
        'div',
        { className: 'mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2' },
        stop.cores.map((core) =>
          React.createElement(
            'div',
            {
              key: core.missionDesignation,
              className: 'rounded-lg border border-[#333333] bg-[#1A1A1A] p-2.5',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement('span', { className: 'font-bold text-[#EBEBEB]' }, core.name),
              React.createElement(
                'span',
                {
                  className:
                    'rounded bg-[#8F5A53]/25 px-1.5 py-0.5 text-[11px] font-semibold text-[#EBEBEB]',
                },
                `Sol ${core.sol}`,
              ),
            ),
            React.createElement(
              'div',
              { className: 'mt-1 space-y-0.5 font-mono text-[11px] text-[#A3A3A3]' },
              React.createElement(
                'div',
                null,
                React.createElement('span', { className: 'text-[#737373]' }, 'Core ID: '),
                `${core.missionDesignation} (No. ${core.publicSampleNo})`,
              ),
              React.createElement(
                'div',
                null,
                React.createElement('span', { className: 'text-[#737373]' }, 'PDS Coring Date: '),
                core.coringDatePds,
              ),
              React.createElement(
                'div',
                { className: 'flex items-center gap-1.5' },
                React.createElement('span', { className: 'text-[#737373]' }, 'Surface Condition: '),
                React.createElement(
                  'span',
                  {
                    className:
                      'rounded border border-[#333333] bg-[#282828] px-1 text-[10px] uppercase text-[#EBEBEB]',
                  },
                  core.surfaceCondition,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    // Surface conditions section (Abrasion patch & natural targets)
    React.createElement(
      'section',
      {
        className: 'mt-3.5',
        'aria-labelledby': `surface-heading-${stop.id}`,
      },
      React.createElement(
        'h4',
        {
          id: `surface-heading-${stop.id}`,
          className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]',
        },
        'Surface Conditions & Targets',
      ),
      React.createElement(
        'div',
        { className: 'mt-2 space-y-2' },
        // Abrasion patch
        React.createElement(
          'div',
          { className: 'rounded-lg border border-[#333333] bg-[#1A1A1A] p-2.5' },
          React.createElement(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-1' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(
                'span',
                { className: 'font-semibold text-[#EBEBEB]' },
                stop.abrasionPatch.name,
              ),
              React.createElement(
                'span',
                {
                  className:
                    'rounded border border-[#8F5A53]/40 bg-[#8F5A53]/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#EBEBEB]',
                },
                `Surface: ${stop.abrasionPatch.surfaceCondition}`,
              ),
            ),
            React.createElement(
              'span',
              { className: 'font-mono text-xs text-[#8F5A53]' },
              `Observation Sol ${stop.abrasionPatch.sol}${
                stop.abrasionPatch.depthMm !== undefined
                  ? ` · ${stop.abrasionPatch.depthMm} mm depth`
                  : ''
              }`,
            ),
          ),
          React.createElement(
            'p',
            { className: 'mt-1 text-xs text-[#A3A3A3]' },
            stop.abrasionPatch.purpose,
          ),
          stop.abrasionPatch.superCamTarget &&
            React.createElement(
              'p',
              { className: 'mt-1 text-[11px] text-[#737373]' },
              `Spectroscopy: ${stop.abrasionPatch.superCamTarget}`,
            ),
        ),
        // Natural context targets
        stop.naturalTargets &&
          stop.naturalTargets.length > 0 &&
          React.createElement(
            'div',
            { className: 'rounded-lg border border-[#333333] bg-[#1A1A1A] p-2.5' },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'span',
                { className: 'text-xs font-medium text-[#EBEBEB]' },
                'Natural Surface Context Targets',
              ),
              React.createElement(
                'span',
                {
                  className:
                    'rounded border border-[#333333] bg-[#282828] px-1.5 text-[10px] uppercase text-[#A3A3A3]',
                },
                'Surface: natural',
              ),
            ),
            React.createElement(
              'ul',
              { className: 'mt-1.5 space-y-1 text-xs text-[#A3A3A3]' },
              stop.naturalTargets.map((target) =>
                React.createElement(
                  'li',
                  {
                    key: target.name,
                    className: 'flex flex-wrap items-baseline gap-1',
                  },
                  React.createElement(
                    'span',
                    { className: 'font-medium text-[#EBEBEB]' },
                    `• ${target.name}`,
                  ),
                  target.sol &&
                    React.createElement(
                      'span',
                      { className: 'font-mono text-[11px] text-[#737373]' },
                      `(sol ${target.sol})`,
                    ),
                  target.description &&
                    React.createElement('span', null, `— ${target.description}`),
                ),
              ),
            ),
          ),
      ),
    ),
    // Competing interpretations (Skinner Ridge)
    stop.competingInterpretations &&
      React.createElement(
        'section',
        {
          className: 'mt-3.5 rounded-lg border border-[#333333] bg-[#1A1A1A] p-3',
          'aria-labelledby': `interpretations-heading-${stop.id}`,
        },
        React.createElement(
          'h4',
          {
            id: `interpretations-heading-${stop.id}`,
            className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]',
          },
          'Competing Geological Interpretations',
        ),
        React.createElement(
          'div',
          { className: 'mt-2 grid grid-cols-1 gap-2.5 md:grid-cols-2' },
          stop.competingInterpretations.hypotheses.map((hypo) =>
            React.createElement(
              'div',
              {
                key: hypo.title,
                className: 'rounded-lg border border-[#333333] bg-[#212121] p-2.5',
              },
              React.createElement(
                'div',
                { className: 'text-xs font-bold text-[#EBEBEB]' },
                hypo.title,
              ),
              React.createElement(
                'div',
                { className: 'text-[11px] font-mono text-[#8F5A53]' },
                hypo.source,
              ),
              React.createElement(
                'p',
                { className: 'mt-1 text-xs leading-relaxed text-[#A3A3A3]' },
                hypo.summary,
              ),
              React.createElement(
                'ul',
                { className: 'mt-1.5 space-y-0.5 text-[11px] text-[#737373]' },
                hypo.evidence.map((ev, i) => React.createElement('li', { key: i }, `✓ ${ev}`)),
              ),
            ),
          ),
        ),
        React.createElement(
          'div',
          {
            className:
              'mt-2.5 rounded-md border border-[#8F5A53]/40 bg-[#8F5A53]/15 p-2 text-xs leading-relaxed',
          },
          React.createElement(
            'p',
            { className: 'font-semibold text-[#EBEBEB]' },
            'Critical Clarification: Parallel Bedding Ambiguity',
          ),
          React.createElement(
            'p',
            { className: 'mt-0.5 text-[#EBEBEB]' },
            stop.competingInterpretations.ambiguityNote,
          ),
          React.createElement(
            'p',
            { className: 'mt-1 text-[11px] text-[#A3A3A3]' },
            stop.competingInterpretations.clarification,
          ),
        ),
      ),
    // Proposed field task with 'unresolved' condition
    React.createElement(
      'section',
      {
        className: 'mt-3.5 rounded-lg border border-[#333333] bg-[#1A1A1A] p-3',
        'aria-labelledby': `task-heading-${stop.id}`,
      },
      React.createElement(
        'div',
        { className: 'flex flex-wrap items-center justify-between gap-1.5' },
        React.createElement(
          'h4',
          {
            id: `task-heading-${stop.id}`,
            className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]',
          },
          'Proposed Field Task',
        ),
        React.createElement(
          'span',
          {
            'data-testid': `task-condition-${stop.id}`,
            className:
              'inline-flex items-center gap-1 rounded-full border border-[#8F5A53] bg-[#8F5A53]/25 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#EBEBEB]',
          },
          React.createElement('span', {
            className: 'h-1.5 w-1.5 rounded-full bg-[#8F5A53]',
            'aria-hidden': 'true',
          }),
          `Condition: ${stop.proposedFieldTask.condition}`,
        ),
      ),
      React.createElement(
        'div',
        { className: 'mt-2' },
        React.createElement(
          'div',
          { className: 'text-xs font-bold text-[#EBEBEB]' },
          stop.proposedFieldTask.title,
        ),
        React.createElement(
          'div',
          {
            className:
              'mt-1 rounded-md border border-[#333333] bg-[#212121] p-2 text-xs text-[#EBEBEB]',
          },
          React.createElement(
            'span',
            { className: 'font-semibold text-[#8F5A53]' },
            'Field Question: ',
          ),
          stop.proposedFieldTask.fieldQuestion,
        ),
        React.createElement(
          'p',
          { className: 'mt-2 text-xs leading-relaxed text-[#A3A3A3]' },
          stop.proposedFieldTask.taskDescription,
        ),
        React.createElement(
          'div',
          { className: 'mt-2 text-xs text-[#737373]' },
          React.createElement(
            'span',
            { className: 'font-medium text-[#A3A3A3]' },
            'Unresolved Protocol Justification: ',
          ),
          stop.proposedFieldTask.justification,
        ),
        stop.proposedFieldTask.protocolNotes &&
          React.createElement(
            'ul',
            { className: 'mt-2 space-y-0.5 text-[11px] text-[#737373]' },
            stop.proposedFieldTask.protocolNotes.map((note, i) =>
              React.createElement('li', { key: i }, `• ${note}`),
            ),
          ),
      ),
    ),
    // Sources & Citations section
    React.createElement(
      'section',
      {
        className: 'mt-3.5',
        'aria-labelledby': `sources-heading-${stop.id}`,
      },
      React.createElement(
        'h4',
        {
          id: `sources-heading-${stop.id}`,
          className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]',
        },
        'PDS Archive & Reference Sources',
      ),
      React.createElement(
        'ul',
        { className: 'mt-1.5 space-y-1 text-xs' },
        stop.sources.map((source) =>
          React.createElement(
            'li',
            { key: source.url, className: 'flex items-start gap-1.5' },
            React.createElement(
              'span',
              { className: 'text-[#8F5A53]', 'aria-hidden': 'true' },
              '↗',
            ),
            React.createElement(
              'a',
              {
                href: source.url,
                target: '_blank',
                rel: 'noreferrer',
                className:
                  'text-[#EBEBEB] underline decoration-[#8F5A53] underline-offset-2 transition hover:text-white hover:decoration-[#EBEBEB] focus-visible:outline-2 focus-visible:outline-[#8F5A53]',
              },
              source.title,
            ),
            source.citation &&
              React.createElement(
                'span',
                { className: 'hidden text-[11px] text-[#737373] sm:inline' },
                ` (${source.citation})`,
              ),
          ),
        ),
      ),
    ),
  )
}
