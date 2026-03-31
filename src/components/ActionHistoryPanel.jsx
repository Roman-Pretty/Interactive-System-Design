import { History, Plus, Trash2, Pencil, Link, MessageSquare, Reply, CheckCircle, XCircle } from 'lucide-react'
import { useGraph } from '../context/GraphContext'

const ACTION_CONFIG = {
  node_created: { icon: Plus, label: 'Created node', color: 'text-success' },
  node_deleted: { icon: Trash2, label: 'Deleted node', color: 'text-error' },
  node_renamed: { icon: Pencil, label: 'Renamed node', color: 'text-warning' },
  edge_created: { icon: Link, label: 'Linked nodes', color: 'text-info' },
  edge_deleted: { icon: Link, label: 'Unlinked nodes', color: 'text-error' },
  comment_added: { icon: MessageSquare, label: 'Commented on', color: 'text-info' },
  reply_added: { icon: Reply, label: 'Replied on', color: 'text-info' },
  comment_deleted: { icon: Trash2, label: 'Deleted comment on', color: 'text-error' },
  reply_deleted: { icon: Trash2, label: 'Deleted reply on', color: 'text-error' },
  comment_resolved: { icon: CheckCircle, label: 'Resolved comment on', color: 'text-success' },
  comment_unresolved: { icon: XCircle, label: 'Reopened comment on', color: 'text-warning' },
}

function formatTime(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function ActionHistoryPanel() {
  const { actionHistory, users } = useGraph()

  if (actionHistory.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 opacity-40">
        <History className="size-6 mb-1" />
        <p className="text-xs">No actions yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pb-2">
      {actionHistory.map((entry) => {
        const config = ACTION_CONFIG[entry.type] || { icon: History, label: entry.type, color: 'text-base-content' }
        const Icon = config.icon
        const user = users.find((u) => u.id === entry.userId)
        const userName = user?.name?.split(' ')[0] || 'Unknown'

        let detail = ''
        const d = entry.details || {}
        if (entry.type === 'node_renamed') {
          detail = `"${d.nodeName}" → "${d.newName}"`
        } else if (entry.type === 'edge_created' || entry.type === 'edge_deleted') {
          detail = `${d.sourceName} ↔ ${d.targetName}`
        } else if (d.nodeName) {
          detail = d.nodeName
        }

        return (
          <div key={entry.id} className="flex items-start gap-2 px-1 py-1.5 rounded hover:bg-base-200 text-xs">
            <Icon className={`size-3.5 mt-0.5 shrink-0 ${config.color}`} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{userName}</span>{' '}
              <span className="opacity-70">{config.label}</span>
              {detail && (
                <span className="font-medium truncate block opacity-90">{detail}</span>
              )}
              <span className="opacity-40 block">{formatTime(entry.timestamp)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ActionHistoryPanel
