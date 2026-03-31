import { useState, useRef, useEffect } from 'react'
import { useGraph } from '../context/GraphContext'

function MentionTextarea({ value, onChange, placeholder, className, autoFocus, onKeyDown, rows }) {
  const { users } = useGraph()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef(null)

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(filter.toLowerCase()),
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  const getMentionQuery = (text, cursorPos) => {
    const before = text.slice(0, cursorPos)
    let atIdx = -1
    for (let i = before.length - 1; i >= 0; i--) {
      if (before[i] === '@' && (i === 0 || /\s/.test(before[i - 1]))) {
        atIdx = i
        break
      }
    }
    if (atIdx === -1) return null
    const query = before.slice(atIdx + 1)
    if (query.includes('\n')) return null
    return query
  }

  const handleChange = (e) => {
    const text = e.target.value
    const cursor = e.target.selectionStart
    onChange(text)
    const query = getMentionQuery(text, cursor)
    if (query !== null) {
      setFilter(query)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const insertMention = (user) => {
    const ta = textareaRef.current
    const cursor = ta.selectionStart
    const before = value.slice(0, cursor)
    const after = value.slice(cursor)
    let atIdx = -1
    for (let i = before.length - 1; i >= 0; i--) {
      if (before[i] === '@' && (i === 0 || /\s/.test(before[i - 1]))) {
        atIdx = i
        break
      }
    }
    if (atIdx >= 0) {
      const newBefore = before.slice(0, atIdx) + `@${user.name} `
      const newValue = newBefore + after
      onChange(newValue)
      setShowSuggestions(false)
      setTimeout(() => {
        ta.focus()
        const pos = newBefore.length
        ta.setSelectionRange(pos, pos)
      }, 0)
    }
  }

  const handleKeyDown = (e) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filteredUsers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }
    onKeyDown?.(e)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        rows={rows}
      />
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-base-100 rounded-lg shadow-xl border border-base-300 z-[60] max-h-40 overflow-y-auto">
          {filteredUsers.map((user, i) => (
            <button
              key={user.id}
              className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm transition-colors ${
                i === selectedIndex ? 'bg-primary/10' : 'hover:bg-base-200'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(user)
              }}
            >
              <div className="avatar">
                <div className="w-6 rounded-full">
                  <img src={user.avatar} alt={user.name} />
                </div>
              </div>
              <span className="font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MentionTextarea
