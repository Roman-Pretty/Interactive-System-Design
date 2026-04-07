function HandleOverlays({ positions, onMouseEnter, onMouseLeave, onPointerDown }) {
  return positions.map((pos, i) => (
    <div
      key={i}
      className="absolute z-30"
      style={{
        left: pos.x - 16,
        top: pos.y - 16,
        width: 32,
        height: 32,
        cursor: 'crosshair',
        borderRadius: '50%',
        background: 'transparent',
        touchAction: 'none',
      }}
      onMouseEnter={() => onMouseEnter?.(i)}
      onMouseLeave={() => onMouseLeave?.(i)}
      onPointerDown={(event) => onPointerDown?.(event, i, pos)}
    />
  ))
}

export default HandleOverlays
