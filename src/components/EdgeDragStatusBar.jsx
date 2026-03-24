function EdgeDragStatusBar({ onCancel }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-base-100/90 backdrop-blur rounded-lg px-4 py-2 text-sm shadow flex items-center gap-2">
      <span className="opacity-60">Click a node to connect, or</span>
      <button className="btn btn-ghost btn-xs" onClick={onCancel}>Cancel</button>
    </div>
  )
}

export default EdgeDragStatusBar
