import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GraphProvider } from './context/GraphContext'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Interactive-System-Design/sw.js');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GraphProvider>
      <App />
    </GraphProvider>
  </StrictMode>,
)
