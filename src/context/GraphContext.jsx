import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import {
  loadDB,
  saveDB,
  addNode as storeAddNode,
  deleteNode as storeDeleteNode,
  addEdge as storeAddEdge,
  deleteEdge as storeDeleteEdge,
  setCurrentUser as storeSetCurrentUser,
  getChildren as storeGetChildren,
  getAncestors as storeGetAncestors,
  addComment as storeAddComment,
  addReply as storeAddReply,
  resolveComment as storeResolveComment,
  markCommentRead as storeMarkCommentRead,
  deleteComment as storeDeleteComment,
  resetDB,
} from '../data/store'

const GraphContext = createContext(null)

export function GraphProvider({ children }) {
  const [db, setDb] = useState(() => loadDB())
  const [currentParentId, setCurrentParentId] = useState(null) // null = root level

  const refresh = useCallback((updater) => {
    setDb((prev) => {
      const next = { ...prev, nodes: [...prev.nodes], edges: [...prev.edges], users: [...prev.users], comments: [...(prev.comments || []).map((c) => ({ ...c, replies: [...c.replies] }))] }
      updater(next)
      saveDB(next)
      return next
    })
  }, [])

  const addNode = useCallback((name, color, parentId = null) => {
    let node
    refresh((d) => {
      node = storeAddNode(d, name, color, parentId)
    })
    return node
  }, [refresh])

  const deleteNode = useCallback((nodeId) => {
    // If we're inside the node being deleted, navigate up
    if (nodeId === currentParentId) {
      const parent = db.nodes.find((n) => n.id === nodeId)
      setCurrentParentId(parent?.parentId || null)
    }
    refresh((d) => storeDeleteNode(d, nodeId))
  }, [refresh, currentParentId, db.nodes])

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

  const reset = useCallback(() => {
    setDb(resetDB())
    setCurrentParentId(null)
  }, [])

  // Navigate into a node to see its children (null = root)
  const navigateInto = useCallback((nodeId) => {
    setCurrentParentId(nodeId || null)
  }, [])

  // Navigate up to parent
  const navigateUp = useCallback(() => {
    if (!currentParentId) return
    const current = db.nodes.find((n) => n.id === currentParentId)
    setCurrentParentId(current?.parentId || null)
  }, [currentParentId, db.nodes])

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

  const resolveComment = useCallback((commentId) => {
    refresh((d) => storeResolveComment(d, commentId))
  }, [refresh])

  const markCommentRead = useCallback((commentId) => {
    refresh((d) => storeMarkCommentRead(d, commentId, d.currentUserId))
  }, [refresh])

  const removeComment = useCallback((commentId) => {
    refresh((d) => storeDeleteComment(d, commentId))
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
        deleteNode,
        addEdge,
        deleteEdge,
        setCurrentUser,
        navigateInto,
        navigateUp,
        getChildCount,
        comments,
        unreadComments,
        addComment,
        addReply,
        resolveComment,
        markCommentRead,
        removeComment,
        reset,
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
