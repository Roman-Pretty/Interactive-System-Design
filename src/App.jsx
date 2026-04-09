import { useState, useRef, useCallback } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import GraphCanvas from './components/GraphCanvas'
import { useGraph } from './context/GraphContext'
import { useThemeDetection } from './hooks/useThemeDetection'

function App() {
  const { nodes, currentParentId, navigateInto } = useGraph()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isDark = useThemeDetection()
  const graphRef = useRef()

  // Rename state shared between Sidebar and GraphCanvas
  const [renamingNodeId, setRenamingNodeId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  // Highlighted node (set by notification bell click)
  const [highlightedNodeId, setHighlightedNodeId] = useState(null)
  const highlightTimerRef = useRef(null)

  // Zoom to a specific node (used by notifications)
  const zoomToNode = useCallback((nodeId) => {
    if (!graphRef.current) return
    const targetNode = nodes.find((n) => n.id === nodeId)
    if (targetNode) {
      const parentId = targetNode.parentId || null
      if (parentId !== currentParentId) {
        navigateInto(parentId)
      }
    }
    // Set highlight immediately
    setHighlightedNodeId(nodeId)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightedNodeId(null), 4000)

    setTimeout(() => {
      const data = graphRef.current?.graphData()
      const gNode = data?.nodes.find((n) => n.id === nodeId)
      if (gNode && gNode.x !== undefined) {
        graphRef.current.centerAt(gNode.x, gNode.y, 500)
        graphRef.current.zoom(2.5, 500)
      }
    }, 200)
  }, [nodes, currentParentId, navigateInto])

  const handleStartRename = useCallback((nodeId, nodeName) => {
    setRenamingNodeId(nodeId)
    setRenameValue(nodeName)
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        renamingNodeId={renamingNodeId}
        setRenamingNodeId={setRenamingNodeId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <Navbar onZoomToNode={zoomToNode} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} isDark={isDark} />
        <GraphCanvas
          graphRef={graphRef}
          isDark={isDark}
          onStartRename={handleStartRename}
          highlightedNodeId={highlightedNodeId}
          onClearHighlight={() => setHighlightedNodeId(null)}
        />
      </div>
    </div>
  )
}

export default App
