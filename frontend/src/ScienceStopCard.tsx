import {
  SCIENCE_STOPS,
  SKINNER_RIDGE_STOP,
  ScienceStopCard as BaseScienceStopCard,
  SingleStopCardView,
  WILDCAT_RIDGE_STOP,
  type AbrasionPatch,
  type CompetingInterpretation,
  type CoreSample,
  type NaturalSurfaceTarget,
  type ProposedFieldTask,
  type ScienceStopCardProps,
  type ScienceStopData,
  type SourceLink,
  type SurfaceCondition,
} from './scienceStops.ts'

export type {
  SurfaceCondition,
  CoreSample,
  AbrasionPatch,
  NaturalSurfaceTarget,
  SourceLink,
  CompetingInterpretation,
  ProposedFieldTask,
  ScienceStopData,
  ScienceStopCardProps,
}

export { WILDCAT_RIDGE_STOP, SKINNER_RIDGE_STOP, SCIENCE_STOPS, SingleStopCardView }

export const ScienceStopCard = BaseScienceStopCard

export default ScienceStopCard
