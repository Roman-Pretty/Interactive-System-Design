import { useState, useRef, useCallback } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import GraphCanvas from './components/GraphCanvas'
import { useGraph } from './context/GraphContext'
import { useThemeDetection } from './hooks/useThemeDetection'

const CORRECT_PASSWORD = 'roman10'

function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === CORRECT_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-950">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false) }}
          placeholder="Password"
          autoFocus
          className="border border-gray-300 dark:border-gray-700 rounded px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 outline-none focus:border-gray-500 text-center tracking-widest"
        />
        {error && <span className="text-red-500 text-sm">Incorrect password</span>}
        <button
          type="submit"
          className="px-6 py-2 rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          Unlock
        </button>
      </form>
    </div>
  )
}

function App() {
  const { nodes, currentParentId, navigateInto } = useGraph()

  const [unlocked, setUnlocked] = useState(false)
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
    <>
      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}
      {unlocked && (
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
      )}
    </>
  )
}

export default App
