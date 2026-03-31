import { useState, useRef, useEffect } from 'react'
import { Users, X, MessageSquare, Shield, ShieldCheck, Crown, Plus } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import CommentCard from './CommentCard'
import { openShareModal } from './Navbar'

const ROLE_ICON = {
  owner: Crown,
  editor: ShieldCheck,
  viewer: Shield,
}

const ROLE_COLOR = {
  owner: 'text-warning',
  editor: 'text-success',
  viewer: 'text-info',
}

function CollaborationPanel() {
  const { users, currentUser, comments, isOwner, changeUserRole, removeUser, ROLES, ROLE_LABELS } = useGraph()

  const [fabOpen, setFabOpen] = useState(false)
  const [commentFilter, setCommentFilter] = useState('open')
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, userId }
  const ctxRef = useRef(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target)) setCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ctxMenu])

  const handleCollaboratorContextMenu = (e, user) => {
    if (!isOwner || user.id === currentUser.id) return
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, userId: user.id })
  }

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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide opacity-60">Collaborators</h4>
                <button className="btn btn-ghost btn-xs btn-circle" onClick={openShareModal} title="Invite collaborator">
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {users.map((c) => {
                  const RoleIcon = ROLE_ICON[c.role] || Shield
                  const roleColor = ROLE_COLOR[c.role] || 'text-base-content'
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${isOwner && c.id !== currentUser.id ? 'cursor-context-menu hover:bg-base-200' : ''}`}
                      onContextMenu={(e) => handleCollaboratorContextMenu(e, c)}
                    >
                      <div className={`avatar ${c.id === currentUser.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 rounded-full' : ''}`}>
                        <div className="w-8 rounded-full">
                          <img src={c.avatar} alt={c.name} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{c.name}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${roleColor}`}>
                        <RoleIcon className="size-3.5" />
                        <span className="text-xs font-medium">{ROLE_LABELS[c.role]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <span className="text-xs opacity-50 mt-2 block">{users.length} members{isOwner && users.length > 1 ? ' · Right-click to manage' : ''}</span>
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

      {/* Owner right-click context menu */}
      {ctxMenu && (() => {
        const targetUser = users.find((u) => u.id === ctxMenu.userId)
        if (!targetUser) return null
        const otherRoles = ROLES.filter((r) => r !== targetUser.role && r !== 'owner')
        return (
          <div
            ref={ctxRef}
            className="fixed z-100 bg-base-100 rounded-xl shadow-2xl border border-base-300 py-1 min-w-45"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <div className="px-3 py-2 border-b border-base-200">
              <p className="text-xs font-semibold truncate">{targetUser.name}</p>
              <p className="text-xs opacity-50">{ROLE_LABELS[targetUser.role]}</p>
            </div>
            {otherRoles.map((role) => {
              const Icon = ROLE_ICON[role] || Shield
              return (
                <button
                  key={role}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-base-200 flex items-center gap-2 transition-colors"
                  onClick={() => { changeUserRole(ctxMenu.userId, role); setCtxMenu(null) }}
                >
                  <Icon className={`size-4 ${ROLE_COLOR[role]}`} />
                  Set as {ROLE_LABELS[role]}
                </button>
              )
            })}
            <div className="border-t border-base-200 mt-1 pt-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-error/10 text-error flex items-center gap-2 transition-colors"
                onClick={() => { removeUser(ctxMenu.userId); setCtxMenu(null) }}
              >
                <X className="size-4" />
                Remove
              </button>
            </div>
          </div>
        )
      })()}
    </>
  )
}

export default CollaborationPanel
