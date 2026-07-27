import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { Command } from 'cmdk'
import { navigate } from '../router'
import { DOC_GROUPS, pagePath, type DocPage } from './nav'

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

function pageKeywords(page: DocPage): string[] {
  const slug = page.slug.replace(/-/g, ' ')
  return [
    page.description,
    slug,
    ...page.headings.map((h) => h.text),
  ].filter(Boolean)
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function go(page: DocPage) {
    navigate(pagePath(page))
    setOpen(false)
    window.scrollTo(0, 0)
  }

  return (
    <SearchContext.Provider value={{ open: openSearch }}>
      {children}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search documentation"
        overlayClassName="doc-search-backdrop"
        contentClassName="doc-search"
        loop
      >
        <Command.Input placeholder="Search docs…" />
        <Command.List>
          <Command.Empty>No results</Command.Empty>
          {DOC_GROUPS.map((group) => (
            <Command.Group key={group.title} heading={group.title}>
              {group.pages.map((page) => (
                <Command.Item
                  key={page.slug}
                  value={page.title}
                  keywords={pageKeywords(page)}
                  onSelect={() => go(page)}
                >
                  <span className="doc-search-title">{page.title}</span>
                  <span className="doc-search-match">{page.description}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <p className="doc-search-hint" aria-hidden="true">
          <kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close
        </p>
      </Command.Dialog>
    </SearchContext.Provider>
  )
}
