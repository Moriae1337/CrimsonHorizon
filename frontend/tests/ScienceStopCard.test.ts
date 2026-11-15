import assert from 'node:assert/strict'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  SCIENCE_STOPS,
  SKINNER_RIDGE_STOP,
  ScienceStopCard,
  WILDCAT_RIDGE_STOP,
  type ScienceStopData,
} from '../src/scienceStops.ts'

test('defines complete stop data for Wildcat Ridge and Skinner Ridge', () => {
  assert.equal(SCIENCE_STOPS['wildcat-ridge'], WILDCAT_RIDGE_STOP)
  assert.equal(SCIENCE_STOPS['skinner-ridge'], SKINNER_RIDGE_STOP)

  // Wildcat Ridge stop metadata
  assert.equal(WILDCAT_RIDGE_STOP.id, 'wildcat-ridge')
  assert.equal(WILDCAT_RIDGE_STOP.stratigraphicUnit, 'Hogwallow Flats member')
  assert.equal(WILDCAT_RIDGE_STOP.cores.length, 2)
  assert.equal(WILDCAT_RIDGE_STOP.cores[0].name, 'Hazeltop')
  assert.equal(WILDCAT_RIDGE_STOP.cores[0].sol, 509)
  assert.equal(WILDCAT_RIDGE_STOP.cores[0].missionDesignation, 'M2020-509-14')
  assert.equal(WILDCAT_RIDGE_STOP.cores[0].publicSampleNo, 12)
  assert.equal(WILDCAT_RIDGE_STOP.cores[1].name, 'Bearwallow')
  assert.equal(WILDCAT_RIDGE_STOP.cores[1].sol, 516)
  assert.equal(WILDCAT_RIDGE_STOP.cores[1].missionDesignation, 'M2020-516-15')
  assert.equal(WILDCAT_RIDGE_STOP.cores[1].publicSampleNo, 13)
  assert.equal(WILDCAT_RIDGE_STOP.abrasionPatch.name, 'Berry Hollow')
  assert.equal(WILDCAT_RIDGE_STOP.abrasionPatch.sol, 515)
  assert.equal(WILDCAT_RIDGE_STOP.abrasionPatch.surfaceCondition, 'abraded')
  assert.equal(WILDCAT_RIDGE_STOP.proposedFieldTask.condition, 'unresolved')

  // Skinner Ridge stop metadata
  assert.equal(SKINNER_RIDGE_STOP.id, 'skinner-ridge')
  assert.equal(SKINNER_RIDGE_STOP.stratigraphicUnit, 'Lower Rockytop member')
  assert.equal(SKINNER_RIDGE_STOP.cores.length, 2)
  assert.equal(SKINNER_RIDGE_STOP.cores[0].name, 'Swift Run')
  assert.equal(SKINNER_RIDGE_STOP.cores[0].sol, 490)
  assert.equal(SKINNER_RIDGE_STOP.cores[0].missionDesignation, 'M2020-490-11')
  assert.equal(SKINNER_RIDGE_STOP.cores[0].publicSampleNo, 10)
  assert.equal(SKINNER_RIDGE_STOP.cores[1].name, 'Skyland')
  assert.equal(SKINNER_RIDGE_STOP.cores[1].sol, 495)
  assert.equal(SKINNER_RIDGE_STOP.cores[1].missionDesignation, 'M2020-495-12')
  assert.equal(SKINNER_RIDGE_STOP.cores[1].publicSampleNo, 11)
  assert.equal(SKINNER_RIDGE_STOP.abrasionPatch.name, 'Thornton Gap')
  assert.equal(SKINNER_RIDGE_STOP.abrasionPatch.sol, 493)
  assert.equal(SKINNER_RIDGE_STOP.abrasionPatch.depthMm, 7)
  assert.equal(SKINNER_RIDGE_STOP.abrasionPatch.surfaceCondition, 'abraded')
  assert.equal(SKINNER_RIDGE_STOP.proposedFieldTask.condition, 'unresolved')
})

test('renders both science stop cards when no stop prop is specified', () => {
  const html = renderToStaticMarkup(React.createElement(ScienceStopCard, {}))
  assert.ok(html.includes('Skinner Ridge'))
  assert.ok(html.includes('Wildcat Ridge'))
  assert.ok(html.includes('HAWKSBILL GAP · SCIENCE STOPS'))
  assert.ok(html.includes('data-testid="science-stop-card-skinner-ridge"'))
  assert.ok(html.includes('data-testid="science-stop-card-wildcat-ridge"'))
})

test('renders Wildcat Ridge card with cores, sols, surface condition, and vein task', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScienceStopCard, { stopId: 'wildcat-ridge' }),
  )

  // Card header and stratigraphic unit
  assert.ok(html.includes('Wildcat Ridge'))
  assert.ok(html.includes('Hogwallow Flats member'))
  assert.ok(html.includes('sulfate-bearing'))

  // Core samples with mission designations and public numbers
  assert.ok(html.includes('Hazeltop'))
  assert.ok(html.includes('M2020-509-14'))
  assert.ok(html.includes('Sol 509'))
  assert.ok(html.includes('Bearwallow'))
  assert.ok(html.includes('M2020-516-15'))
  assert.ok(html.includes('Sol 516'))

  // Abrasion patch and observation sol
  assert.ok(html.includes('Berry Hollow'))
  assert.ok(html.includes('Observation Sol 515'))
  assert.ok(html.includes('Surface: abraded'))

  // Natural surface context
  assert.ok(html.includes('Surface: natural'))
  assert.ok(html.includes('Weathered natural outcrop face'))

  // Proposed field task with 'unresolved' condition
  assert.ok(html.includes('Calcium-Sulfate Vein Continuity &amp; Cross-Cutting Task'))
  assert.ok(html.includes('Condition: unresolved'))
  assert.ok(html.includes('Do the calcium-sulfate veins cut across sedimentary bedding'))

  // PDS source links
  assert.ok(
    html.includes(
      'https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf',
    ),
  )
  assert.ok(
    html.includes('https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/'),
  )
  assert.ok(html.includes('PIA24928'))
})

test('renders Skinner Ridge card with cores, sols, competing interpretations, and contact task', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScienceStopCard, { stopId: 'skinner-ridge' }),
  )

  // Card header and member
  assert.ok(html.includes('Skinner Ridge'))
  assert.ok(html.includes('Lower Rockytop member'))

  // Core samples
  assert.ok(html.includes('Swift Run'))
  assert.ok(html.includes('M2020-490-11'))
  assert.ok(html.includes('Sol 490'))
  assert.ok(html.includes('Skyland'))
  assert.ok(html.includes('M2020-495-12'))
  assert.ok(html.includes('Sol 495'))

  // Abrasion patch with sol and depth
  assert.ok(html.includes('Thornton Gap'))
  assert.ok(html.includes('Observation Sol 493'))
  assert.ok(html.includes('7 mm depth'))
  assert.ok(html.includes('Surface: abraded'))

  // Natural surface targets
  assert.ok(html.includes('Shop Hollow'))
  assert.ok(html.includes('Sawlog Ridge'))
  assert.ok(html.includes('Oventop Mountain'))
  assert.ok(html.includes('Surface: natural'))

  // Competing interpretations: In-place Lower Rockytop vs Upper Rockytop float block
  assert.ok(html.includes('Competing Geological Interpretations'))
  assert.ok(html.includes('In-Place Bedrock (Lower Rockytop Member)'))
  assert.ok(html.includes('Upper Rockytop Float Block (Displaced)'))
  assert.ok(html.includes('Williams et al. (2026)'))

  // Critical clarification on parallel bedding ambiguity
  assert.ok(html.includes('Parallel Bedding Ambiguity'))
  assert.ok(html.includes('Parallel bedding fits both hypotheses!'))
  assert.ok(html.includes('translational slide'))

  // Proposed field task with 'unresolved' condition
  assert.ok(html.includes('Contact Observation Protocol &amp; Bedding Continuity Inspection'))
  assert.ok(html.includes('Condition: unresolved'))
  assert.ok(
    html.includes(
      'Is the Skinner Ridge block part of the lower Rockytop bedrock it sits in, or a float block',
    ),
  )
  assert.ok(
    html.includes('Banked regolith or eastern fracture is insufficient to call it detached'),
  )

  // PDS source links and citations
  assert.ok(html.includes('https://doi.org/10.1016/j.icarus.2026.117161'))
  assert.ok(html.includes('PIA24925'))
  assert.ok(
    html.includes(
      'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_supercam/data_calibrated_spectra/sol_00493/scam_0493_0710705884_778_cp2_scam01493_thornton_gap_493_sca_01p01.xml',
    ),
  )
})

test('accepts a custom ScienceStopData object via stop prop', () => {
  const customStop: ScienceStopData = {
    id: 'custom-stop',
    name: 'Custom Test Outcrop',
    stratigraphicUnit: 'Delta Top member',
    formation: 'Shenandoah formation',
    locationDescription: 'Western Jezero',
    geologicalSummary: 'Custom test summary description.',
    coordinates: [77.4055, 18.4585],
    cores: [
      {
        name: 'TestCore',
        publicSampleNo: 99,
        missionDesignation: 'M2020-999-99',
        sol: 999,
        coringDatePds: '2024-01-01',
        coordinates: { lat: 18.4585, lon: 77.4055 },
        surfaceCondition: 'abraded',
      },
    ],
    abrasionPatch: {
      name: 'TestPatch',
      sol: 998,
      surfaceCondition: 'abraded',
      purpose: 'Abrasion test',
    },
    proposedFieldTask: {
      title: 'Custom Field Task',
      fieldQuestion: 'Is this custom test passing?',
      taskDescription: 'Execute custom inspection.',
      condition: 'unresolved',
      justification: 'Waiting on lab data.',
    },
    sources: [
      {
        title: 'Custom PDS Link',
        url: 'https://pds-geosciences.wustl.edu/test.pdf',
      },
    ],
  }

  const html = renderToStaticMarkup(React.createElement(ScienceStopCard, { stop: customStop }))
  assert.ok(html.includes('Custom Test Outcrop'))
  assert.ok(html.includes('Delta Top member'))
  assert.ok(html.includes('M2020-999-99'))
  assert.ok(html.includes('Condition: unresolved'))
  assert.ok(html.includes('https://pds-geosciences.wustl.edu/test.pdf'))
})

test('complies with 3-color palette design tokens (--ch-black, --ch-white, --ch-accent)', () => {
  const html = renderToStaticMarkup(React.createElement(ScienceStopCard, {}))

  // Custom properties & styles
  assert.ok(html.includes('--ch-black'))
  assert.ok(html.includes('--ch-white'))
  assert.ok(html.includes('--ch-accent'))

  // Design system token hex codes
  assert.ok(html.includes('#212121')) // Main / Card surface
  assert.ok(html.includes('#EBEBEB')) // Secondary / Foreground
  assert.ok(html.includes('#8F5A53')) // Accent Terracotta
  assert.ok(html.includes('#1A1A1A')) // Sunken / Input surface
  assert.ok(html.includes('#333333')) // Subtle card border
})
