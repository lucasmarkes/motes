import { StrictMode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'
import { POINTER_ACCENT } from '../accent'
import { Field, type FieldHandle } from '../Field'
import { Lab } from './Lab'
import '../styles.css'

/**
 * Standalone mount for layout tests — not routed in the app. The Lab composer
 * is hidden from navigation; this fixture keeps the controls-rail budget test
 * running against the real component tree without a /lab route.
 */
function LabLayoutFixture() {
  const fieldRef = useRef<FieldHandle>(null)

  return (
    <>
      <Field
        ref={fieldRef}
        initial={{ ...DEFAULT_OPTIONS, accent: POINTER_ACCENT }}
        className="app-field"
        aria-hidden="true"
      />
      <Lab fieldRef={fieldRef} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LabLayoutFixture />
  </StrictMode>,
)
