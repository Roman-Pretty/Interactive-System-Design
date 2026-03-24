import { motion } from 'framer-motion'
import { Menu, Share2, Sun, Moon, Bell } from 'lucide-react'

function Navbar() {
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
          <button className="btn btn-ghost btn-circle">
            <div className="indicator">
              <Bell className="h-5 w-5" />
              <motion.span
                className="badge badge-primary indicator-item h-2 w-2 p-0"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <img
                  alt="Tailwind CSS Navbar component"
                  src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li>
                <a className="justify-between">
                  Profile
                  <span className="badge">New</span>
                </a>
              </li>
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
