const STORAGE_KEY = 'isd-db'

const COLOR_MAP = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-green-500': '#22c55e',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  'bg-indigo-500': '#6366f1',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
}

const AVAILABLE_COLORS = Object.keys(COLOR_MAP)

function getGraphColor(tailwindClass) {
  return COLOR_MAP[tailwindClass] || '#6b7280'
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const SEED = {
  users: [
    { id: 'u-1', name: 'Roman Pretty', avatar: 'https://i.pravatar.cc/150?u=roman.pretty' },
    { id: 'u-2', name: 'Ilenia Maietta', avatar: 'https://i.pravatar.cc/150?u=ilenia.maietta' },
    { id: 'u-3', name: 'Other User', avatar: 'https://i.pravatar.cc/150?u=other.user' },
  ],
  nodes: [
    { id: 'n-0', name: 'Research', color: 'bg-red-500', graphColor: '#ef4444', parentId: null },
    { id: 'n-1', name: 'Literature Review', color: 'bg-purple-500', graphColor: '#a855f7', parentId: null },
    { id: 'n-2', name: 'References and Sources', color: 'bg-blue-600', graphColor: '#2563eb', parentId: null },
  ],
  edges: [
    { id: 'e-0', source: 'n-0', target: 'n-1' },
    { id: 'e-1', source: 'n-1', target: 'n-2' },
  ],
  comments: [
    {
      id: 'c-seed',
      nodeId: 'n-2',
      authorId: 'u-1',
      text: 'Looks good, but needs to be further refined to follow IEEE referencing standards.',
      createdAt: Date.now() - 3600000,
      resolved: false,
      readBy: ['u-1'],
      replies: [],
    },
  ],
  currentUserId: 'u-1',
}

export function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.users && parsed.nodes && parsed.edges) {
        if (!parsed.comments) parsed.comments = []
        return parsed
      }
    }
  } catch { /* corrupted, re-seed */ }
  const fresh = structuredClone(SEED)
  saveDB(fresh)
  return fresh
}

export function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function addNode(db, name, color, parentId = null) {
  const node = {
    id: generateId(),
    name,
    color,
    graphColor: getGraphColor(color),
    parentId,
  }
  db.nodes.push(node)
  return node
}

export function renameNode(db, nodeId, newName) {
  const node = db.nodes.find((n) => n.id === nodeId)
  if (node) node.name = newName
}

export function deleteNode(db, nodeId) {
  // Recursively collect all descendant node ids
  const toDelete = new Set()
  const collect = (id) => {
    toDelete.add(id)
    db.nodes.filter((n) => n.parentId === id).forEach((child) => collect(child.id))
  }
  collect(nodeId)
  db.nodes = db.nodes.filter((n) => !toDelete.has(n.id))
  db.edges = db.edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target))
}

export function getChildren(db, parentId) {
  return db.nodes.filter((n) => n.parentId === (parentId || null))
}

export function getAncestors(db, nodeId) {
  const path = []
  let current = db.nodes.find((n) => n.id === nodeId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? db.nodes.find((n) => n.id === current.parentId) : null
  }
  return path
}

export function addEdge(db, sourceId, targetId) {
  if (sourceId === targetId) return null
  const exists = db.edges.some(
    (e) =>
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId),
  )
  if (exists) return null
  const edge = { id: generateId(), source: sourceId, target: targetId }
  db.edges.push(edge)
  return edge
}

export function deleteEdge(db, edgeId) {
  db.edges = db.edges.filter((e) => e.id !== edgeId)
}

export function setCurrentUser(db, userId) {
  db.currentUserId = userId
}

export function resetDB() {
  const fresh = structuredClone(SEED)
  saveDB(fresh)
  return fresh
}

// ---- Comment operations ----

export function addComment(db, nodeId, authorId, text) {
  const comment = {
    id: generateId(),
    nodeId,
    authorId,
    text,
    createdAt: Date.now(),
    resolved: false,
    readBy: [authorId],
    replies: [],
  }
  db.comments.push(comment)
  return comment
}

export function addReply(db, commentId, authorId, text) {
  const comment = db.comments.find((c) => c.id === commentId)
  if (!comment) return null
  const reply = {
    id: generateId(),
    authorId,
    text,
    createdAt: Date.now(),
  }
  comment.replies.push(reply)
  // Mark unread for everyone except the replier
  comment.readBy = comment.readBy.filter((uid) => uid === authorId)
  if (!comment.readBy.includes(authorId)) comment.readBy.push(authorId)
  return reply
}

export function resolveComment(db, commentId) {
  const comment = db.comments.find((c) => c.id === commentId)
  if (comment) comment.resolved = true
}

export function markCommentRead(db, commentId, userId) {
  const comment = db.comments.find((c) => c.id === commentId)
  if (comment && !comment.readBy.includes(userId)) {
    comment.readBy.push(userId)
  }
}

export function deleteComment(db, commentId) {
  db.comments = db.comments.filter((c) => c.id !== commentId)
}

export { AVAILABLE_COLORS, COLOR_MAP }
