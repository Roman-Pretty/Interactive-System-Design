import { Plus, FolderOpen, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function GraphContextMenu({ contextMenu, onClose, onAddNodeHere, onAddComment, onRename }) {
  const { navigateInto, deleteNode } = useGraph()

  if (!contextMenu) return null

  return (
    <div
      className="absolute bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 min-w-40 z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.type === 'background' && (
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
          onClick={onAddNodeHere}
        >
          <Plus className="size-4" /> Add Node Here
        </button>
      )}
      {contextMenu.type === 'node' && (
        <>
          <div className="px-4 py-1 text-xs font-semibold opacity-50">{contextMenu.nodeName}</div>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
            onClick={() => { navigateInto(contextMenu.nodeId); onClose() }}
          >
            <FolderOpen className="size-4" /> Open
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
            onClick={() => onAddComment(contextMenu.nodeId)}
          >
            <MessageSquare className="size-4" /> Add Comment
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
            onClick={() => onRename(contextMenu.nodeId, contextMenu.nodeName)}
          >
            <Pencil className="size-4" /> Rename
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 text-error"
            onClick={() => { deleteNode(contextMenu.nodeId); onClose() }}
          >
            <Trash2 className="size-4" /> Delete Node
          </button>
        </>
      )}
    </div>
  )
}

export default GraphContextMenu
