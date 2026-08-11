import { useEffect, useRef } from 'react'
import type { ConversationTurn } from '../types'
import { EvidenceAnswer } from './evidence-answer'
import { PromptStarter } from './prompt-starter'

type Props = {
  turns: ConversationTurn[]
  onPromptSelect: (prompt: string) => void
  onRetry: (question: string) => void
}

export function ConversationFeed({ turns, onPromptSelect, onRetry }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  if (!turns.length) {
    return (
      <section className="welcome-state">
        <div className="welcome-orbit" aria-hidden="true">
          <span>D</span>
        </div>
        <p className="section-kicker">Autonomous research, grounded in evidence</p>
        <h1>Go deeper than<br />a quick answer.</h1>
        <p className="welcome-copy">
          Explore a question across semantic memory and the web. DeepContext plans, retrieves, and synthesizes the evidence into one traceable response.
        </p>
        <PromptStarter onSelect={onPromptSelect} />
      </section>
    )
  }

  return (
    <section className="conversation-feed" aria-live="polite">
      {turns.map((turn) =>
        turn.role === 'user' ? (
          <article className="user-turn" key={turn.id}>
            <span>You</span>
            <p>{turn.content}</p>
          </article>
        ) : (
          <EvidenceAnswer key={turn.id} turn={turn} onRetry={onRetry} />
        ),
      )}
      <div ref={endRef} />
    </section>
  )
}

