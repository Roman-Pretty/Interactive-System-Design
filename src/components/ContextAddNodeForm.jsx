import { useGraph } from '../context/GraphContext'
import AddNodeForm from './AddNodeForm'

function ContextAddNodeForm({ position, onClose }) {
  const { addNode, currentParentId } = useGraph()

  const handleSubmit = (name, color) => {
    addNode(name, color, currentParentId)
    onClose()
  }

  return (
    <div
      className="absolute bg-base-100 rounded-lg shadow-xl border border-base-300 p-3 z-50 w-64"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <AddNodeForm
        variant="context"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </div>
  )
}

export default ContextAddNodeForm
