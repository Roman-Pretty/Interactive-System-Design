import { useState } from 'react'
import Navbar from './components/Navbar'
import { Users, X, Filter, Search } from 'lucide-react'

const nodes = [
  { name: 'Research', color: 'bg-red-500' },
  { name: 'Literature Review', color: 'bg-purple-500' },
  { name: 'References and Sources', color: 'bg-blue-600' },
]

const collaborators = [
  { name: 'Roman Pretty', avatar: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp' },
  { name: 'Ilenia Maietta', avatar: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp' },
  { name: 'Other User', avatar: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp' },
]

const comments = [
  {
    author: 'Roman Pretty',
    avatar: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp',
    section: 'References and Sources',
    text: 'Looks good, but needs to be further refined to follow IEEE referencing standards.',
  },
]

function App() {
  const [fabOpen, setFabOpen] = useState(false)
  const [nodeSearch, setNodeSearch] = useState('')

  const filteredNodes = nodes.filter((n) =>
    n.name.toLowerCase().includes(nodeSearch.toLowerCase())
  )

  return (
    <div className="flex h-screen">
      <aside className="w-1/5 bg-base-100 shadow-sm border-r border-base-300 p-4">
        <div
          className="mb-4 w-2/3 h-8 bg-base-content"
          style={{
            WebkitMaskImage: 'url(https://framerusercontent.com/images/B9AhGiyf4kAw38A0GTWs6qGMPo4.png?scale-down-to=512)',
            maskImage: 'url(https://framerusercontent.com/images/B9AhGiyf4kAw38A0GTWs6qGMPo4.png?scale-down-to=512)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          }}
        />
        <label className="input input-sm bg-base-200 flex items-center gap-2 mb-3">
          <Search className="size-4 opacity-50" />
          <input
            type="text"
            className="grow"
            placeholder="Search nodes..."
            value={nodeSearch}
            onChange={(e) => setNodeSearch(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 w-full">
          {filteredNodes.map((node) => (
            <div key={node.name} className={`${node.color} text-white text-sm font-medium rounded-lg px-3 py-2 truncate w-full`}>
              {node.name}
            </div>
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 bg-base-200 p-4"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}>
          {fabOpen && (
            <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-6 right-6 z-40">
            {fabOpen && (
              <div className="absolute bottom-16 right-0 bg-base-100 rounded-2xl shadow-xl w-96 p-6 mb-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Share</h3>
                  <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setFabOpen(false)}>
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Collaborators</h4>
                  <div className="flex flex-col gap-2">
                    {collaborators.map((c) => (
                      <div key={c.name} className="flex items-center gap-3 bg-base-200 rounded-lg px-3 py-2">
                        <div className="avatar">
                          <div className="w-8 rounded-full">
                            <img src={c.avatar} alt={c.name} />
                          </div>
                        </div>
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Comments</h4>
                    <button className="btn btn-ghost btn-xs btn-circle">
                      <Filter className="size-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {comments.map((c, i) => (
                      <div key={i} className="bg-base-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="avatar">
                              <div className="w-8 rounded-full">
                                <img src={c.avatar} alt={c.author} />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-tight">{c.author}</p>
                              <p className="text-xs opacity-60">{c.section}</p>
                            </div>
                          </div>
                          <button className="btn btn-ghost btn-xs btn-circle">
                            <X className="size-3" />
                          </button>
                        </div>
                        <p className="text-sm mt-2">{c.text}</p>
                        <div className="flex justify-end gap-2 mt-3">
                          <button className="btn btn-outline btn-sm">Resolve</button>
                          <button className="btn btn-outline btn-sm">Reply</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <label className="btn btn-lg btn-circle btn-primary swap swap-rotate">
              <input type="checkbox" checked={fabOpen} onChange={() => setFabOpen(!fabOpen)} />
              <Users className="swap-off size-6" />
              <X className="swap-on size-6" />
            </label>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
