import { FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function SidebarContextMenu({ menu, onClose, onRename }) {
  const { navigateInto, deleteNode } = useGraph()

  if (!menu) return null

  return (
    <div
      className="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 min-w-40 z-50"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-1 text-xs font-semibold opacity-50">{menu.nodeName}</div>
      <button
        className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
        onClick={() => { navigateInto(menu.nodeId); onClose() }}
      >
        <FolderOpen className="size-4" /> Open
      </button>
      <button
        className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
        onClick={() => { onRename(menu.nodeId, menu.nodeName); onClose() }}
      >
        <Pencil className="size-4" /> Rename
      </button>
      <button
        className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 text-error"
        onClick={() => { deleteNode(menu.nodeId); onClose() }}
      >
        <Trash2 className="size-4" /> Delete
      </button>
    </div>
  )
}

export default SidebarContextMenu
