import { motion } from 'framer-motion'
import { Menu, Share2, Sun, Moon, Bell, Check, MessageSquare, Eye } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

function Navbar({ onZoomToNode }) {
  const { users, currentUser, setCurrentUser, nodes, comments, unreadComments, markCommentRead } = useGraph()

  return (
    <header>
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <Menu className="h-5 w-5" />
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li><a>Homepage</a></li>
              <li><a>Portfolio</a></li>
              <li><a>About</a></li>
            </ul>
          </div>
        </div>
        <div className="navbar-end gap-2">
          <button className="btn btn-outline btn-primary btn-sm">
            <Share2 className="h-4 w-4" />
            Share
          </button>
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
                    className="badge badge-primary indicator-item h-4 min-w-4 p-0 text-[10px]"
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
              <li className="menu-title text-xs opacity-50 px-2 pt-1 pb-0">
                Signed in as {currentUser.name}
              </li>
              <div className="divider my-0" />
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
              <div className="divider my-0" />
              <li><a>Settings</a></li>
              <li><a>Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
