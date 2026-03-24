import { useState } from 'react'
import { X, CheckCircle2, Reply, Send } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function CommentCard({ comment }) {
  const { users, nodes, addReply, resolveComment, removeComment } = useGraph()

  const [replyingTo, setReplyingTo] = useState(false)
  const [replyText, setReplyText] = useState('')

  const author = users.find((u) => u.id === comment.authorId)
  const nodeName = nodes.find((n) => n.id === comment.nodeId)?.name || 'Unknown'

  return (
    <div className={`bg-base-200 rounded-xl p-4 ${comment.resolved ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-8 rounded-full">
              <img src={author?.avatar} alt={author?.name} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{author?.name}</p>
            <p className="text-xs opacity-50 mt-0.5">{nodeName} &middot; {new Date(comment.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
          onClick={() => removeComment(comment.id)}
          title="Delete comment"
        >
          <X className="size-3" />
        </button>
      </div>
      <p className="text-sm leading-relaxed mt-3">{comment.text}</p>

      {comment.replies.length > 0 && (
        <div className="mt-3 border-t border-base-300 pt-3 flex flex-col gap-3">
          {comment.replies.map((r) => {
            const ra = users.find((u) => u.id === r.authorId)
            return (
              <div key={r.id} className="flex items-start gap-2 pl-2">
                <div className="avatar">
                  <div className="w-6 rounded-full">
                    <img src={ra?.avatar} alt={ra?.name} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold">{ra?.name}</span>
                  <p className="text-xs leading-relaxed">{r.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {replyingTo ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            className="input input-sm flex-1"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && replyText.trim()) {
                addReply(comment.id, replyText.trim())
                setReplyText('')
                setReplyingTo(false)
              }
              if (e.key === 'Escape') { setReplyingTo(false); setReplyText('') }
            }}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!replyText.trim()}
            onClick={() => {
              addReply(comment.id, replyText.trim())
              setReplyText('')
              setReplyingTo(false)
            }}
          >
            <Send className="size-3" />
          </button>
        </div>
      ) : (
        !comment.resolved && (
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
              onClick={() => resolveComment(comment.id)}
            >
              <CheckCircle2 className="size-3" /> Resolve
            </button>
            <button
              className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
              onClick={() => { setReplyingTo(true); setReplyText('') }}
            >
              <Reply className="size-3" /> Reply
            </button>
          </div>
        )
      )}
    </div>
  )
}

export default CommentCard
