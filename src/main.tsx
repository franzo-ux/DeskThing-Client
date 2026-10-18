import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The Car Thing buttons and the knob press arrive as keyboard events, which go
// to whatever has focus. Tapping an app takes the focus into its iframe, and
// from then on the buttons and the knob press reach the app instead of
// DeskThing (only turning the knob keeps working). Take the focus back as
// soon as an iframe gets it; taps and clicks inside apps still work.
const keepFocus = () => {
  const el = document.activeElement as HTMLElement | null
  if (el && el.tagName === 'IFRAME') {
    el.blur()
    window.focus()
  }
}
window.addEventListener('blur', () => setTimeout(keepFocus, 0))
setInterval(keepFocus, 1000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
