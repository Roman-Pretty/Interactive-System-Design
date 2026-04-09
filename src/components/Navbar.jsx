import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftOpen, Share2, Sun, Moon, Bell, Check, MessageSquare, Send, Link, Undo2, Redo2, AtSign } from 'lucide-react'
import { useGraph } from '../context/GraphContext'
import MentionText from './MentionText'

export function openShareModal() {
  document.getElementById('share_modal')?.showModal()
}

function Navbar({ onZoomToNode, sidebarOpen, onToggleSidebar, isDark }) {
  const toggleTheme = () =>
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
  const { users, currentUser, setCurrentUser, nodes, unreadComments, markCommentRead, undo, redo, canUndo, canRedo, ROLE_LABELS } = useGraph()

  // Share menu state
  const [shareTab, setShareTab] = useState('whole')
  const [shareEmail, setShareEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const copiedTimer = useRef(null)
  const sentTimer = useRef(null)

  const handleCopy = () => {
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1200)
  }

  const handleSend = () => {
    setShareEmail('')
    setSent(true)
    clearTimeout(sentTimer.current)
    sentTimer.current = setTimeout(() => setSent(false), 1500)
  }



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
          {/* ---- Share button ---- */}
          <button className="btn btn-outline btn-primary btn-sm" onClick={openShareModal}>
            <Share2 className="h-4 w-4" />
            Share
          </button>

          {/* ---- Share Modal ---- */}
          <dialog id="share_modal" className="modal modal-middle">
            <div className="modal-box w-96">
              {/* Close button */}
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
              </form>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <Share2 className="size-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Share</span>
              </div>

              {/* Scope tabs */}
              <div role="tablist" className="tabs tabs-box tabs-sm mb-4">
                <button
                  role="tab"
                  className={`tab ${shareTab === 'whole' ? 'tab-active' : ''}`}
                  onClick={() => setShareTab('whole')}
                >
                  Whole Project
                </button>
                <button
                  role="tab"
                  className={`tab ${shareTab === 'level' ? 'tab-active' : ''}`}
                  onClick={() => setShareTab('level')}
                >
                  This Level
                </button>
              </div>

              {/* Shared form */}
              <div className="bg-base-200/50 rounded-xl p-4">
                <p className="text-xs opacity-50 mb-3">
                  {shareTab === 'whole'
                    ? 'Collaborators will have access to all nodes'
                    : 'Collaborators will have access to just this node and its children'}
                </p>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter Email"
                    className="input input-sm flex-1 bg-base-100 border-base-300 focus:border-primary/50 focus:outline-none"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!shareEmail.trim()}
                    onClick={handleSend}
                  >
                    <AnimatePresence mode="wait">
                      {sent ? (
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

                <div className="divider my-2 text-xs opacity-40">or</div>

                <button
                  className="btn btn-ghost btn-sm w-full gap-1.5 opacity-70 hover:opacity-100"
                  onClick={handleCopy}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span key="copied" className="flex items-center gap-1.5 text-success" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                        <Check className="size-3.5" /> Link Copied!
                      </motion.span>
                    ) : (
                      <motion.span key="copy" className="flex items-center gap-1.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                        <Link className="size-3.5" /> Copy Link
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button>close</button>
            </form>
          </dialog>
          <button className="btn btn-ghost btn-circle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

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
                    const isMentioned = c.mentions?.includes(currentUser.id) ||
                      c.replies.some((r) => r.mentions?.includes(currentUser.id))
                    return (
                      <button
                        key={c.id}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-3 border-b border-base-200 last:border-0 cursor-pointer transition-colors ${
                          isMentioned
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-[3px] border-l-warning'
                            : 'hover:bg-base-200'
                        }`}
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
                            <span className={`text-sm truncate ${isMentioned ? 'font-bold' : 'font-semibold'}`}>{displayAuthor?.name}</span>
                            <span className="text-xs opacity-40">on</span>
                            <span className="text-xs font-medium text-primary truncate">{node?.name}</span>
                          </div>
                          {isMentioned && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <AtSign className="size-3 text-warning" />
                              <span className="text-[11px] font-bold text-warning">Mentioned you</span>
                            </div>
                          )}
                          <p className={`text-xs line-clamp-2 mt-0.5 ${isMentioned ? 'opacity-80 font-medium' : 'opacity-70'}`}>
                            <MentionText text={displayText} />
                          </p>
                          <span className="text-xs opacity-40 mt-0.5 block">
                            {new Date(latestReply?.createdAt || c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {isMentioned ? (
                          <AtSign className="size-4 text-warning shrink-0 mt-1" />
                        ) : (
                          <MessageSquare className="size-4 text-warning shrink-0 mt-1" />
                        )}
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
                    {ROLE_LABELS && <span className="text-xs opacity-40">{ROLE_LABELS[user.role]}</span>}
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
