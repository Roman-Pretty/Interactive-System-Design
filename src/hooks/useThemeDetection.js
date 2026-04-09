import { useState, useEffect } from 'react'

function getIsDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

export function useThemeDetection() {
  const [isDark, setIsDark] = useState(getIsDark)

  useEffect(() => {
    const check = () => setIsDark(getIsDark())
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
