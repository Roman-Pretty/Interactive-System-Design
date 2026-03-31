import { useGraph } from '../context/GraphContext'

function MentionText({ text }) {
  const { users } = useGraph()
  const parts = []
  let lastIdx = 0
  const sorted = [...users].sort((a, b) => b.name.length - a.name.length)

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '@') {
      const afterAt = text.slice(i + 1)
      for (const user of sorted) {
        if (afterAt.toLowerCase().startsWith(user.name.toLowerCase())) {
          if (i > lastIdx) parts.push(text.slice(lastIdx, i))
          parts.push(
            <span key={`m-${i}`} className="text-primary font-semibold">
              @{user.name}
            </span>,
          )
          lastIdx = i + 1 + user.name.length
          i = lastIdx - 1
          break
        }
      }
    }
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))

  return <>{parts.length > 0 ? parts : text}</>
}

export default MentionText
