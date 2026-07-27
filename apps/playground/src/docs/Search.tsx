import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { navigate } from '../router'
import { pagePath, searchDocs, type SearchResult } from './searchIndex'

interface SearchContextValue {
  open: () => void
}

const SearchContext = createContext<SearchContextValue>({ open: () => {} })

export function useSearch(): SearchContextValue {
  return useContext(SearchContext)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openSearch = useCallback(() => setOpen(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === '/' && !isEditableTarget(e.target) && !open) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <SearchContext.Provider value={{ open: openSearch }}>
      {children}
      {open ? <SearchDialog onClose={() => setOpen(false)} /> : null}
    </SearchContext.Provider>
  )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = searchDocs(query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActive(0)
  }, [query])

  function go(result: SearchResult) {
    navigate(pagePath(result.page))
    onClose()
    window.scrollTo(0, 0)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="doc-search-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="doc-search"
        open
        aria-label="Search documentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          type="search"
          className="doc-search-input"
          placeholder="Search docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-autocomplete="list"
          aria-controls="doc-search-list"
          aria-activedescendant={
            results[active] ? `doc-search-${active}` : undefined
          }
        />
        <ul id="doc-search-list" className="doc-search-results" role="listbox">
          {results.length === 0 ? (
            <li className="doc-search-empty">No results</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.page.slug}-${r.match}`} role="option" aria-selected={i === active}>
                <button
                  id={`doc-search-${i}`}
                  type="button"
                  className={i === active ? 'is-active' : undefined}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="doc-search-title">{r.page.title}</span>
                  <span className="doc-search-match">{r.match}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="doc-search-hint" aria-hidden="true">
          <kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close
        </p>
      </dialog>
    </div>
  )
}
