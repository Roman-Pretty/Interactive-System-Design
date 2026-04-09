import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, CheckCircle2, Reply, Send } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import MentionText from './MentionText'
import MentionTextarea from './MentionTextarea'
import { COMMENT_TAGS } from './CommentFormPopover'

const UNDO_TIMEOUT = 5000

function CommentItem({ comment, compact = false }) {
  const { users, nodes, currentUser, addReply, resolveComment, unresolveComment, removeComment, removeReply, markPendingResolve, clearPendingResolve } = useGraph()

  const [replyingTo, setReplyingTo] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const timerRef = useRef(null)
  const pendingActionRef = useRef(null)

  const author = users.find((u) => u.id === comment.authorId)
  const nodeName = nodes.find((n) => n.id === comment.nodeId)?.name || 'Unknown'

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => {
    clearTimer()
    if (pendingActionRef.current === 'resolved') {
      resolveComment(comment.id)
      clearPendingResolve(comment.id)
    }
    if (pendingActionRef.current === 'deleted') {
      removeComment(comment.id)
    }
  }, [clearTimer, comment.id, resolveComment, clearPendingResolve, removeComment])

  const handleResolve = () => {
    markPendingResolve(comment.id)
    setPendingAction('resolved')
    pendingActionRef.current = 'resolved'
    clearTimer()
    timerRef.current = setTimeout(() => {
      resolveComment(comment.id)
      clearPendingResolve(comment.id)
      setPendingAction(null)
      pendingActionRef.current = null
    }, UNDO_TIMEOUT)
  }

  const handleDelete = () => {
    setPendingAction('deleted')
    pendingActionRef.current = 'deleted'
    clearTimer()
    timerRef.current = setTimeout(() => {
      removeComment(comment.id)
      setPendingAction(null)
      pendingActionRef.current = null
    }, UNDO_TIMEOUT)
  }

  const handleUndo = () => {
    clearTimer()
    if (pendingAction === 'resolved') {
      clearPendingResolve(comment.id)
    }
    setPendingAction(null)
    pendingActionRef.current = null
  }

  const submitReply = () => {
    if (!replyText.trim()) return
    addReply(comment.id, replyText.trim())
    setReplyText('')
    setReplyingTo(false)
  }

  if (pendingAction) {
    const label = pendingAction === 'resolved' ? 'Comment resolved.' : 'Comment deleted.'
    return (
      <div className={`rounded-xl border-2 border-dashed border-base-300 flex items-center justify-center ${compact ? 'p-4' : 'p-6'}`}>
        <p className={`opacity-60 ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}{' '}
          <button className="underline hover:opacity-100 cursor-pointer" onClick={handleUndo}>
            Undo
          </button>
        </p>
      </div>
    )
  }

  // ---- Compact variant (tooltip) ----
  if (compact) {
    return (
      <div className="bg-base-200/60 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="avatar">
            <div className="w-5 rounded-full">
              <img src={author?.avatar} alt={author?.name} />
            </div>
          </div>
          <span className="text-xs font-semibold">{author?.name}</span>
          <span className="text-[10px] opacity-40 ml-auto">{new Date(comment.createdAt).toLocaleDateString()}</span>
          <button
            className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100 ml-1"
            onClick={handleDelete}
            title="Delete comment"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
        <p className="text-xs leading-relaxed ml-7"><MentionText text={comment.text} /></p>
        {comment.tag && (() => {
          const tagDef = COMMENT_TAGS.find((t) => t.value === comment.tag)
          return tagDef ? (
            <span className={`ml-7 mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${tagDef.color} text-white font-medium`}>
              {tagDef.label}
            </span>
          ) : null
        })()}
        {comment.replies.length > 0 && (
          <div className="ml-7 mt-2 border-l-2 border-base-300 pl-2.5 flex flex-col gap-1.5">
            {comment.replies.map((r) => {
              const ra = users.find((u) => u.id === r.authorId)
              return (
                <div key={r.id}>
                  <span className="text-[11px] font-semibold">{ra?.name}: </span>
                  <span className="text-[11px] opacity-80"><MentionText text={r.text} /></span>
                </div>
              )
            })}
          </div>
        )}
        {replyingTo ? (
          <div className="ml-7 mt-2 flex flex-col gap-1.5">
            <MentionTextarea
              className="textarea textarea-sm w-full min-h-16 bg-base-100 border-base-300 focus:border-warning/50 focus:outline-none text-xs"
              placeholder="Reply... use @ to mention"
              rows={2}
              value={replyText}
              onChange={setReplyText}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                  e.preventDefault()
                  submitReply()
                }
                if (e.key === 'Escape') { setReplyingTo(false); setReplyText('') }
              }}
            />
            <button
              className="btn btn-warning btn-xs self-end"
              disabled={!replyText.trim()}
              onClick={submitReply}
            >
              <Send className="size-3" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1.5 mt-2">
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

  // ---- Full variant (sidebar) ----
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
      {comment.tag && (() => {
        const tagDef = COMMENT_TAGS.find((t) => t.value === comment.tag)
        return tagDef ? (
          <span className={`mt-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${tagDef.color} text-white font-medium`}>
            {tagDef.label}
          </span>
        ) : null
      })()}

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
                submitReply()
              }
              if (e.key === 'Escape') { setReplyingTo(false); setReplyText('') }
            }}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!replyText.trim()}
            onClick={submitReply}
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

export default CommentItem
