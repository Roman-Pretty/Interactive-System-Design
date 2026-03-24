import { useState } from 'react'
import { MessageSquare, CheckCircle2, Reply, Send } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function CommentTooltip({ position, nodeComments, onMouseEnter, onMouseLeave }) {
  const { users, addReply, resolveComment } = useGraph()

  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  const handleMouseLeave = () => {
    setReplyingTo(null)
    setReplyText('')
    onMouseLeave()
  }

  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{ left: position.x - 40, top: position.y - 40, padding: 40 }}
    >
      <div
        className="pointer-events-auto bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 p-4 w-80 max-h-80 overflow-y-auto"
        onMouseEnter={onMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center">
            <MessageSquare className="size-3 text-warning" />
          </div>
          <span className="text-xs font-semibold opacity-60">
            {nodeComments.length} comment{nodeComments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {nodeComments.map((c) => {
            const author = users.find((u) => u.id === c.authorId)
            return (
              <div key={c.id} className="bg-base-200/60 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="avatar">
                    <div className="w-5 rounded-full">
                      <img src={author?.avatar} alt={author?.name} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold">{author?.name}</span>
                  <span className="text-[10px] opacity-40 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs leading-relaxed ml-7">{c.text}</p>
                {c.replies.length > 0 && (
                  <div className="ml-7 mt-2 border-l-2 border-base-300 pl-2.5 flex flex-col gap-1.5">
                    {c.replies.map((r) => {
                      const ra = users.find((u) => u.id === r.authorId)
                      return (
                        <div key={r.id}>
                          <span className="text-[11px] font-semibold">{ra?.name}: </span>
                          <span className="text-[11px] opacity-80">{r.text}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {replyingTo === c.id ? (
                  <div className="ml-7 mt-2 flex gap-1">
                    <input
                      type="text"
                      className="input input-xs flex-1 bg-base-100 border-base-300 focus:border-warning/50 focus:outline-none"
                      placeholder="Reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && replyText.trim()) {
                          addReply(c.id, replyText.trim())
                          setReplyText('')
                          setReplyingTo(null)
                        }
                        if (e.key === 'Escape') { setReplyingTo(null); setReplyText('') }
                      }}
                    />
                    <button
                      className="btn btn-warning btn-xs"
                      disabled={!replyText.trim()}
                      onClick={() => {
                        addReply(c.id, replyText.trim())
                        setReplyText('')
                        setReplyingTo(null)
                      }}
                    >
                      <Send className="size-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-1.5 mt-2">
                    <button
                      className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
                      onClick={() => resolveComment(c.id)}
                    >
                      <CheckCircle2 className="size-3" /> Resolve
                    </button>
                    <button
                      className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100"
                      onClick={() => { setReplyingTo(c.id); setReplyText('') }}
                    >
                      <Reply className="size-3" /> Reply
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CommentTooltip
