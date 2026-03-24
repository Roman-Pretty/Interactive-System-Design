function DragLineOverlay({ dragLine }) {
  if (!dragLine) return null

  return (
    <svg className="absolute inset-0 pointer-events-none z-20" width="100%" height="100%">
      <line
        x1={dragLine.x1} y1={dragLine.y1}
        x2={dragLine.x2} y2={dragLine.y2}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="6,4"
      />
    </svg>
  )
}

export default DragLineOverlay
