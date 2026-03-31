import { MessageSquare, X } from 'lucide-react'
import CommentItem from './CommentItem'

function CommentTooltip({ position, nodeComments, onClose }) {
  return (
    <div
      className="absolute z-40"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 p-4 w-80 max-h-96 overflow-visible flex flex-col">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center">
            <MessageSquare className="size-3 text-warning" />
          </div>
          <span className="text-xs font-semibold opacity-60 flex-1">
            {nodeComments.length} comment{nodeComments.length !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-72">
          {nodeComments.map((c) => (
            <CommentItem key={c.id} comment={c} compact />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CommentTooltip
