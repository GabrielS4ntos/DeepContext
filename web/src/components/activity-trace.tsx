import { Check, CircleDashed, Database, Globe2, PenLine, Sparkles, TriangleAlert } from 'lucide-react'
import type { Activity, ActivityStage } from '../types'

const labels: Record<ActivityStage, { label: string; icon: typeof Sparkles }> = {
  planning: { label: 'Planning', icon: Sparkles },
  memory: { label: 'Semantic memory', icon: Database },
  web: { label: 'Web research', icon: Globe2 },
  synthesis: { label: 'Synthesis', icon: PenLine },
}

export function ActivityTrace({ activity }: { activity: Activity[] }) {
  return (
    <div className="activity-trace" aria-label="Research progress">
      {activity.map((item) => {
        const { label, icon: Icon } = labels[item.stage]
        const StateIcon =
          item.state === 'complete'
            ? Check
            : item.state === 'unavailable'
              ? TriangleAlert
              : CircleDashed
        return (
          <div className={`activity-step is-${item.state}`} key={item.stage}>
            <Icon className="activity-kind" aria-hidden="true" />
            <span>{label}</span>
            <StateIcon className="activity-state" aria-hidden="true" />
          </div>
        )
      })}
    </div>
  )
}

