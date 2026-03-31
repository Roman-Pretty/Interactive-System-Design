import { ChevronRight, ChevronDown, FolderOpen, Folder, Trash2 } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function SidebarTreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  nodeSearch,
  confirmDelete,
  setConfirmDelete,
  setSidebarMenu,
  renamingNodeId,
  setRenamingNodeId,
  renameValue,
  setRenameValue,
}) {
  const { nodes, currentParentId, navigateInto, getChildCount, renameNode, deleteNode, selectedNodeIds, selectNode, toggleSelectNode } = useGraph()

  const childCount = getChildCount(node.id)
  const isExpanded = expanded.has(node.id)
  const isCurrentLevel = node.id === currentParentId
  const isSelected = selectedNodeIds.has(node.id)
  const children = childCount > 0 && isExpanded
    ? nodes.filter((n) => n.parentId === node.id)
    : []

  if (nodeSearch && !node.name.toLowerCase().includes(nodeSearch.toLowerCase())) {
    const hasMatchingChild = nodes.some(
      (n) => n.parentId === node.id && n.name.toLowerCase().includes(nodeSearch.toLowerCase()),
    )
    if (!hasMatchingChild) return null
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-1 px-1 rounded-md hover:bg-base-200 cursor-pointer ${isCurrentLevel ? 'bg-base-200 font-semibold' : ''} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setSidebarMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, nodeName: node.name })
        }}
      >
        <button
          className="btn btn-ghost btn-xs btn-circle shrink-0"
          onClick={() => childCount > 0 && toggleExpand(node.id)}
        >
          {childCount > 0 ? (
            isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            <span className="size-3.5" />
          )}
        </button>

        {childCount > 0 ? (
          isExpanded
            ? <FolderOpen className="size-4 shrink-0" style={{ color: node.graphColor }} />
            : <Folder className="size-4 shrink-0" style={{ color: node.graphColor }} />
        ) : (
          <span
            className="size-3 rounded-full shrink-0 inline-block"
            style={{ backgroundColor: node.graphColor }}
          />
        )}

        {renamingNodeId === node.id ? (
          <input
            className="input input-xs text-sm flex-1 min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameValue.trim()) {
                renameNode(node.id, renameValue.trim())
                setRenamingNodeId(null)
                setRenameValue('')
              }
              if (e.key === 'Escape') { setRenamingNodeId(null); setRenameValue('') }
            }}
            onBlur={() => {
              if (renameValue.trim()) renameNode(node.id, renameValue.trim())
              setRenamingNodeId(null)
              setRenameValue('')
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm truncate flex-1"
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) toggleSelectNode(node.id)
              else selectNode(node.id)
            }}
            onDoubleClick={() => navigateInto(node.id)}
            title={node.name}
          >
            {node.name}
          </span>
        )}

        {childCount > 0 && (
          <span className="text-xs opacity-40 shrink-0">{childCount}</span>
        )}

        <button
          className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(confirmDelete === node.id ? null : node.id) }}
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {confirmDelete === node.id && (
        <div
          className="bg-base-200 rounded-md p-2 mx-1 mt-0.5 flex items-center justify-between text-xs"
          style={{ marginLeft: `${depth * 16 + 4}px` }}
        >
          <span>Delete &quot;{node.name}&quot;?</span>
          <div className="flex gap-1 ml-2 shrink-0">
            <button className="btn btn-error btn-xs" onClick={() => { deleteNode(node.id); setConfirmDelete(null) }}>Yes</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDelete(null)}>No</button>
          </div>
        </div>
      )}

      {isExpanded && children.map((child) => (
        <SidebarTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
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
    </div>
  )
}

export default SidebarTreeNode
