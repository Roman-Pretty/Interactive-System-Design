import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GraphProvider } from './context/GraphContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GraphProvider>
      <App />
    </GraphProvider>
  </StrictMode>,
)
