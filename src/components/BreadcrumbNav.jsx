function BreadcrumbNav({ breadcrumbs, navigateInto, onRootClick }) {
  return (
    <div className="breadcrumbs text-sm">
      <ul>
        <li>
          <a className="cursor-pointer" onClick={onRootClick}>Root</a>
        </li>
        {breadcrumbs.map((bc, i) => (
          <li key={bc.id}>
            {i === breadcrumbs.length - 1 ? (
              bc.name
            ) : (
              <a className="cursor-pointer" onClick={() => navigateInto(bc.id)}>{bc.name}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default BreadcrumbNav
