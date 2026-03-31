import { useState, useEffect } from 'react'

function getIsDark() {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr) return attr === 'dark'
  const checkbox = document.querySelector('.theme-controller')
  if (checkbox) return checkbox.checked
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useThemeDetection() {
  const [isDark, setIsDark] = useState(getIsDark)

  useEffect(() => {
    const check = () => setIsDark(getIsDark())
    check()
    const checkbox = document.querySelector('.theme-controller')
    if (checkbox) checkbox.addEventListener('change', check)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', check)
    return () => {
      if (checkbox) checkbox.removeEventListener('change', check)
      observer.disconnect()
      mq.removeEventListener('change', check)
    }
  }, [])

  return isDark
}
