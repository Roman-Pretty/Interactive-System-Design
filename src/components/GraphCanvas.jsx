import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraph } from '../context/GraphContext'
import EdgeDragStatusBar from './EdgeDragStatusBar'
import DragLineOverlay from './DragLineOverlay'
import HandleOverlays from './HandleOverlays'
import GraphContextMenu from './GraphContextMenu'
import ContextAddNodeForm from './ContextAddNodeForm'
import CommentFormPopover from './CommentFormPopover'
import CommentTooltip from './CommentTooltip'

function GraphCanvas({ graphRef, isDark, onStartRename, highlightedNodeId, onClearHighlight }) {
  const {
    nodes, visibleNodes, edges, comments,
    currentParentId, navigateInto, navigateUp,
    addEdge, deleteNode,
    selectedNodeIds, selectNode, toggleSelectNode, clearSelection,
    pendingResolveIds,
  } = useGraph()

  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Context menu
  const [contextMenu, setContextMenu] = useState(null)
  const [ctxAddForm, setCtxAddForm] = useState(null)

  // Figma-style edge drag
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [hoveredHandle, setHoveredHandle] = useState(null) // { nodeId, index }
  const [dragEdge, setDragEdge] = useState(null) // { sourceId, sourceX, sourceY }
  const [dragMousePos, setDragMousePos] = useState(null)
  const [handleScreenPos, setHandleScreenPos] = useState(null)

  // Comment state
  const [commentFormNodeId, setCommentFormNodeId] = useState(null)
  const [commentFormPos, setCommentFormPos] = useState(null)
  const [commentTooltipPos, setCommentTooltipPos] = useState(null)
  const [pinnedTooltipNodeId, setPinnedTooltipNodeId] = useState(null)

  const hoveredNodeIdRef = useRef(null)
  const dragEdgeRef = useRef(null)
  const dragCompletedRef = useRef(false)
  const hoverScreenPosRef = useRef({ x: 0, y: 0 })
  const handleHoveredRef = useRef(false)
  const handleHideTimeoutRef = useRef(null)
  const graphNodeHoverRef = useRef(null)
  const lastClickRef = useRef({ nodeId: null, time: 0 })
  hoveredNodeIdRef.current = hoveredNodeId
  dragEdgeRef.current = dragEdge

  const contentColor = isDark ? '#f5f5f5' : '#1a1a1a'

  // Derive graphData
  const graphData = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id))
    return {
      nodes: visibleNodes.map((n) => ({ id: n.id, name: n.name, color: n.graphColor })),
      links: edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ source: e.source, target: e.target })),
    }
  }, [visibleNodes, edges])

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
  }, [graphRef])

  // Close context menus on click
  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => () => {
    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dragEdge) {
          setDragEdge(null)
          setDragMousePos(null)
          setHoveredHandle(null)
        }
        else if (ctxAddForm) setCtxAddForm(null)
        else clearSelection()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.size > 0) {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
        e.preventDefault()
        for (const id of selectedNodeIds) deleteNode(id)
        clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dragEdge, ctxAddForm, clearSelection, selectedNodeIds, deleteNode])

  // Track handle overlay screen positions while a node is hovered.
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
        const node = data?.nodes.find((graphNode) => graphNode.id === targetId)

        if (node && node.x !== undefined) {
          const radius = 20
          setHandleScreenPos([
            graphRef.current.graph2ScreenCoords(node.x, node.y - radius),
            graphRef.current.graph2ScreenCoords(node.x + radius, node.y),
            graphRef.current.graph2ScreenCoords(node.x, node.y + radius),
            graphRef.current.graph2ScreenCoords(node.x - radius, node.y),
          ])
        }
      } catch {
        // ForceGraph can remount while resizing; skip this frame.
      }

      rafId = requestAnimationFrame(update)
    }

    rafId = requestAnimationFrame(update)

    return () => {
      mounted = false
      cancelAnimationFrame(rafId)
    }
  }, [hoveredNodeId, dragEdge, graphRef])

  // Window-level pointer listeners keep the drag active even if the cursor leaves the canvas.
  useEffect(() => {
    if (!dragEdge) return

    const handlePointerMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      setDragMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    const finishDrag = (e, cancelled = false) => {
      const rect = containerRef.current?.getBoundingClientRect()

      if (!cancelled && rect && graphRef.current) {
        const graphPoint = graphRef.current.screen2GraphCoords(
          e.clientX - rect.left,
          e.clientY - rect.top,
        )
        const data = graphRef.current.graphData()
        let targetNode = null
        let minDist = Infinity

        for (const node of (data?.nodes || [])) {
          if (node.id === dragEdge.sourceId) continue

          const dx = graphPoint.x - node.x
          const dy = graphPoint.y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 30 && dist < minDist) {
            minDist = dist
            targetNode = node
          }
        }

        if (targetNode) {
          addEdge(dragEdge.sourceId, targetNode.id)
        }

        dragCompletedRef.current = true
        setTimeout(() => {
          dragCompletedRef.current = false
        }, 100)
      }

      handleHoveredRef.current = false
      setDragEdge(null)
      setDragMousePos(null)
      setHoveredHandle(null)
    }

    const handlePointerUp = (e) => finishDrag(e)
    const handlePointerCancel = (e) => finishDrag(e, true)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [dragEdge, addEdge, graphRef])

  // Animate highlight ring
  const [highlightTick, setHighlightTick] = useState(0)
  useEffect(() => {
    if (!highlightedNodeId) return
    const id = setInterval(() => setHighlightTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [highlightedNodeId])

  // Auto-open comment tooltip on highlight
  useEffect(() => {
    if (!highlightedNodeId || !graphRef.current) return
    const openTooltip = () => {
      const data = graphRef.current?.graphData()
      const gNode = data?.nodes.find((n) => n.id === highlightedNodeId)
      if (gNode && gNode.x !== undefined) {
        const sp = graphRef.current.graph2ScreenCoords(gNode.x, gNode.y)
        setPinnedTooltipNodeId(highlightedNodeId)
        setCommentTooltipPos({ x: sp.x + 24, y: sp.y - 12 })
      }
    }
    const timer = setTimeout(openTooltip, 750)
    return () => clearTimeout(timer)
  }, [highlightedNodeId, graphRef])

  // Node comment counts
  const nodeCommentCounts = useMemo(() => {
    const map = {}
    for (const c of comments) {
      if (!c.resolved && !pendingResolveIds.has(c.id)) map[c.nodeId] = (map[c.nodeId] || 0) + 1
    }
    return map
  }, [comments, pendingResolveIds])

  // Descendant comment counts for visible nodes
  const nodeDescendantCommentCounts = useMemo(() => {
    const map = {}
    for (const vn of visibleNodes) {
      const descendantIds = new Set()
      const queue = [vn.id]
      while (queue.length) {
        const pid = queue.shift()
        for (const n of nodes) {
          if (n.parentId === pid) {
            descendantIds.add(n.id)
            queue.push(n.id)
          }
        }
      }
      let count = 0
      for (const c of comments) {
        if (descendantIds.has(c.nodeId) && !c.resolved && !pendingResolveIds.has(c.id)) count++
      }
      if (count > 0) map[vn.id] = count
    }
    return map
  }, [nodes, visibleNodes, comments, pendingResolveIds])

  // ─── Node canvas rendering ───
  const nodeCanvasObject = useCallback((node, ctx) => {
    const radius = 20

    // Pulsing highlight ring
    if (highlightedNodeId === node.id) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300)
      const outerR = radius + 8 + pulse * 4
      ctx.beginPath()
      ctx.arc(node.x, node.y, outerR, 0, 2 * Math.PI)
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + pulse * 0.4})`
      ctx.lineWidth = 3
      ctx.stroke()
      const innerR = radius + 3
      ctx.beginPath()
      ctx.arc(node.x, node.y, innerR, 0, 2 * Math.PI)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = node.color
    ctx.fill()

    // Selection ring
    if (selectedNodeIds.has(node.id)) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Blue ring when dragging TO this node
    if (dragEdge && dragEdge.sourceId !== node.id && hoveredNodeId === node.id) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
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

    // Comment badge (own comments)
    const cc = nodeCommentCounts[node.id]
    if (cc) {
      const bx = node.x + radius * 0.7
      const by = node.y - radius * 0.7
      ctx.beginPath()
      ctx.roundRect(bx - 10, by - 6, 20, 12, 6)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const ix = bx - 4
      ctx.beginPath()
      ctx.roundRect(ix - 3, by - 2.5, 5, 4, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(ix - 2, by + 1.5)
      ctx.lineTo(ix - 3.5, by + 3)
      ctx.lineTo(ix, by + 1.5)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(cc), bx + 3, by)
    }

    // Descendant comment badge (grayed, comment icon, reduced opacity)
    const dc = nodeDescendantCommentCounts[node.id]
    if (dc) {
      const dbx = node.x + radius * 0.7
      const dby = node.y - radius * 0.7 + (cc ? 14 : 0)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(dbx - 10, dby - 6, 20, 12, 6)
      ctx.fillStyle = '#6b7280'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Comment bubble icon (same as own badge)
      const ix = dbx - 4
      ctx.beginPath()
      ctx.roundRect(ix - 3, dby - 2.5, 5, 4, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(ix - 2, dby + 1.5)
      ctx.lineTo(ix - 3.5, dby + 3)
      ctx.lineTo(ix, dby + 1.5)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(dc), dbx + 3, dby)
      ctx.restore()
    }

    // Handles on hover — grow the one the mouse is over
    const showHandles = (hoveredNodeId === node.id && !dragEdge)
      || (dragEdge && dragEdge.sourceId === node.id)
    if (showHandles) {
      const handles = [
        { x: node.x, y: node.y - radius },
        { x: node.x + radius, y: node.y },
        { x: node.x, y: node.y + radius },
        { x: node.x - radius, y: node.y },
      ]
      handles.forEach((h, i) => {
        const isHovered = hoveredHandle && hoveredHandle.nodeId === node.id && hoveredHandle.index === i
        const hr = isHovered ? 8 : 5
        ctx.beginPath()
        ctx.arc(h.x, h.y, hr, 0, 2 * Math.PI)
        ctx.fillStyle = '#3b82f6'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }
  }, [contentColor, hoveredNodeId, hoveredHandle, dragEdge, nodeCommentCounts, nodeDescendantCommentCounts, highlightedNodeId, highlightTick, selectedNodeIds])

  // ─── Handlers ───
  const handleBackgroundRightClick = useCallback((event) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, type: 'background' })
  }, [])

  const handleNodeRightClick = useCallback((node, event) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, type: 'node', nodeId: node.id, nodeName: node.name })
  }, [])

  const handleNodeHover = useCallback((node) => {
    graphNodeHoverRef.current = node ? node.id : null

    if (dragEdgeRef.current) {
      setHoveredNodeId(node ? node.id : null)
      return
    }

    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
      handleHideTimeoutRef.current = null
    }

    if (node) {
      setHoveredNodeId(node.id)
    } else {
      handleHideTimeoutRef.current = setTimeout(() => {
        if (!handleHoveredRef.current) {
          setHoveredNodeId(null)
          setHoveredHandle(null)
        }
        handleHideTimeoutRef.current = null
      }, 150)
    }
  }, [])

  const handleNodeClick = useCallback((node, event) => {
    if (dragCompletedRef.current) return
    if (highlightedNodeId) onClearHighlight()
    const now = Date.now()
    const last = lastClickRef.current
    if (last.nodeId === node.id && now - last.time < 350) {
      lastClickRef.current = { nodeId: null, time: 0 }
      navigateInto(node.id)
    } else {
      lastClickRef.current = { nodeId: node.id, time: now }
      if (event.ctrlKey || event.metaKey) toggleSelectNode(node.id)
      else selectNode(node.id)
      const nodeHasComments = comments.some((c) => c.nodeId === node.id && !c.resolved && !pendingResolveIds.has(c.id))
      if (nodeHasComments) {
        const pos = hoverScreenPosRef.current
        setPinnedTooltipNodeId(node.id)
        setCommentTooltipPos({ x: pos.x + 24, y: pos.y - 12 })
      } else {
        setPinnedTooltipNodeId(null)
        setCommentTooltipPos(null)
      }
    }
  }, [navigateInto, selectNode, toggleSelectNode, highlightedNodeId, onClearHighlight, comments])

  const handleBackgroundClick = useCallback(() => {
    if (highlightedNodeId) onClearHighlight()
    clearSelection()
    setPinnedTooltipNodeId(null)
    setCommentTooltipPos(null)
    if (dragEdge) {
      setDragEdge(null)
      setDragMousePos(null)
      setHoveredHandle(null)
    }
  }, [dragEdge, highlightedNodeId, onClearHighlight, clearSelection])

  const handleHandleMouseEnter = useCallback((index) => {
    handleHoveredRef.current = true
    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
      handleHideTimeoutRef.current = null
    }
    const nodeId = hoveredNodeIdRef.current
    if (nodeId) {
      setHoveredHandle({ nodeId, index })
    }
  }, [])

  const handleHandleMouseLeave = useCallback(() => {
    handleHoveredRef.current = false
    setHoveredHandle(null)

    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
    }

    handleHideTimeoutRef.current = setTimeout(() => {
      if (!handleHoveredRef.current && !graphNodeHoverRef.current) {
        setHoveredNodeId(null)
        setHandleScreenPos(null)
      }
      handleHideTimeoutRef.current = null
    }, 120)
  }, [])

  const handleHandlePointerDown = useCallback((e, index, position) => {
    if (e.button !== 0) return

    e.stopPropagation()
    e.preventDefault()

    const targetId = hoveredNodeIdRef.current
    const rect = containerRef.current?.getBoundingClientRect()

    if (!targetId || !rect) return

    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
      handleHideTimeoutRef.current = null
    }

    setHoveredHandle({ nodeId: targetId, index })
    setDragEdge({ sourceId: targetId, sourceX: position.x, sourceY: position.y })
    setDragMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  // Drag line
  const dragLine = dragEdge && dragMousePos
    ? { x1: dragEdge.sourceX, y1: dragEdge.sourceY, x2: dragMousePos.x, y2: dragMousePos.y }
    : null

  // Tooltip logic
  const showTooltip = pinnedTooltipNodeId && commentTooltipPos && !dragEdge && !commentFormNodeId
  const tooltipNodeComments = showTooltip
    ? comments.filter((c) => c.nodeId === pinnedTooltipNodeId && !c.resolved)
    : []
  if (pinnedTooltipNodeId && showTooltip && tooltipNodeComments.length === 0) {
    setTimeout(() => { setPinnedTooltipNodeId(null); setCommentTooltipPos(null) }, 0)
  }

  return (
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
        if (!rect) return
        hoverScreenPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }}
    >
      {currentParentId && (
        <button
          className="absolute top-3 left-3 z-10 btn btn-sm btn-ghost bg-base-100/80 backdrop-blur"
          onClick={navigateUp}
        >
          <ChevronRight className="size-4 rotate-180" />
          Back
        </button>
      )}

      {dragEdge && (
        <EdgeDragStatusBar onCancel={() => { setDragEdge(null); setDragMousePos(null); setHoveredHandle(null) }} />
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
        enableZoomInteraction={!dragEdge}
        enableNodeDrag={!dragEdge}
        enablePanInteraction={!dragEdge}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
      />

      <DragLineOverlay dragLine={dragLine} />

      {handleScreenPos && !dragEdge && (
        <HandleOverlays
          positions={handleScreenPos}
          onMouseEnter={handleHandleMouseEnter}
          onMouseLeave={handleHandleMouseLeave}
          onPointerDown={handleHandlePointerDown}
        />
      )}

      {contextMenu && (
        <GraphContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddNodeHere={() => { setCtxAddForm({ x: contextMenu.x, y: contextMenu.y }); setContextMenu(null) }}
          onAddComment={(nodeId) => { setCommentFormNodeId(nodeId); setCommentFormPos({ x: contextMenu.x, y: contextMenu.y }); setContextMenu(null) }}
          onRename={(nodeId, nodeName) => { onStartRename(nodeId, nodeName); setContextMenu(null) }}
        />
      )}

      {ctxAddForm && <ContextAddNodeForm position={ctxAddForm} onClose={() => setCtxAddForm(null)} />}

      {commentFormNodeId && commentFormPos && (
        <CommentFormPopover
          nodeId={commentFormNodeId}
          position={commentFormPos}
          onClose={() => { setCommentFormNodeId(null); setCommentFormPos(null) }}
        />
      )}

      {showTooltip && tooltipNodeComments.length > 0 && (
        <CommentTooltip
          targetNodeId={pinnedTooltipNodeId}
          position={commentTooltipPos}
          nodeComments={tooltipNodeComments}
          onClose={() => { setPinnedTooltipNodeId(null); setCommentTooltipPos(null) }}
        />
      )}
    </main>
  )
}

export default GraphCanvas
