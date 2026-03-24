function HandleOverlays({ positions, onMouseEnter, onMouseLeave, onMouseDown }) {
  return positions.map((pos, i) => (
    <div
      key={i}
      className="absolute z-30"
      style={{
        left: pos.x - 12,
        top: pos.y - 12,
        width: 24,
        height: 24,
        cursor: 'crosshair',
        borderRadius: '50%',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    />
  ))
}

export default HandleOverlays
