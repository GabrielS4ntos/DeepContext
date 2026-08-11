import { Code2, Database, Plus, Sparkles } from 'lucide-react'
import { useResearchSession } from '../hooks/use-research-session'
import { ConversationFeed } from './conversation-feed'
import { ResearchComposer } from './research-composer'

export function ResearchConsole() {
  const { turns, isResearching, submit, cancel, clear, retry } = useResearchSession()

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DeepContext home">
          <span className="brand-symbol"><Sparkles aria-hidden="true" /></span>
          <span><strong>DeepContext</strong><small>Research workspace</small></span>
        </a>
        <div className="topbar-actions">
          <span className="system-pill"><i /> Mock environment</span>
          {turns.length > 0 && (
            <button className="new-research" type="button" onClick={clear}>
              <Plus aria-hidden="true" /> New research
            </button>
          )}
          <a className="icon-link" href="https://github.com/GabrielS4ntos/DeepContext" target="_blank" rel="noreferrer" aria-label="Open DeepContext on GitHub">
            <Code2 aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="top" className="workspace">
        <aside className="context-rail" aria-label="Workspace information">
          <div>
            <p className="section-kicker">Workspace</p>
            <strong>Open research</strong>
          </div>
          <div className="rail-stat">
            <Database aria-hidden="true" />
            <span><strong>Qdrant</strong><small>Semantic memory</small></span>
          </div>
          <p className="rail-note">This preview is fully local. No API request or external research is performed.</p>
        </aside>

        <div className="conversation-column">
          <ConversationFeed turns={turns} onPromptSelect={submit} onRetry={retry} />
          <ResearchComposer isResearching={isResearching} onSubmit={submit} onCancel={cancel} />
        </div>
      </main>
    </div>
  )
}
