import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted typography — Inter for UI, IBM Plex Mono for tabular numbers.
// @fontsource bundles WOFF2 + a generated @font-face block per weight, so we
// avoid the Google Fonts CDN (privacy, perf, CSP).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
