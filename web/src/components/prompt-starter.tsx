import { ArrowUpRight } from 'lucide-react'
import { scenarios } from '../data/scenarios'

export function PromptStarter({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="starter-grid">
      {scenarios.map((scenario, index) => (
        <button key={scenario.id} className="starter-card" type="button" onClick={() => onSelect(scenario.prompt)}>
          <span className="starter-number">0{index + 1}</span>
          <span className="section-kicker">{scenario.eyebrow}</span>
          <strong>{scenario.title}</strong>
          <small>{scenario.description}</small>
          <ArrowUpRight aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

