import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, PanelLeftClose, MessageSquare, Shield, ShieldCheck, Crown, X } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
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
import BreadcrumbNav from './BreadcrumbNav'
import SidebarTreeNode from './SidebarTreeNode'
import SidebarContextMenu from './SidebarContextMenu'
import AddNodeForm from './AddNodeForm'
import CommentCard from './CommentCard'

function Sidebar({ sidebarOpen, onClose, renamingNodeId, setRenamingNodeId, renameValue, setRenameValue }) {
  const { nodes, currentParentId, breadcrumbs, navigateInto, addNode, users, currentUser, comments, ROLE_LABELS, isOwner, changeUserRole, removeUser, ROLES } = useGraph()

  const [nodeSearch, setNodeSearch] = useState('')
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [sidebarMenu, setSidebarMenu] = useState(null)
  const [commentFilter, setCommentFilter] = useState('open')
  const [ctxMenu, setCtxMenu] = useState(null)
  const ctxRef = useRef(null)

  const filteredComments = comments.filter((c) => {
    if (commentFilter === 'open') return !c.resolved
    if (commentFilter === 'resolved') return c.resolved
    return true
  })

  // Close sidebar context menu on any window click
  useEffect(() => {
    const close = () => setSidebarMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // Close collaborator context menu on outside click
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

  const toggleExpand = useCallback((nodeId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const handleRootClick = useCallback(() => {
    navigateInto(null)
    setExpanded(new Set())
  }, [navigateInto])

  const handleAddNode = useCallback((name, color) => {
    addNode(name, color, currentParentId)
    setAddFormOpen(false)
  }, [addNode, currentParentId])

  const handleRename = useCallback((nodeId, nodeName) => {
    setRenamingNodeId(nodeId)
    setRenameValue(nodeName)
  }, [setRenamingNodeId, setRenameValue])

  const rootNodes = nodes.filter((n) => n.parentId === null || n.parentId === undefined)

  if (!sidebarOpen) return null

  return (
    <aside className="relative w-1/5 bg-base-100 shadow-sm border-r border-base-300 p-4 flex flex-col min-h-0">
      <button
        className="btn btn-ghost btn-circle btn-sm absolute top-4 right-2 z-10"
        onClick={onClose}
        title="Collapse sidebar"
      >
        <PanelLeftClose className="h-5 w-5" />
      </button>

      <div
        className="mb-4 w-2/3 h-8 bg-base-content shrink-0"
        style={{
          WebkitMaskImage: 'url(https://framerusercontent.com/images/B9AhGiyf4kAw38A0GTWs6qGMPo4.png?scale-down-to=512)',
          maskImage: 'url(https://framerusercontent.com/images/B9AhGiyf4kAw38A0GTWs6qGMPo4.png?scale-down-to=512)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      />

      <label className="input input-sm bg-base-200 flex items-center gap-2 mb-3 shrink-0">
        <Search className="size-4 opacity-50" />
        <input
          type="text"
          className="grow"
          placeholder="Search nodes..."
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
        />
      </label>

      <BreadcrumbNav
        breadcrumbs={breadcrumbs}
        navigateInto={navigateInto}
        onRootClick={handleRootClick}
      />

      <div className="flex flex-col w-full overflow-y-auto min-h-0" style={{ maxHeight: '40%' }}>
        {rootNodes.map((node) => (
          <SidebarTreeNode
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggleExpand={toggleExpand}
            nodeSearch={nodeSearch}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            setSidebarMenu={setSidebarMenu}
            renamingNodeId={renamingNodeId}
            setRenamingNodeId={setRenamingNodeId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
          />
        ))}
        {rootNodes.length === 0 && !addFormOpen && (
          <div className="text-sm opacity-50 text-center py-4">No nodes yet</div>
        )}
      </div>

      {addFormOpen && (
        <AddNodeForm
          variant="sidebar"
          onSubmit={handleAddNode}
          onCancel={() => setAddFormOpen(false)}
        />
      )}

      {!addFormOpen && (
        <button
          className="mt-2 flex items-center gap-2 py-2 px-3 rounded-lg text-sm opacity-50 hover:opacity-100 hover:bg-base-200 transition-all shrink-0 w-full cursor-pointer"
          onClick={() => setAddFormOpen(true)}
        >
          <Plus className="size-4" />
          New node...
        </button>
      )}

      {/* ---- Divider ---- */}
      <div className="border-t border-base-300 my-3 shrink-0" />

      {/* ---- Collaborators ---- */}
      <div className="shrink-0 mb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="breadcrumbs text-sm"><ul><li>Collaborators</li></ul></div>
          <button className="btn btn-ghost btn-xs btn-circle" onClick={openShareModal} title="Invite collaborator">
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-col w-full">
          {users.filter((u) => u.id !== currentUser.id).map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-2 py-1 px-1 rounded-md hover:bg-base-200 ${isOwner ? 'cursor-context-menu' : 'cursor-default'}`}
              onContextMenu={(e) => handleCollaboratorContextMenu(e, u)}
            >
              <div className="avatar online placeholder">
                <div className="w-5 rounded-full">
                  <img src={u.avatar} alt={u.name} />
                </div>
              </div>
              <span className="text-sm truncate flex-1">{u.name}</span>
              <span className={`text-xs opacity-60 ${ROLE_COLOR[u.role] || ''}`}>{ROLE_LABELS[u.role] || u.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Divider ---- */}
      <div className="border-t border-base-300 my-3 shrink-0" />

      {/* ---- Comments Section ---- */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1 shrink-0">
          <div className="breadcrumbs text-sm"><ul><li>Comments</li></ul></div>
        </div>
        <div className="flex items-center justify-between mb-2 shrink-0">
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
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2">
          {filteredComments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
          {filteredComments.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-6 opacity-40">
              <MessageSquare className="size-6 mb-1" />
              <p className="text-xs">No comments yet</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContextMenu
        menu={sidebarMenu}
        onClose={() => setSidebarMenu(null)}
        onRename={handleRename}
      />

      {/* Collaborator right-click context menu */}
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
    </aside>
  )
}

export default Sidebar
