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
    visibleNodes, edges, comments,
    currentParentId, navigateInto, navigateUp,
    addEdge, deleteNode,
    selectedNodeIds, selectNode, toggleSelectNode, clearSelection,
  } = useGraph()

  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Context menu
  const [contextMenu, setContextMenu] = useState(null)
  const [ctxAddForm, setCtxAddForm] = useState(null)

  // Figma-style edge drag
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [dragEdge, setDragEdge] = useState(null)
  const [dragMousePos, setDragMousePos] = useState(null)
  const [handleScreenPos, setHandleScreenPos] = useState(null)

  // Comment state
  const [commentFormNodeId, setCommentFormNodeId] = useState(null)
  const [commentFormPos, setCommentFormPos] = useState(null)
  const [commentTooltipPos, setCommentTooltipPos] = useState(null)
  const [pinnedTooltipNodeId, setPinnedTooltipNodeId] = useState(null)

  // Refs for state mirroring and overlay hover tracking
  const hoveredNodeIdRef = useRef(null)
  const dragEdgeRef = useRef(null)
  const dragCompletedRef = useRef(false)
  const hoverScreenPosRef = useRef({ x: 0, y: 0 })
  const pinnedTooltipRef = useRef(null)
  const handleHoveredRef = useRef(false)
  const handleHideTimeoutRef = useRef(null)
  const graphNodeHoverRef = useRef(null)
  const lastClickRef = useRef({ nodeId: null, time: 0 })
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

  // Keyboard shortcuts: Escape cancels, Delete/Backspace deletes selected nodes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dragEdge) { setDragEdge(null); setDragMousePos(null) }
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
  }, [hoveredNodeId, dragEdge, graphRef])

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
  }, [dragEdge, addEdge, graphRef])

  // Set crosshair cursor on canvas during drag
  useEffect(() => {
    if (!dragEdge) return
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) canvas.style.cursor = 'crosshair'
    return () => { if (canvas) canvas.style.cursor = '' }
  }, [dragEdge])

  // Animate highlight ring — throttled state tick drives canvas repaints
  const [highlightTick, setHighlightTick] = useState(0)
  useEffect(() => {
    if (!highlightedNodeId) return
    const id = setInterval(() => setHighlightTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [highlightedNodeId])

  // Auto-open comment tooltip when a node is highlighted from notification
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
    // Delay to allow zoom/center animation to settle
    const timer = setTimeout(openTooltip, 750)
    return () => clearTimeout(timer)
  }, [highlightedNodeId, graphRef])

  // Node comment counts for badge rendering
  const nodeCommentCounts = useMemo(() => {
    const map = {}
    for (const c of comments) {
      if (!c.resolved) map[c.nodeId] = (map[c.nodeId] || 0) + 1
    }
    return map
  }, [comments])

  // Node canvas rendering with Figma-style handles
  const nodeCanvasObject = useCallback((node, ctx) => {
    const radius = 20
    // Pulsing highlight ring from notification
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
      ctx.beginPath()
      ctx.roundRect(bx - badgeW / 2, by - badgeH / 2, badgeW, badgeH, badgeR)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const ix = bx - 4
      const iy = by
      ctx.beginPath()
      ctx.roundRect(ix - 3, iy - 2.5, 5, 4, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(ix - 2, iy + 1.5)
      ctx.lineTo(ix - 3.5, iy + 3)
      ctx.lineTo(ix, iy + 1.5)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
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
  }, [contentColor, hoveredNodeId, dragEdge, nodeCommentCounts, highlightedNodeId, highlightTick, selectedNodeIds])

  // --- Handlers ---
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

    if (dragEdgeRef.current) {
      setHoveredNodeId(node ? node.id : null)
      return
    }

    if (node) {
      if (handleHideTimeoutRef.current) {
        clearTimeout(handleHideTimeoutRef.current)
        handleHideTimeoutRef.current = null
      }
      setHoveredNodeId(node.id)
    } else {
      handleHideTimeoutRef.current = setTimeout(() => {
        if (!handleHoveredRef.current) {
          setHoveredNodeId(null)
        }
        handleHideTimeoutRef.current = null
      }, 300)
    }
  }, [])

  const handleNodeClick = useCallback((node, event) => {
    if (dragCompletedRef.current) return
    if (highlightedNodeId) onClearHighlight()
    if (dragEdge) {
      if (node.id !== dragEdge.sourceId) {
        addEdge(dragEdge.sourceId, node.id)
      }
      setDragEdge(null)
      setDragMousePos(null)
      return
    }

    const now = Date.now()
    const last = lastClickRef.current
    if (last.nodeId === node.id && now - last.time < 350) {
      // Double-click: navigate into
      lastClickRef.current = { nodeId: null, time: 0 }
      navigateInto(node.id)
    } else {
      // Single click: select / toggle-select + open comments
      lastClickRef.current = { nodeId: node.id, time: now }
      if (event.ctrlKey || event.metaKey) {
        toggleSelectNode(node.id)
      } else {
        selectNode(node.id)
      }
      // Open comment tooltip on click if node has comments
      const nodeHasComments = comments.some((c) => c.nodeId === node.id && !c.resolved)
      if (nodeHasComments) {
        const pos = hoverScreenPosRef.current
        setPinnedTooltipNodeId(node.id)
        setCommentTooltipPos({ x: pos.x + 24, y: pos.y - 12 })
      } else {
        setPinnedTooltipNodeId(null)
        setCommentTooltipPos(null)
      }
    }
  }, [dragEdge, addEdge, navigateInto, selectNode, toggleSelectNode, highlightedNodeId, onClearHighlight, comments])

  const handleBackgroundClick = useCallback(() => {
    if (highlightedNodeId) onClearHighlight()
    clearSelection()
    setPinnedTooltipNodeId(null)
    setCommentTooltipPos(null)
    if (dragEdge) {
      setDragEdge(null)
      setDragMousePos(null)
    }
  }, [dragEdge, highlightedNodeId, onClearHighlight])

  // Handle overlay interaction callbacks
  const handleHandleMouseEnter = useCallback(() => {
    handleHoveredRef.current = true
    if (handleHideTimeoutRef.current) {
      clearTimeout(handleHideTimeoutRef.current)
      handleHideTimeoutRef.current = null
    }
  }, [])

  const handleHandleMouseLeave = useCallback(() => {
    handleHoveredRef.current = false
    setTimeout(() => {
      if (!handleHoveredRef.current && !graphNodeHoverRef.current) {
        setHoveredNodeId(null)
        setHandleScreenPos(null)
      }
    }, 150)
  }, [])

  const handleHandleMouseDown = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const targetId = hoveredNodeIdRef.current
    if (!targetId) return
    const rect = containerRef.current.getBoundingClientRect()
    setDragEdge({ sourceId: targetId })
    setDragMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

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

  // Tooltip logic
  const tooltipTargetNodeId = pinnedTooltipNodeId
  const showTooltip = pinnedTooltipNodeId && commentTooltipPos && !dragEdge && !commentFormNodeId
  const tooltipNodeComments = showTooltip
    ? comments.filter((c) => c.nodeId === tooltipTargetNodeId && !c.resolved)
    : []

  // Cleanup pinned tooltip if all comments resolved
  if (pinnedTooltipNodeId && showTooltip && tooltipNodeComments.length === 0) {
    setTimeout(() => {
      setPinnedTooltipNodeId(null)
      setCommentTooltipPos(null)
    }, 0)
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
        <EdgeDragStatusBar onCancel={() => { setDragEdge(null); setDragMousePos(null) }} />
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
      <DragLineOverlay dragLine={dragLine} />

      {/* HTML handle overlays for edge dragging */}
      {handleScreenPos && !dragEdge && (
        <HandleOverlays
          positions={handleScreenPos}
          onMouseEnter={handleHandleMouseEnter}
          onMouseLeave={handleHandleMouseLeave}
          onMouseDown={handleHandleMouseDown}
        />
      )}

      {/* Graph Context Menu */}
      {contextMenu && (
        <GraphContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddNodeHere={() => {
            setCtxAddForm({ x: contextMenu.x, y: contextMenu.y })
            setContextMenu(null)
          }}
          onAddComment={(nodeId) => {
            setCommentFormNodeId(nodeId)
            setCommentFormPos({ x: contextMenu.x, y: contextMenu.y })
            setContextMenu(null)
          }}
          onRename={(nodeId, nodeName) => {
            onStartRename(nodeId, nodeName)
            setContextMenu(null)
          }}
        />
      )}

      {/* Context-menu Add Node popover */}
      {ctxAddForm && (
        <ContextAddNodeForm
          position={ctxAddForm}
          onClose={() => setCtxAddForm(null)}
        />
      )}

      {/* Comment Form Popover */}
      {commentFormNodeId && commentFormPos && (
        <CommentFormPopover
          nodeId={commentFormNodeId}
          position={commentFormPos}
          onClose={() => {
            setCommentFormNodeId(null)
            setCommentFormPos(null)
          }}
        />
      )}

      {/* Comment Tooltip on click */}
      {showTooltip && tooltipNodeComments.length > 0 && (
        <CommentTooltip
          targetNodeId={tooltipTargetNodeId}
          position={commentTooltipPos}
          nodeComments={tooltipNodeComments}
          onClose={() => {
            setPinnedTooltipNodeId(null)
            setCommentTooltipPos(null)
          }}
        />
      )}
    </main>
  )
}

export default GraphCanvas
