import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  loadDB,
  saveDB,
  addNode as storeAddNode,
  renameNode as storeRenameNode,
  deleteNode as storeDeleteNode,
  addEdge as storeAddEdge,
  deleteEdge as storeDeleteEdge,
  setCurrentUser as storeSetCurrentUser,
  getChildren as storeGetChildren,
  getAncestors as storeGetAncestors,
  addComment as storeAddComment,
  addReply as storeAddReply,
  resolveComment as storeResolveComment,
  unresolveComment as storeUnresolveComment,
  markCommentRead as storeMarkCommentRead,
  deleteComment as storeDeleteComment,
  deleteReply as storeDeleteReply,
  resetDB,
} from '../data/store'

const GraphContext = createContext(null)

const MAX_UNDO = 50

export function GraphProvider({ children }) {
  const [db, setDb] = useState(() => loadDB())
  const [currentParentId, setCurrentParentId] = useState(null) // null = root level
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set())

  const pushUndo = useCallback((snapshot) => {
    setUndoStack((prev) => {
      const next = [...prev, snapshot]
      return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next
    })
    setRedoStack([])
  }, [])

  const refresh = useCallback((updater) => {
    setDb((prev) => {
      const next = { ...prev, nodes: [...prev.nodes], edges: [...prev.edges], users: [...prev.users], comments: [...(prev.comments || []).map((c) => ({ ...c, replies: [...c.replies] }))] }
      updater(next)
      saveDB(next)
      return next
    })
  }, [])

  const addNode = useCallback((name, color, parentId = null) => {
    pushUndo(structuredClone(db))
    let node
    refresh((d) => {
      node = storeAddNode(d, name, color, parentId)
    })
    return node
  }, [refresh, db, pushUndo])

  const renameNode = useCallback((nodeId, newName) => {
    pushUndo(structuredClone(db))
    refresh((d) => storeRenameNode(d, nodeId, newName))
  }, [refresh, db, pushUndo])

  const deleteNode = useCallback((nodeId) => {
    pushUndo(structuredClone(db))
    // If we're inside the node being deleted, navigate up
    if (nodeId === currentParentId) {
      const parent = db.nodes.find((n) => n.id === nodeId)
      setCurrentParentId(parent?.parentId || null)
    }
    refresh((d) => storeDeleteNode(d, nodeId))
  }, [refresh, currentParentId, db, pushUndo])

  const addEdge = useCallback((sourceId, targetId) => {
    let edge
    refresh((d) => {
      edge = storeAddEdge(d, sourceId, targetId)
    })
    return edge
  }, [refresh])

  const deleteEdge = useCallback((edgeId) => {
    refresh((d) => storeDeleteEdge(d, edgeId))
  }, [refresh])

  const setCurrentUser = useCallback((userId) => {
    refresh((d) => storeSetCurrentUser(d, userId))
  }, [refresh])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, structuredClone(db)])
    saveDB(prev)
    setDb(prev)
  }, [undoStack, db])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, structuredClone(db)])
    saveDB(next)
    setDb(next)
  }, [redoStack, db])

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  const reset = useCallback(() => {
    setDb(resetDB())
    setCurrentParentId(null)
    setUndoStack([])
    setRedoStack([])
  }, [])

  // Navigate into a node to see its children (null = root)
  const navigateInto = useCallback((nodeId) => {
    setCurrentParentId(nodeId || null)
    setSelectedNodeIds(new Set())
  }, [])

  // Navigate up to parent
  const navigateUp = useCallback(() => {
    if (!currentParentId) return
    const current = db.nodes.find((n) => n.id === currentParentId)
    setCurrentParentId(current?.parentId || null)
    setSelectedNodeIds(new Set())
  }, [currentParentId, db.nodes])

  // Selection: single select (replace), toggle (Ctrl+click), clear
  const selectNode = useCallback((nodeId) => {
    setSelectedNodeIds(new Set([nodeId]))
  }, [])

  const toggleSelectNode = useCallback((nodeId) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set())
  }, [])

  const currentUser = db.users.find((u) => u.id === db.currentUserId) || db.users[0]

  // Nodes at the current navigation level
  const visibleNodes = useMemo(
    () => db.nodes.filter((n) => {
      const pid = n.parentId || null
      return pid === (currentParentId || null)
    }),
    [db.nodes, currentParentId],
  )

  // Breadcrumb path from root to current parent
  const breadcrumbs = useMemo(
    () => (currentParentId ? storeGetAncestors(db, currentParentId) : []),
    [db, currentParentId],
  )

  // Helper: get children count for a node
  const getChildCount = useCallback(
    (nodeId) => db.nodes.filter((n) => n.parentId === nodeId).length,
    [db.nodes],
  )

  // --- Comment operations ---
  const addComment = useCallback((nodeId, text) => {
    let comment
    refresh((d) => {
      comment = storeAddComment(d, nodeId, d.currentUserId, text)
    })
    return comment
  }, [refresh])

  const addReply = useCallback((commentId, text) => {
    let reply
    refresh((d) => {
      reply = storeAddReply(d, commentId, d.currentUserId, text)
    })
    return reply
  }, [refresh])

  const lastResolvedRef = useRef(null)

  const resolveComment = useCallback((commentId) => {
    refresh((d) => storeResolveComment(d, commentId))
    lastResolvedRef.current = commentId
  }, [refresh])

  const unresolveComment = useCallback((commentId) => {
    refresh((d) => storeUnresolveComment(d, commentId))
    if (lastResolvedRef.current === commentId) lastResolvedRef.current = null
  }, [refresh])

  const undoLastResolve = useCallback(() => {
    if (lastResolvedRef.current) {
      unresolveComment(lastResolvedRef.current)
    }
  }, [unresolveComment])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const markCommentRead = useCallback((commentId) => {
    refresh((d) => storeMarkCommentRead(d, commentId, d.currentUserId))
  }, [refresh])

  const removeComment = useCallback((commentId) => {
    refresh((d) => storeDeleteComment(d, commentId))
  }, [refresh])

  const removeReply = useCallback((commentId, replyId) => {
    refresh((d) => storeDeleteReply(d, commentId, replyId))
  }, [refresh])

  const comments = db.comments || []

  const unreadComments = useMemo(
    () => comments.filter((c) => !c.resolved && !c.readBy.includes(currentUser.id)),
    [comments, currentUser.id],
  )

  return (
    <GraphContext.Provider
      value={{
        nodes: db.nodes,
        visibleNodes,
        edges: db.edges,
        users: db.users,
        currentUser,
        currentParentId,
        breadcrumbs,
        addNode,
        renameNode,
        deleteNode,
        addEdge,
        deleteEdge,
        setCurrentUser,
        navigateInto,
        navigateUp,
        getChildCount,
        selectedNodeIds,
        selectNode,
        toggleSelectNode,
        clearSelection,
        comments,
        unreadComments,
        addComment,
        addReply,
        resolveComment,
        unresolveComment,
        markCommentRead,
        removeComment,
        removeReply,
        reset,
        undo,
        redo,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </GraphContext.Provider>
  )
}

export function useGraph() {
  const ctx = useContext(GraphContext)
  if (!ctx) throw new Error('useGraph must be used within GraphProvider')
  return ctx
}
