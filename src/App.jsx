import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Navbar from './components/Navbar'
import { Users, X, Filter, Search, Plus, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder, MessageSquare, Send, CheckCircle2, Reply, PanelLeftClose, Pencil } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraph } from './context/GraphContext'
import { AVAILABLE_COLORS } from './data/store'

function App() {
  const {
    nodes, visibleNodes, edges, users,
    addNode, renameNode, deleteNode, addEdge,
    currentParentId, breadcrumbs,
    navigateInto, navigateUp, getChildCount,
    comments, unreadComments,
    addComment, addReply, resolveComment, markCommentRead, removeComment,
    currentUser,
  } = useGraph()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)
  const [nodeSearch, setNodeSearch] = useState('')
  const [isDark, setIsDark] = useState(false)
  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Add node form
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeColor, setNewNodeColor] = useState(AVAILABLE_COLORS[0])

  // Context menu
  const [contextMenu, setContextMenu] = useState(null)
  const [ctxAddForm, setCtxAddForm] = useState(null)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Rename state
  const [renamingNodeId, setRenamingNodeId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  // Sidebar context menu (separate from canvas context menu)
  const [sidebarMenu, setSidebarMenu] = useState(null)

  // Sidebar expanded folders
  const [expanded, setExpanded] = useState(new Set())

  // Figma-style edge drag
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [dragEdge, setDragEdge] = useState(null) // { sourceId }
  const [dragMousePos, setDragMousePos] = useState(null) // { x, y } screen coords
  const [handleScreenPos, setHandleScreenPos] = useState(null) // [{x,y},...] screen coords of 4 handle overlays

  // Comment state
  const [commentFormNodeId, setCommentFormNodeId] = useState(null) // which node is being commented on
  const [commentFormPos, setCommentFormPos] = useState(null) // { x, y } screen position for the comment form
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null) // commentId being replied to
  const [replyText, setReplyText] = useState('')
  const [commentFilter, setCommentFilter] = useState('open') // 'open' | 'resolved' | 'all'
  const [commentTooltipPos, setCommentTooltipPos] = useState(null) // { x, y } stored on hover
  const [pinnedTooltipNodeId, setPinnedTooltipNodeId] = useState(null) // keeps tooltip open when mouse enters it
  const [tooltipReplyingTo, setTooltipReplyingTo] = useState(null) // commentId being replied to in tooltip
  const [tooltipReplyText, setTooltipReplyText] = useState('')
  // Refs for state mirroring and overlay hover tracking
  const hoveredNodeIdRef = useRef(null)
  const dragEdgeRef = useRef(null)
  const dragCompletedRef = useRef(false)
  const hoverScreenPosRef = useRef({ x: 0, y: 0 })
  const pinnedTooltipRef = useRef(null)
  const tooltipHideTimeoutRef = useRef(null)
  const handleHoveredRef = useRef(false)       // is mouse on an HTML handle overlay?
  const handleHideTimeoutRef = useRef(null)     // delay before clearing hovered node
  const graphNodeHoverRef = useRef(null)        // raw hover id from react-force-graph
  hoveredNodeIdRef.current = hoveredNodeId
  dragEdgeRef.current = dragEdge
  pinnedTooltipRef.current = pinnedTooltipNodeId

  const contentColor = isDark ? '#f5f5f5' : '#1a1a1a'

  // Derive graphData from visible nodes + edges between them
  const graphData = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id))
    return {
      nodes: visibleNodes.map((n) => ({ id: n.id, name: n.name, color: n.graphColor })),
      links: edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ source: e.source, target: e.target })),
    }
  }, [visibleNodes, edges])

  // Theme detection
  useEffect(() => {
    const check = () => {
      const checkbox = document.querySelector('.theme-controller')
      if (checkbox) { setIsDark(checkbox.checked); return }
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    }
    check()
    const checkbox = document.querySelector('.theme-controller')
    if (checkbox) checkbox.addEventListener('change', check)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      if (checkbox) checkbox.removeEventListener('change', check)
      observer.disconnect()
    }
  }, [])

  // Resize tracking
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Force graph init
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-500)
      graphRef.current.d3Force('link').distance(200)
      graphRef.current.d3ReheatSimulation()
      setTimeout(() => graphRef.current.zoom(0.95, 500), 500)
    }
  }, [])

  // Close context menus on click
  useEffect(() => {
    const close = () => { setContextMenu(null); setSidebarMenu(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // Escape key cancels edge drag or context form
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dragEdge) { setDragEdge(null); setDragMousePos(null) }
        if (ctxAddForm) { setCtxAddForm(null); setNewNodeName('') }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dragEdge, ctxAddForm])

  // Track handle overlay screen positions via requestAnimationFrame
  useEffect(() => {
    if (!hoveredNodeId || dragEdge) {
      setHandleScreenPos(null)
      return
    }
    const targetId = hoveredNodeId
    let rafId
    let mounted = true
    const update = () => {
      if (!mounted || !graphRef.current) return
      try {
        const data = graphRef.current.graphData()
        const node = data?.nodes.find((n) => n.id === targetId)
        if (node && node.x !== undefined) {
          const r = 20
          const positions = [
            graphRef.current.graph2ScreenCoords(node.x, node.y - r),
            graphRef.current.graph2ScreenCoords(node.x + r, node.y),
            graphRef.current.graph2ScreenCoords(node.x, node.y + r),
            graphRef.current.graph2ScreenCoords(node.x - r, node.y),
          ]
          setHandleScreenPos(positions)
        }
      } catch { /* graph not ready */ }
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => { mounted = false; cancelAnimationFrame(rafId) }
  }, [hoveredNodeId, dragEdge])

  // Window-level mouse listeners for edge drag
  useEffect(() => {
    if (!dragEdge) return
    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDragMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const handleMouseUp = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !graphRef.current) {
        setDragEdge(null); setDragMousePos(null); return
      }
      const gc = graphRef.current.screen2GraphCoords(
        e.clientX - rect.left, e.clientY - rect.top,
      )
      const data = graphRef.current.graphData()
      let targetNode = null
      let minDist = Infinity
      for (const n of (data?.nodes || [])) {
        if (n.id === dragEdge.sourceId) continue
        const dx = gc.x - n.x
        const dy = gc.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 28 && dist < minDist) { minDist = dist; targetNode = n }
      }
      if (targetNode) addEdge(dragEdge.sourceId, targetNode.id)
      setDragEdge(null)
      setDragMousePos(null)
      dragCompletedRef.current = true
      setTimeout(() => { dragCompletedRef.current = false }, 100)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragEdge, addEdge])

  // Set crosshair cursor on canvas during drag
  useEffect(() => {
    if (!dragEdge) return
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) canvas.style.cursor = 'crosshair'
    return () => { if (canvas) canvas.style.cursor = '' }
  }, [dragEdge])

  // Node canvas rendering with Figma-style handles
  const nodeCommentCounts = useMemo(() => {
    const map = {}
    for (const c of comments) {
      if (!c.resolved) map[c.nodeId] = (map[c.nodeId] || 0) + 1
    }
    return map
  }, [comments])

  const nodeCanvasObject = useCallback((node, ctx) => {
    const radius = 20
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = node.color
    ctx.fill()

    // Blue ring when dragging TO this node
    if (dragEdge && dragEdge.sourceId !== node.id && hoveredNodeId === node.id) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Label
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = contentColor
    ctx.fillText(node.name, node.x, node.y + radius + 4)

    // Comment indicator badge (top-right of node)
    const cc = nodeCommentCounts[node.id]
    if (cc) {
      const bx = node.x + radius * 0.7
      const by = node.y - radius * 0.7
      const badgeW = 20
      const badgeH = 12
      const badgeR = 6
      // Rounded rect pill badge
      ctx.beginPath()
      ctx.roundRect(bx - badgeW / 2, by - badgeH / 2, badgeW, badgeH, badgeR)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Chat bubble icon (small speech bubble shape)
      const ix = bx - 4
      const iy = by
      ctx.beginPath()
      ctx.roundRect(ix - 3, iy - 2.5, 5, 4, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      // Small triangle tail
      ctx.beginPath()
      ctx.moveTo(ix - 2, iy + 1.5)
      ctx.lineTo(ix - 3.5, iy + 3)
      ctx.lineTo(ix, iy + 1.5)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      // Count number
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(cc), bx + 3, by)
    }

    // Draw handles on hover
    if (hoveredNodeId === node.id && (!dragEdge || dragEdge.sourceId === node.id)) {
      const hr = 5
      const handles = [
        { x: node.x, y: node.y - radius },
        { x: node.x + radius, y: node.y },
        { x: node.x, y: node.y + radius },
        { x: node.x - radius, y: node.y },
      ]
      handles.forEach((h) => {
        ctx.beginPath()
        ctx.arc(h.x, h.y, hr, 0, 2 * Math.PI)
        ctx.fillStyle = '#3b82f6'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }
  }, [contentColor, hoveredNodeId, dragEdge, nodeCommentCounts])

  // --- Handlers ---
  const handleSidebarAdd = (e) => {
    e.preventDefault()
    if (!newNodeName.trim()) return
    addNode(newNodeName.trim(), newNodeColor, currentParentId)
    setNewNodeName('')
    setNewNodeColor(AVAILABLE_COLORS[0])
    setAddFormOpen(false)
  }

  // Zoom to a specific node (used by notifications)
  const zoomToNode = useCallback((nodeId) => {
    if (!graphRef.current) return
    // First, make sure the node is visible — navigate to its parent level
    const targetNode = nodes.find((n) => n.id === nodeId)
    if (targetNode) {
      const parentId = targetNode.parentId || null
      if (parentId !== currentParentId) {
        navigateInto(parentId)
      }
    }
    // Wait a tick for graph data to update, then zoom
    setTimeout(() => {
      const data = graphRef.current?.graphData()
      const gNode = data?.nodes.find((n) => n.id === nodeId)
      if (gNode && gNode.x !== undefined) {
        graphRef.current.centerAt(gNode.x, gNode.y, 500)
        graphRef.current.zoom(2.5, 500)
      }
    }, 200)
  }, [nodes, currentParentId, navigateInto])

  const handleCtxAdd = (e) => {
    e.preventDefault()
    if (!ctxAddForm || !newNodeName.trim()) return
    addNode(newNodeName.trim(), newNodeColor, currentParentId)
    setNewNodeName('')
    setNewNodeColor(AVAILABLE_COLORS[0])
    setCtxAddForm(null)
  }

  const handleBackgroundRightClick = useCallback((event) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      type: 'background',
    })
  }, [])

  const handleNodeRightClick = useCallback((node, event) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      type: 'node',
      nodeId: node.id,
      nodeName: node.name,
    })
  }, [])

  const handleNodeHover = useCallback((node) => {
    graphNodeHoverRef.current = node ? node.id : null

    // During drag, update immediately for blue ring target indicator
    if (dragEdgeRef.current) {
      setHoveredNodeId(node ? node.id : null)
      return
    }

    if (node) {
      // Cancel any pending hide timeouts
      if (handleHideTimeoutRef.current) {
        clearTimeout(handleHideTimeoutRef.current)
        handleHideTimeoutRef.current = null
      }
      if (tooltipHideTimeoutRef.current) {
        clearTimeout(tooltipHideTimeoutRef.current)
        tooltipHideTimeoutRef.current = null
      }
      setHoveredNodeId(node.id)
      const pos = hoverScreenPosRef.current
      setCommentTooltipPos({ x: pos.x + 24, y: pos.y - 12 })
    } else {
      // Delay clearing so handle/tooltip overlays can catch the mouse
      handleHideTimeoutRef.current = setTimeout(() => {
        if (!handleHoveredRef.current) {
          setHoveredNodeId(null)
        }
        handleHideTimeoutRef.current = null
      }, 300)
      if (!pinnedTooltipRef.current) {
        tooltipHideTimeoutRef.current = setTimeout(() => {
          setCommentTooltipPos(null)
          tooltipHideTimeoutRef.current = null
        }, 800)
      }
    }
  }, [])

  const handleNodeClick = useCallback((node) => {
    // If a drag connection was just completed via mouseup, skip navigation
    if (dragCompletedRef.current) return
    // Safety: if still in drag mode, complete it
    if (dragEdge) {
      if (node.id !== dragEdge.sourceId) {
        addEdge(dragEdge.sourceId, node.id)
      }
      setDragEdge(null)
      setDragMousePos(null)
      return
    }
    navigateInto(node.id)
  }, [dragEdge, addEdge, navigateInto])

  const handleBackgroundClick = useCallback(() => {
    if (dragEdge) {
      setDragEdge(null)
      setDragMousePos(null)
    }
  }, [dragEdge])

  // Toggle tree expansion
  const toggleExpand = (nodeId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  // Compute drag line in screen coords
  let dragLine = null
  if (dragEdge && dragMousePos && graphRef.current) {
    try {
      const data = graphRef.current.graphData()
      const src = data?.nodes.find((n) => n.id === dragEdge.sourceId)
      if (src && src.x !== undefined) {
        const sp = graphRef.current.graph2ScreenCoords(src.x, src.y)
        dragLine = { x1: sp.x, y1: sp.y, x2: dragMousePos.x, y2: dragMousePos.y }
      }
    } catch { /* graph not ready */ }
  }

  // Recursive tree node renderer
  const renderTreeNode = (node, depth = 0) => {
    const childCount = getChildCount(node.id)
    const isExpanded = expanded.has(node.id)
    const isCurrentLevel = node.id === currentParentId
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
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1 py-1 px-1 rounded-md hover:bg-base-200 cursor-pointer ${isCurrentLevel ? 'bg-base-200 font-semibold' : ''}`}
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

          {/* Icon: folder if has children, colored circle if leaf */}
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
              onClick={() => navigateInto(node.id)}
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
            <span>Delete "{node.name}"?</span>
            <div className="flex gap-1 ml-2 shrink-0">
              <button className="btn btn-error btn-xs" onClick={() => { deleteNode(node.id); setConfirmDelete(null) }}>Yes</button>
              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDelete(null)}>No</button>
            </div>
          </div>
        )}

        {isExpanded && children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    )
  }

  const rootNodes = nodes.filter((n) => n.parentId === null || n.parentId === undefined)

  return (
    <div className="flex h-screen">
      {/* ========= SIDEBAR ========= */}
      {sidebarOpen && <aside className="relative w-1/5 bg-base-100 shadow-sm border-r border-base-300 p-4 flex flex-col min-h-0">
        <button
          className="btn btn-ghost btn-circle btn-sm absolute top-2 right-2 z-10"
          onClick={() => setSidebarOpen(false)}
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

        {/* Breadcrumb navigation */}
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <a className="cursor-pointer" onClick={() => navigateInto(null) || setExpanded(new Set())}>Root</a>
            </li>
            {breadcrumbs.map((bc, i) => (
              <li key={bc.id}>
                {i === breadcrumbs.length - 1 ? (
                  bc.name
                ) : (
                  <a className="cursor-pointer" onClick={() => navigateInto(bc.id)}>{bc.name}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Folder Tree */}
        <div className="flex flex-col w-full overflow-y-auto flex-1 min-h-0">
          {rootNodes.map((node) => renderTreeNode(node, 0))}
          {rootNodes.length === 0 && !addFormOpen && (
            <div className="text-sm opacity-50 text-center py-4">No nodes yet</div>
          )}
        </div>

        {/* Inline Add Node Form */}
        {addFormOpen && (
          <form onSubmit={handleSidebarAdd} className="bg-base-200 rounded-lg p-3 mt-2 flex flex-col gap-2 shrink-0">
            <input
              type="text"
              className="input input-sm w-full"
              placeholder="Node name"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full ${c} ${newNodeColor === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  onClick={() => setNewNodeColor(c)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1" disabled={!newNodeName.trim()}>
                Add
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Add node button at bottom */}
        {!addFormOpen && (
          <button
            className="mt-2 flex items-center gap-2 py-2 px-3 rounded-lg text-sm opacity-50 hover:opacity-100 hover:bg-base-200 transition-all shrink-0 w-full cursor-pointer"
            onClick={() => setAddFormOpen(true)}
          >
            <Plus className="size-4" />
            New node...
          </button>
        )}

        {/* ---- Sidebar Context Menu ---- */}
        {sidebarMenu && (
          <div
            className="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 min-w-40 z-50"
            style={{ left: sidebarMenu.x, top: sidebarMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-1 text-xs font-semibold opacity-50">{sidebarMenu.nodeName}</div>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
              onClick={() => { navigateInto(sidebarMenu.nodeId); setSidebarMenu(null) }}
            >
              <FolderOpen className="size-4" /> Open
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
              onClick={() => {
                setRenamingNodeId(sidebarMenu.nodeId)
                setRenameValue(sidebarMenu.nodeName)
                setSidebarMenu(null)
              }}
            >
              <Pencil className="size-4" /> Rename
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 text-error"
              onClick={() => { deleteNode(sidebarMenu.nodeId); setSidebarMenu(null) }}
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        )}
      </aside>}

      {/* ========= MAIN PANEL ========= */}
      <div className="flex-1 flex flex-col min-h-0">
        <Navbar onZoomToNode={zoomToNode} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main
          ref={containerRef}
          className="flex-1 bg-base-200 relative overflow-hidden min-h-0"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            cursor: dragEdge ? 'crosshair' : undefined,
          }}
          onContextMenu={handleBackgroundRightClick}
          onMouseMove={(e) => {
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) hoverScreenPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
          }}
        >
          {/* Back button when inside a node */}
          {currentParentId && (
            <button
              className="absolute top-3 left-3 z-10 btn btn-sm btn-ghost bg-base-100/80 backdrop-blur"
              onClick={navigateUp}
            >
              <ChevronRight className="size-4 rotate-180" />
              Back
            </button>
          )}

          {/* Edge drag status bar */}
          {dragEdge && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-base-100/90 backdrop-blur rounded-lg px-4 py-2 text-sm shadow flex items-center gap-2">
              <span className="opacity-60">Click a node to connect, or</span>
              <button className="btn btn-ghost btn-xs" onClick={() => { setDragEdge(null); setDragMousePos(null) }}>Cancel</button>
            </div>
          )}

          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            onRenderFramePre={(ctx) => {
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            }}
            nodeCanvasObject={nodeCanvasObject}
            nodeLabel={() => ''}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath()
              ctx.arc(node.x, node.y, 34, 0, 2 * Math.PI)
              ctx.fillStyle = color
              ctx.fill()
            }}
            linkColor={() => contentColor}
            linkWidth={2}
            cooldownTicks={100}
            enableZoomInteraction={true}
            enableNodeDrag={!dragEdge}
            enablePanInteraction={!dragEdge}
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeRightClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
          />

          {/* SVG overlay for drag line */}
          {dragLine && (
            <svg className="absolute inset-0 pointer-events-none z-20" width="100%" height="100%">
              <line
                x1={dragLine.x1} y1={dragLine.y1}
                x2={dragLine.x2} y2={dragLine.y2}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6,4"
              />
            </svg>
          )}

          {/* HTML handle overlays for edge dragging */}
          {handleScreenPos && !dragEdge && handleScreenPos.map((pos, i) => (
            <div
              key={i}
              className="absolute z-30"
              style={{
                left: pos.x - 12,
                top: pos.y - 12,
                width: 24,
                height: 24,
                cursor: 'crosshair',
                borderRadius: '50%',
              }}
              onMouseEnter={() => {
                handleHoveredRef.current = true
                if (handleHideTimeoutRef.current) {
                  clearTimeout(handleHideTimeoutRef.current)
                  handleHideTimeoutRef.current = null
                }
              }}
              onMouseLeave={() => {
                handleHoveredRef.current = false
                setTimeout(() => {
                  if (!handleHoveredRef.current && !graphNodeHoverRef.current) {
                    setHoveredNodeId(null)
                    setHandleScreenPos(null)
                  }
                }, 150)
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const targetId = hoveredNodeIdRef.current
                if (!targetId) return
                const rect = containerRef.current.getBoundingClientRect()
                setDragEdge({ sourceId: targetId })
                setDragMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
            />
          ))}

          {/* ---- Graph Context Menu ---- */}
          {contextMenu && (
            <div
              className="absolute bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 min-w-40 z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {contextMenu.type === 'background' && (
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                  onClick={() => {
                    setCtxAddForm({ x: contextMenu.x, y: contextMenu.y })
                    setContextMenu(null)
                  }}
                >
                  <Plus className="size-4" /> Add Node Here
                </button>
              )}
              {contextMenu.type === 'node' && (
                <>
                  <div className="px-4 py-1 text-xs font-semibold opacity-50">{contextMenu.nodeName}</div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                    onClick={() => { navigateInto(contextMenu.nodeId); setContextMenu(null) }}
                  >
                    <FolderOpen className="size-4" /> Open
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                    onClick={() => {
                      setCommentFormNodeId(contextMenu.nodeId)
                      setCommentFormPos({ x: contextMenu.x, y: contextMenu.y })
                      setCommentText('')
                      setContextMenu(null)
                    }}
                  >
                    <MessageSquare className="size-4" /> Add Comment
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
                    onClick={() => {
                      setRenamingNodeId(contextMenu.nodeId)
                      setRenameValue(contextMenu.nodeName)
                      setContextMenu(null)
                    }}
                  >
                    <Pencil className="size-4" /> Rename
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 text-error"
                    onClick={() => { deleteNode(contextMenu.nodeId); setContextMenu(null) }}
                  >
                    <Trash2 className="size-4" /> Delete Node
                  </button>
                </>
              )}
            </div>
          )}

          {/* ---- Context-menu Add Node popover ---- */}
          {ctxAddForm && (
            <div
              className="absolute bg-base-100 rounded-lg shadow-xl border border-base-300 p-3 z-50 w-64"
              style={{ left: ctxAddForm.x, top: ctxAddForm.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCtxAdd} className="flex flex-col gap-2">
                <input
                  type="text"
                  className="input input-sm w-full"
                  placeholder="Node name"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-5 h-5 rounded-full ${c} ${newNodeColor === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                      onClick={() => setNewNodeColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary btn-xs flex-1" disabled={!newNodeName.trim()}>Add</button>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setCtxAddForm(null); setNewNodeName('') }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* ---- Comment Form Popover (positioned near context menu) ---- */}
          {commentFormNodeId && commentFormPos && (
            <div
              className="absolute bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 p-4 z-50 w-80"
              style={{ left: commentFormPos.x, top: commentFormPos.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center">
                  <MessageSquare className="size-3.5 text-warning" />
                </div>
                <div>
                  <span className="text-sm font-semibold leading-tight block">
                    Add comment
                  </span>
                  <span className="text-xs opacity-50">
                    {nodes.find((n) => n.id === commentFormNodeId)?.name}
                  </span>
                </div>
              </div>
              <textarea
                className="textarea textarea-sm w-full min-h-20 bg-base-200/50 border-base-300 focus:border-warning/50 focus:outline-none"
                placeholder="Write a comment..."
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setCommentFormNodeId(null); setCommentFormPos(null); setCommentText('') }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-warning btn-sm gap-1.5 text-warning-content"
                  disabled={!commentText.trim()}
                  onClick={() => {
                    addComment(commentFormNodeId, commentText.trim())
                    setCommentFormNodeId(null)
                    setCommentFormPos(null)
                    setCommentText('')
                  }}
                >
                  <Send className="size-3.5" /> Post
                </button>
              </div>
            </div>
          )}

          {/* ---- Comment Bubbles next to cursor on hover ---- */}
          {(hoveredNodeId || pinnedTooltipNodeId) && commentTooltipPos && !dragEdge && !commentFormNodeId && (() => {
            const targetNodeId = pinnedTooltipNodeId || hoveredNodeId
            const nodeComments = comments.filter((c) => c.nodeId === targetNodeId && !c.resolved)
            if (nodeComments.length === 0) {
              // All comments resolved/gone — clean up pinned state
              if (pinnedTooltipNodeId) {
                setTimeout(() => {
                  setPinnedTooltipNodeId(null)
                  setCommentTooltipPos(null)
                  setTooltipReplyingTo(null)
                  setTooltipReplyText('')
                }, 0)
              }
              return null
            }
            return (
              <div
                className="absolute z-40 pointer-events-none"
                style={{ left: commentTooltipPos.x - 40, top: commentTooltipPos.y - 40, padding: 40 }}
              >
              <div
                className="pointer-events-auto bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 p-4 w-80 max-h-80 overflow-y-auto"
                onMouseEnter={() => {
                  if (tooltipHideTimeoutRef.current) {
                    clearTimeout(tooltipHideTimeoutRef.current)
                    tooltipHideTimeoutRef.current = null
                  }
                  setPinnedTooltipNodeId(targetNodeId)
                }}
                onMouseLeave={() => {
                  setPinnedTooltipNodeId(null)
                  setCommentTooltipPos(null)
                  setTooltipReplyingTo(null)
                  setTooltipReplyText('')
                }}
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
                        {/* Inline reply form */}
                        {tooltipReplyingTo === c.id ? (
                          <div className="ml-7 mt-2 flex gap-1">
                            <input
                              type="text"
                              className="input input-xs flex-1 bg-base-100 border-base-300 focus:border-warning/50 focus:outline-none"
                              placeholder="Reply..."
                              value={tooltipReplyText}
                              onChange={(e) => setTooltipReplyText(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && tooltipReplyText.trim()) {
                                  addReply(c.id, tooltipReplyText.trim())
                                  setTooltipReplyText('')
                                  setTooltipReplyingTo(null)
                                }
                                if (e.key === 'Escape') { setTooltipReplyingTo(null); setTooltipReplyText('') }
                              }}
                            />
                            <button
                              className="btn btn-warning btn-xs"
                              disabled={!tooltipReplyText.trim()}
                              onClick={() => {
                                addReply(c.id, tooltipReplyText.trim())
                                setTooltipReplyText('')
                                setTooltipReplyingTo(null)
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
                              onClick={() => { setTooltipReplyingTo(c.id); setTooltipReplyText('') }}
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
          })()}

          {/* ---- FAB (Collaboration panel) ---- */}
          {fabOpen && (
            <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-6 right-6 z-40">
            {fabOpen && (
              <div className="absolute bottom-16 right-0 bg-base-100 rounded-2xl shadow-xl w-96 mb-2 flex flex-col" style={{ height: '70vh', maxHeight: '680px', minHeight: '420px' }}>
                {/* Collaborators — compact top section */}
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

                {/* Comments — scrollable main section */}
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
                    {comments
                      .filter((c) => {
                        if (commentFilter === 'open') return !c.resolved
                        if (commentFilter === 'resolved') return c.resolved
                        return true
                      })
                      .map((c) => {
                        const author = users.find((u) => u.id === c.authorId)
                        const nodeName = nodes.find((n) => n.id === c.nodeId)?.name || 'Unknown'
                        return (
                          <div key={c.id} className={`bg-base-200 rounded-xl p-4 ${c.resolved ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="avatar">
                                  <div className="w-8 rounded-full">
                                    <img src={author?.avatar} alt={author?.name} />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">{author?.name}</p>
                                  <p className="text-xs opacity-50 mt-0.5">{nodeName} &middot; {new Date(c.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <button
                                className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
                                onClick={() => removeComment(c.id)}
                                title="Delete comment"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                            <p className="text-sm leading-relaxed mt-3">{c.text}</p>

                            {/* Replies */}
                            {c.replies.length > 0 && (
                              <div className="mt-3 border-t border-base-300 pt-3 flex flex-col gap-3">
                                {c.replies.map((r) => {
                                  const ra = users.find((u) => u.id === r.authorId)
                                  return (
                                    <div key={r.id} className="flex items-start gap-2 pl-2">
                                      <div className="avatar">
                                        <div className="w-6 rounded-full">
                                          <img src={ra?.avatar} alt={ra?.name} />
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold">{ra?.name}</span>
                                        <p className="text-xs leading-relaxed">{r.text}</p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Reply form */}
                            {replyingTo === c.id ? (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  className="input input-sm flex-1"
                                  placeholder="Write a reply..."
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
                                  className="btn btn-primary btn-sm"
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
                              !c.resolved && (
                                <div className="flex justify-end gap-2 mt-3">
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
                              )
                            )}
                          </div>
                        )
                      })}
                    {comments.filter((c) => commentFilter === 'open' ? !c.resolved : commentFilter === 'resolved' ? c.resolved : true).length === 0 && (
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
        </main>
      </div>
    </div>
  )
}

export default App
