import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftOpen, Share2, Sun, Moon, Bell, Check, MessageSquare, Eye, Send, Link, Undo2, Redo2 } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function Navbar({ onZoomToNode, sidebarOpen, onToggleSidebar }) {
  const { users, currentUser, setCurrentUser, nodes, unreadComments, markCommentRead, undo, redo, canUndo, canRedo } = useGraph()

  // Share menu state
  const [wholeEmail, setWholeEmail] = useState('')
  const [levelEmail, setLevelEmail] = useState('')
  const [wholeCopied, setWholeCopied] = useState(false)
  const [levelCopied, setLevelCopied] = useState(false)
  const [wholeSent, setWholeSent] = useState(false)
  const [levelSent, setLevelSent] = useState(false)
  const wholeCopiedTimer = useRef(null)
  const levelCopiedTimer = useRef(null)
  const wholeSentTimer = useRef(null)
  const levelSentTimer = useRef(null)

  const handleCopy = (which) => {
    const setter = which === 'whole' ? setWholeCopied : setLevelCopied
    const timerRef = which === 'whole' ? wholeCopiedTimer : levelCopiedTimer
    setter(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setter(false), 1200)
  }

  const handleSend = (which) => {
    const emailSetter = which === 'whole' ? setWholeEmail : setLevelEmail
    const sentSetter = which === 'whole' ? setWholeSent : setLevelSent
    const timerRef = which === 'whole' ? wholeSentTimer : levelSentTimer
    emailSetter('')
    sentSetter(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => sentSetter(false), 1500)
  }

  // Initialise theme from system preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const checkbox = document.querySelector('.theme-controller')
    if (checkbox && prefersDark && !checkbox.checked) {
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }, [])

  return (
    <header>
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start gap-1">
          <AnimatePresence>
            {!sidebarOpen && (
              <motion.button
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="btn btn-ghost btn-circle"
                onClick={onToggleSidebar}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>
          <div className="tooltip tooltip-bottom" data-tip="Undo (Ctrl+Z)">
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="tooltip tooltip-bottom" data-tip="Redo (Ctrl+Y)">
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="navbar-end gap-2">
          {/* ---- Share dropdown ---- */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-outline btn-primary btn-sm">
              <Share2 className="h-4 w-4" />
              Share
            </div>
            <div
              tabIndex={0}
              className="dropdown-content bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-base-300 z-50 mt-3 w-96 p-5"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <Share2 className="size-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Share</span>
              </div>

              {/* Share whole project */}
              <div className="bg-base-200/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold leading-tight">Share whole project</p>
                    <p className="text-xs opacity-50 mt-0.5">Collaborators will have access to all nodes</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => handleCopy('whole')}
                  >
                    <AnimatePresence mode="wait">
                      {wholeCopied ? (
                        <motion.span key="copied" className="flex items-center gap-1 text-success" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <Check className="size-3" /> Copied!
                        </motion.span>
                      ) : (
                        <motion.span key="copy" className="flex items-center gap-1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <Link className="size-3" /> Copy Link
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="email"
                    placeholder="Enter Email"
                    className="input input-sm flex-1 bg-base-100 border-base-300 focus:border-primary/50 focus:outline-none"
                    value={wholeEmail}
                    onChange={(e) => setWholeEmail(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!wholeEmail.trim()}
                    onClick={() => handleSend('whole')}
                  >
                    <AnimatePresence mode="wait">
                      {wholeSent ? (
                        <motion.span key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                          <Check className="size-3.5" />
                        </motion.span>
                      ) : (
                        <motion.span key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Send className="size-3.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="divider text-xs opacity-40 my-3">OR</div>

              {/* Share from this level */}
              <div className="bg-base-200/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold leading-tight">Share from this level</p>
                    <p className="text-xs opacity-50 mt-0.5">Collaborators will have access to just this node and its children</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs gap-1 opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => handleCopy('level')}
                  >
                    <AnimatePresence mode="wait">
                      {levelCopied ? (
                        <motion.span key="copied" className="flex items-center gap-1 text-success" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <Check className="size-3" /> Copied!
                        </motion.span>
                      ) : (
                        <motion.span key="copy" className="flex items-center gap-1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <Link className="size-3" /> Copy Link
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="email"
                    placeholder="Enter Email"
                    className="input input-sm flex-1 bg-base-100 border-base-300 focus:border-primary/50 focus:outline-none"
                    value={levelEmail}
                    onChange={(e) => setLevelEmail(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!levelEmail.trim()}
                    onClick={() => handleSend('level')}
                  >
                    <AnimatePresence mode="wait">
                      {levelSent ? (
                        <motion.span key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                          <Check className="size-3.5" />
                        </motion.span>
                      ) : (
                        <motion.span key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Send className="size-3.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <label className="btn btn-ghost btn-circle swap swap-rotate">
            <input type="checkbox" className="theme-controller" value="dark" />
            <Sun className="swap-off h-5 w-5" />
            <Moon className="swap-on h-5 w-5" />
          </label>

          {/* ---- Notifications dropdown ---- */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <div className="indicator">
                <Bell className="h-5 w-5" />
                {unreadComments.length > 0 && (
                  <motion.span
                    className="badge badge-primary indicator-item h-4 min-w-4 px-1 text-[10px] leading-none"
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {unreadComments.length}
                  </motion.span>
                )}
              </div>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content bg-base-100 rounded-box z-50 mt-3 w-80 shadow-xl border border-base-300"
            >
              <div className="p-3 border-b border-base-300">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {unreadComments.length === 0 ? (
                  <p className="text-sm opacity-50 text-center py-6">All caught up!</p>
                ) : (
                  unreadComments.map((c) => {
                    const author = users.find((u) => u.id === c.authorId)
                    const node = nodes.find((n) => n.id === c.nodeId)
                    const latestReply = c.replies.length > 0 ? c.replies[c.replies.length - 1] : null
                    const displayAuthor = latestReply ? users.find((u) => u.id === latestReply.authorId) : author
                    const displayText = latestReply ? latestReply.text : c.text
                    return (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2.5 hover:bg-base-200 flex items-start gap-3 border-b border-base-200 last:border-0 cursor-pointer"
                        onClick={() => {
                          markCommentRead(c.id)
                          if (onZoomToNode) onZoomToNode(c.nodeId)
                          document.activeElement?.blur()
                        }}
                      >
                        <div className="avatar mt-0.5">
                          <div className="w-8 rounded-full">
                            <img src={displayAuthor?.avatar} alt={displayAuthor?.name} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold truncate">{displayAuthor?.name}</span>
                            <span className="text-xs opacity-40">on</span>
                            <span className="text-xs font-medium text-primary truncate">{node?.name}</span>
                          </div>
                          <p className="text-xs opacity-70 line-clamp-2 mt-0.5">{displayText}</p>
                          <span className="text-xs opacity-40 mt-0.5 block">
                            {new Date(latestReply?.createdAt || c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <MessageSquare className="size-4 text-warning shrink-0 mt-1" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <img
                  alt={currentUser.name}
                  src={currentUser.avatar} />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-56 p-2 shadow">
              {users.map((user) => (
                <li key={user.id}>
                  <a
                    className={`flex items-center gap-2 ${user.id === currentUser.id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentUser(user.id)
                      document.activeElement?.blur()
                    }}
                  >
                    <div className="avatar">
                      <div className="w-6 rounded-full">
                        <img src={user.avatar} alt={user.name} />
                      </div>
                    </div>
                    <span className="flex-1">{user.name}</span>
                    {user.id === currentUser.id && <Check className="h-4 w-4 opacity-60" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
