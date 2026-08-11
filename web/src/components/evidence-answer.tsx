import { Check, Copy, RefreshCw, Square } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { AssistantTurn } from '../types'
import { ActivityTrace } from './activity-trace'
import { SourceDeck } from './source-deck'

type Props = {
  turn: AssistantTurn
  onRetry: (question: string) => void
}

const stateCopy = {
  complete: 'Research complete',
  partial: 'Evidence limited',
  cancelled: 'Research stopped',
  failed: 'Research failed',
  streaming: 'Researching',
}

export function EvidenceAnswer({ turn, onRetry }: Props) {
  const [copied, setCopied] = useState(false)
  const canRetry = ['partial', 'cancelled', 'failed'].includes(turn.state)

  const copy = async () => {
    await navigator.clipboard.writeText(turn.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <article className={`answer-card is-${turn.state}`}>
      {turn.retried && <div className="retry-marker">Retried research run</div>}
      <header className="answer-meta">
        <div className="agent-mark" aria-hidden="true">
          D
        </div>
        <div>
          <strong>DeepContext</strong>
          <span className="answer-state">
            {turn.state === 'streaming' && <i />}
            {stateCopy[turn.state]}
          </span>
        </div>
      </header>

      <ActivityTrace activity={turn.activity} />

      {turn.error ? (
        <div className="inline-error" role="alert">
          <strong>Research interrupted</strong>
          <p>{turn.error}</p>
        </div>
      ) : turn.content ? (
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {turn.content}
          </ReactMarkdown>
          {turn.state === 'streaming' && <span className="stream-caret" aria-hidden="true" />}
        </div>
      ) : (
        <div className="answer-placeholder">
          <span />
          <span />
          <span />
        </div>
      )}

      <SourceDeck sources={turn.sources} />

      {turn.state !== 'streaming' && (
        <footer className="answer-actions">
          {turn.content && (
            <button className="quiet-button" type="button" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy answer'}
            </button>
          )}
          {canRetry && (
            <button className="quiet-button" type="button" onClick={() => onRetry(turn.question)}>
              <RefreshCw aria-hidden="true" />
              Retry
            </button>
          )}
          {turn.state === 'cancelled' && (
            <span className="stopped-note">
              <Square aria-hidden="true" /> Stream preserved
            </span>
          )}
        </footer>
      )}
    </article>
  )
}

