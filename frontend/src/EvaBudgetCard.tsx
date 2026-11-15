interface EvaBudgetCardProps {
  selectedOptionId: string
}

export function EvaBudgetCard({ selectedOptionId }: EvaBudgetCardProps) {
  // Budget parameters from backend/data/hawksbill_gap/eva_budget.json (Tobler model)
  const NOMINAL_BUDGET_MIN = 60.0

  const optionsData = {
    A: {
      label: 'Option A (Direct)',
      walkTimeMin: 7.8,
      scienceTimeMin: 15.0, // Wildcat Ridge (15 min)
      totalEvaMin: 22.8,
      marginMin: 37.2,
      budgetPct: 38,
      stopsSummary: '1 stop (Wildcat Ridge)',
      notes: 'Standoff view of Skinner Ridge; contact uninspected',
    },
    B: {
      label: 'Option B (Loop)',
      walkTimeMin: 10.4,
      scienceTimeMin: 30.0, // Skinner (15 min) + Wildcat (15 min)
      totalEvaMin: 40.4,
      marginMin: 19.6,
      budgetPct: 67,
      stopsSummary: '2 stops (Skinner Ridge + Wildcat Ridge)',
      notes: '+87 m walk (+2.7 min) & +15 min station time to resolve contact',
    },
  }

  if (selectedOptionId !== 'A' && selectedOptionId !== 'B') return null
  const activeOption = optionsData[selectedOptionId]
  const isOptionB = selectedOptionId === 'B'

  return (
    <div className="rounded-xl border border-card-border bg-input p-3 text-xs text-text-main shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-text-main flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          EVA Time Budget (Tobler Model)
        </h4>
        <span className="font-mono text-[11px] text-text-secondary">
          Budget: {NOMINAL_BUDGET_MIN} min
        </span>
      </div>

      {/* Progress bar visual */}
      <div className="mt-2.5">
        <div className="flex justify-between text-[11px] text-text-secondary mb-1">
          <span>{activeOption.label}</span>
          <span className="font-semibold text-text-main">
            {activeOption.totalEvaMin.toFixed(1)} / {NOMINAL_BUDGET_MIN} min (
            {activeOption.budgetPct}%)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-card-elevated flex border border-card-border">
          <div
            style={{ width: `${(activeOption.walkTimeMin / NOMINAL_BUDGET_MIN) * 100}%` }}
            className="bg-accent transition-all duration-300"
            title={`Walking: ${activeOption.walkTimeMin.toFixed(1)} min`}
          />
          <div
            style={{ width: `${(activeOption.scienceTimeMin / NOMINAL_BUDGET_MIN) * 100}%` }}
            className="bg-secondary transition-all duration-300 opacity-90"
            title={`Science Stations: ${activeOption.scienceTimeMin.toFixed(1)} min`}
          />
          <div
            style={{ width: `${(activeOption.marginMin / NOMINAL_BUDGET_MIN) * 100}%` }}
            className="bg-canvas/50"
            title={`PLSS Reserve Margin: ${activeOption.marginMin.toFixed(1)} min`}
          />
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
        <div className="rounded border border-card-border bg-card px-2 py-1">
          <span className="text-text-muted block text-[10px] uppercase">Walk Time</span>
          <span className="font-semibold text-accent">
            {activeOption.walkTimeMin.toFixed(1)} min
          </span>
        </div>
        <div className="rounded border border-card-border bg-card px-2 py-1">
          <span className="text-text-muted block text-[10px] uppercase">Science</span>
          <span className="font-semibold text-text-main">
            {activeOption.scienceTimeMin.toFixed(1)} min
          </span>
        </div>
        <div className="rounded border border-card-border bg-card px-2 py-1">
          <span className="text-text-muted block text-[10px] uppercase">PLSS Margin</span>
          <span className="font-semibold text-text-main">
            +{activeOption.marginMin.toFixed(1)} min
          </span>
        </div>
      </div>

      {/* Trade-off explanation */}
      <div className="mt-2.5 rounded-lg border border-card-border/60 bg-card/60 p-2 text-[11px] text-text-secondary leading-relaxed">
        <strong className="text-text-main block mb-0.5">
          {isOptionB ? 'Option B Scientific Return:' : 'Option A Operational Profile:'}
        </strong>
        {activeOption.notes}
      </div>
    </div>
  )
}
