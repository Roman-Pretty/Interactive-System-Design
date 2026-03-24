import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, PanelLeftClose } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import BreadcrumbNav from './BreadcrumbNav'
import SidebarTreeNode from './SidebarTreeNode'
import SidebarContextMenu from './SidebarContextMenu'
import AddNodeForm from './AddNodeForm'

function Sidebar({ sidebarOpen, onClose, renamingNodeId, setRenamingNodeId, renameValue, setRenameValue }) {
  const { nodes, currentParentId, breadcrumbs, navigateInto, addNode } = useGraph()

  const [nodeSearch, setNodeSearch] = useState('')
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [sidebarMenu, setSidebarMenu] = useState(null)

  // Close sidebar context menu on any window click
  useEffect(() => {
    const close = () => setSidebarMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

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
        className="btn btn-ghost btn-circle btn-sm absolute top-2 right-2 z-10"
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

      <div className="flex flex-col w-full overflow-y-auto flex-1 min-h-0">
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

      <SidebarContextMenu
        menu={sidebarMenu}
        onClose={() => setSidebarMenu(null)}
        onRename={handleRename}
      />
    </aside>
  )
}

export default Sidebar
