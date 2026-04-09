import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Tag, ChevronDown } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import MentionTextarea from './MentionTextarea'

export const COMMENT_TAGS = [
  { value: 'suggestion', label: 'suggestion', color: 'bg-blue-500' },
  { value: 'question', label: 'question', color: 'bg-purple-500' },
  { value: 'revision needed', label: 'revision needed', color: 'bg-orange-500' },
  { value: 'approved', label: 'approved', color: 'bg-green-500' },
  { value: 'action item', label: 'action item', color: 'bg-red-500' },
  { value: 'reference', label: 'reference', color: 'bg-cyan-500' },
  { value: 'note', label: 'note', color: 'bg-gray-500' },
  { value: 'important', label: 'important', color: 'bg-amber-500' },
]

function CommentFormPopover({ nodeId, position, onClose }) {
  const { nodes, addComment } = useGraph()
  const [commentText, setCommentText] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)

  const nodeName = nodes.find((n) => n.id === nodeId)?.name
  const tagDropdownRef = useRef(null)
  const formRef = useRef(null)

  // Close tag dropdown on outside click
  useEffect(() => {
    if (!tagDropdownOpen) return
    const handler = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) setTagDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tagDropdownOpen])

  // Escape key closes form (or tag dropdown first)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (tagDropdownOpen) {
          setTagDropdownOpen(false)
        } else {
          onClose()
          setCommentText('')
          setSelectedTag(null)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [tagDropdownOpen, onClose])

  return (
    <div
      className="absolute bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 p-4 z-50 w-80"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center">
          <MessageSquare className="size-3.5 text-warning" />
        </div>
        <div>
          <span className="text-sm font-semibold leading-tight block">
            Add comment
          </span>
          <span className="text-xs opacity-50">
            {nodeName}
          </span>
        </div>
      </div>
      <MentionTextarea
        className="textarea textarea-sm w-full min-h-20 bg-base-200/50 border-base-300 focus:border-warning/50 focus:outline-none"
        placeholder="Write a comment... use @ to mention"
        rows={3}
        value={commentText}
        onChange={setCommentText}
        autoFocus
      />
      {/* Tag selector */}
      <div className="relative mt-2" ref={tagDropdownRef}>
        <button
          type="button"
          className="btn btn-ghost btn-xs gap-1.5 border border-base-300"
          onClick={() => setTagDropdownOpen((v) => !v)}
        >
          <Tag className="size-3" />
          {selectedTag ? (
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${COMMENT_TAGS.find((t) => t.value === selectedTag)?.color}`} />
              {selectedTag}
            </span>
          ) : 'Add label'}
          <ChevronDown className="size-3 opacity-50" />
        </button>
        {tagDropdownOpen && (
          <div className="absolute left-0 top-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 py-1 min-w-40">
            {selectedTag && (
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-base-200 opacity-60"
                onClick={() => { setSelectedTag(null); setTagDropdownOpen(false) }}
              >
                None
              </button>
            )}
            {COMMENT_TAGS.map((tag) => (
              <button
                key={tag.value}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-base-200 flex items-center gap-2 ${selectedTag === tag.value ? 'font-semibold' : ''}`}
                onClick={() => { setSelectedTag(tag.value); setTagDropdownOpen(false) }}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${tag.color}`} />
                {tag.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { onClose(); setCommentText(''); setSelectedTag(null) }}
        >
          Cancel
        </button>
        <button
          className="btn btn-warning btn-sm gap-1.5 text-warning-content"
          disabled={!commentText.trim()}
          onClick={() => {
            addComment(nodeId, commentText.trim(), selectedTag)
            onClose()
            setCommentText('')
            setSelectedTag(null)
          }}
        >
          <Send className="size-3.5" /> Post
        </button>
      </div>
    </div>
  )
}

export default CommentFormPopover
