import { useState } from 'react'
import { Users, X, MessageSquare } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import CommentCard from './CommentCard'

function CollaborationPanel() {
  const { users, currentUser, comments } = useGraph()

  const [fabOpen, setFabOpen] = useState(false)
  const [commentFilter, setCommentFilter] = useState('open')

  const filteredComments = comments.filter((c) => {
    if (commentFilter === 'open') return !c.resolved
    if (commentFilter === 'resolved') return c.resolved
    return true
  })

  return (
    <>
      {fabOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />
      )}
      <div className="fixed bottom-6 right-6 z-40">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 bg-base-100 rounded-2xl shadow-xl w-96 mb-2 flex flex-col" style={{ height: '70vh', maxHeight: '680px', minHeight: '420px' }}>
            {/* Collaborators */}
            <div className="px-6 pt-6 pb-4 border-b border-base-300 shrink-0">
              <h4 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-3">Collaborators</h4>
              <div className="flex items-center gap-3">
                {users.map((c) => (
                  <div key={c.id} className="tooltip tooltip-bottom" data-tip={c.name}>
                    <div className={`avatar ${c.id === currentUser.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 rounded-full' : ''}`}>
                      <div className="w-8 rounded-full">
                        <img src={c.avatar} alt={c.name} />
                      </div>
                    </div>
                  </div>
                ))}
                <span className="text-xs opacity-50">{users.length} members</span>
              </div>
            </div>

            {/* Comments */}
            <div className="flex-1 flex flex-col min-h-0 px-6 pt-4">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-xs font-semibold uppercase tracking-wide opacity-60">Comments</h4>
                <div className="flex gap-1">
                  {['open', 'resolved', 'all'].map((f) => (
                    <button
                      key={f}
                      className={`btn btn-ghost btn-xs ${commentFilter === f ? 'btn-active' : ''}`}
                      onClick={() => setCommentFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-6">
                {filteredComments.map((c) => (
                  <CommentCard key={c.id} comment={c} />
                ))}
                {filteredComments.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-40">
                    <MessageSquare className="size-8 mb-2" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <label className="btn btn-lg btn-circle btn-primary swap swap-rotate">
          <input type="checkbox" checked={fabOpen} onChange={() => setFabOpen(!fabOpen)} />
          <Users className="swap-off size-6" />
          <X className="swap-on size-6" />
        </label>
      </div>
    </>
  )
}

export default CollaborationPanel
