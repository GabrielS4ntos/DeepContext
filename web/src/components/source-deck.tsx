import { ArrowUpRight, Database, Globe2 } from 'lucide-react'
import type { Source } from '../types'

export function SourceDeck({ sources }: { sources: Source[] }) {
  if (!sources.length) return null

  return (
    <section className="source-section" aria-labelledby="source-heading">
      <div className="source-heading-row">
        <p className="section-kicker" id="source-heading">
          Evidence
        </p>
        <span>{sources.length} sources</span>
      </div>
      <div className="source-deck">
        {sources.map((source, index) => {
          const Icon = source.kind === 'web' ? Globe2 : Database
          const content = (
            <>
              <span className="source-index">{String(index + 1).padStart(2, '0')}</span>
              <Icon aria-hidden="true" />
              <span className="source-copy">
                <strong>{source.title ?? source.source}</strong>
                <small>{source.source}</small>
              </span>
              {source.url && <ArrowUpRight className="source-arrow" aria-hidden="true" />}
            </>
          )
          return source.url ? (
            <a className="source-card" href={source.url} key={`${source.source}-${index}`} target="_blank" rel="noreferrer">
              {content}
            </a>
          ) : (
            <div className="source-card" key={`${source.source}-${index}`}>
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}

