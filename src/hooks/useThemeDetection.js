import { useState, useEffect } from 'react'

export function useThemeDetection() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => {
      const checkbox = document.querySelector('.theme-controller')
      if (checkbox) { setIsDark(checkbox.checked); return }
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    }
    check()
    const checkbox = document.querySelector('.theme-controller')
    if (checkbox) checkbox.addEventListener('change', check)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      if (checkbox) checkbox.removeEventListener('change', check)
      observer.disconnect()
    }
  }, [])

  return isDark
}
