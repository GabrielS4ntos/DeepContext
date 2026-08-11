import { ArrowUp, Square } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

type Props = {
  isResearching: boolean
  onSubmit: (prompt: string) => void
  onCancel: () => void
}

export function ResearchComposer({ isResearching, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
  }, [draft])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!draft.trim() || isResearching) return
    onSubmit(draft)
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="research-composer" onSubmit={submit}>
      <div className="composer-label-row">
        <label htmlFor="research-question">Ask DeepContext</label>
        <span>Mock mode</span>
      </div>
      <div className="composer-control">
        <textarea
          id="research-question"
          ref={textareaRef}
          value={draft}
          rows={1}
          placeholder="What would you like to investigate?"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {isResearching ? (
          <button className="composer-submit is-stop" type="button" onClick={onCancel} aria-label="Stop research">
            <Square aria-hidden="true" />
          </button>
        ) : (
          <button className="composer-submit" type="submit" disabled={!draft.trim()} aria-label="Send question">
            <ArrowUp aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="composer-hint">Enter to send · Shift + Enter for a new line · Responses are simulated locally</p>
    </form>
  )
}

