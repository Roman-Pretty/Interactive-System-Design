import { useState } from 'react'
import { AVAILABLE_COLORS } from '../data/store'

function AddNodeForm({ onSubmit, onCancel, variant = 'sidebar' }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVAILABLE_COLORS[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), color)
    setName('')
    setColor(AVAILABLE_COLORS[0])
  }

  if (variant === 'context') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          className="input input-sm w-full"
          placeholder="Node name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="flex flex-wrap gap-1">
          {AVAILABLE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-5 h-5 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-xs flex-1" disabled={!name.trim()}>Add</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-base-200 rounded-lg p-3 mt-2 flex flex-col gap-2 shrink-0">
      <input
        type="text"
        className="input input-sm w-full"
        placeholder="Node name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <div className="flex flex-wrap gap-1">
        {AVAILABLE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`w-6 h-6 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm flex-1" disabled={!name.trim()}>
          Add
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default AddNodeForm
