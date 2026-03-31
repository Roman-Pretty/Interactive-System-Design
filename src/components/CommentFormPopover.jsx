import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import MentionTextarea from './MentionTextarea'

function CommentFormPopover({ nodeId, position, onClose }) {
  const { nodes, addComment } = useGraph()
  const [commentText, setCommentText] = useState('')

  const nodeName = nodes.find((n) => n.id === nodeId)?.name

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
      <div className="flex gap-2 mt-3 justify-end">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { onClose(); setCommentText('') }}
        >
          Cancel
        </button>
        <button
          className="btn btn-warning btn-sm gap-1.5 text-warning-content"
          disabled={!commentText.trim()}
          onClick={() => {
            addComment(nodeId, commentText.trim())
            onClose()
            setCommentText('')
          }}
        >
          <Send className="size-3.5" /> Post
        </button>
      </div>
    </div>
  )
}

export default CommentFormPopover
