import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, CheckCircle2, Reply, Send } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import MentionText from './MentionText'
import MentionTextarea from './MentionTextarea'

const UNDO_TIMEOUT = 5000

function CommentCard({ comment }) {
  const { users, nodes, currentUser, addReply, resolveComment, unresolveComment, removeComment, removeReply } = useGraph()

  const [replyingTo, setReplyingTo] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // 'resolved' | 'deleted'
  const timerRef = useRef(null)

  const author = users.find((u) => u.id === comment.authorId)
  const nodeName = nodes.find((n) => n.id === comment.nodeId)?.name || 'Unknown'

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const handleResolve = () => {
    setPendingAction('resolved')
    clearTimer()
    timerRef.current = setTimeout(() => {
      resolveComment(comment.id)
      setPendingAction(null)
    }, UNDO_TIMEOUT)
  }

  const handleDelete = () => {
    setPendingAction('deleted')
    clearTimer()
    timerRef.current = setTimeout(() => {
      removeComment(comment.id)
      setPendingAction(null)
    }, UNDO_TIMEOUT)
  }

  const handleUndo = () => {
    clearTimer()
    setPendingAction(null)
  }

  if (pendingAction) {
    const label = pendingAction === 'resolved' ? 'Comment resolved.' : 'Comment deleted.'
    return (
      <div className="rounded-xl border-2 border-dashed border-base-300 p-6 flex items-center justify-center">
        <p className="text-sm opacity-60">
          {label}{' '}
          <button className="underline hover:opacity-100 cursor-pointer" onClick={handleUndo}>
            Undo
          </button>
        </p>
      </div>
    )
  }

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
        {currentUser.id === comment.authorId && (
          <button
            className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
            onClick={handleDelete}
            title="Delete comment"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed mt-3"><MentionText text={comment.text} /></p>

      {comment.replies.length > 0 && (
        <div className="mt-3 border-t border-base-300 pt-3 flex flex-col gap-3">
          {comment.replies.map((r) => {
            const ra = users.find((u) => u.id === r.authorId)
            return (
              <div key={r.id} className="flex items-start gap-2 pl-2 group/reply">
                <div className="avatar">
                  <div className="w-6 rounded-full">
                    <img src={ra?.avatar} alt={ra?.name} />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold">{ra?.name}</span>
                  <p className="text-xs leading-relaxed"><MentionText text={r.text} /></p>
                </div>
                {currentUser.id === r.authorId && (
                  <button
                    className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover/reply:opacity-40 hover:opacity-100!"
                    onClick={() => removeReply(comment.id, r.id)}
                    title="Delete reply"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {replyingTo ? (
        <div className="mt-3 flex flex-col gap-2">
          <MentionTextarea
            className="textarea textarea-sm w-full min-h-20 bg-base-200/50 border-base-300 focus:border-primary/50 focus:outline-none"
            placeholder="Write a reply... use @ to mention"
            value={replyText}
            onChange={setReplyText}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                e.preventDefault()
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
      ) : comment.resolved ? (
        <div className="flex justify-end gap-2 mt-3">
          <button
            className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
            onClick={() => unresolveComment(comment.id)}
          >
            Unresolve
          </button>
        </div>
      ) : (
        <div className="flex justify-end gap-2 mt-3">
          <button
            className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
            onClick={handleResolve}
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
      )}
    </div>
  )
}

export default CommentCard
