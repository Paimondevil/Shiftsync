// Admin — Time-Off Requests
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const navItems = [
  { label: 'Dashboard', icon: '🏠', path: '/admin/dashboard' },
  { label: 'Schedule', icon: '📅', path: '/admin/schedule' },
  { label: 'Employees', icon: '👥', path: '/admin/employees' },
  { label: 'Time Off', icon: '🌴', path: '/admin/time-off' },
  { label: 'Shifts', icon: '⚙️', path: '/admin/shifts' },
]

function Sidebar({ currentUser, logout, navigate, activePath }) {
  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-8 px-4 fixed h-full z-10">
      <div className="mb-10 px-2">
        <span className="text-xl font-bold tracking-tight text-gray-900">Shift<span className="text-blue-600">Sync</span></span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              activePath === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
            }`}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="px-3 mb-3">
          <p className="text-xs font-semibold text-gray-900 truncate">{currentUser?.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{currentUser?.role?.toLowerCase()}</p>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors text-left">
          <span>→</span> Sign out
        </button>
      </div>
    </aside>
  )
}

const STATUS_CONFIG = {
  PENDING:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'Pending'  },
  APPROVED: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400',  label: 'Approved' },
  DENIED:   { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400',    label: 'Denied'   },
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TimeOffRequests() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [reviewing, setReviewing] = useState(null) // { request, action: 'APPROVED'|'DENIED' }
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchRequests = () => {
    setLoading(true)
    api.get('/timeoff/')
      .then(res => setRequests(res.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRequests() }, [])

  const filtered = requests.filter(r => filter === 'ALL' ? true : r.status === filter)

  const counts = {
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    DENIED: requests.filter(r => r.status === 'DENIED').length,
  }

  const handleReview = async () => {
    if (!reviewing) return
    setSubmitting(true)
    try {
      await api.patch(`/timeoff/${reviewing.request.id}/`, {
        status: reviewing.action,
        manager_note: note,
      })
      showToast(
        reviewing.action === 'APPROVED'
          ? `✅ Approved ${reviewing.request.employee_name}'s request`
          : `❌ Denied ${reviewing.request.employee_name}'s request`
      )
      setReviewing(null)
      setNote('')
      fetchRequests()
    } catch {
      showToast('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const tabs = [
    { key: 'PENDING', label: 'Pending', count: counts.PENDING },
    { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
    { key: 'DENIED', label: 'Denied', count: counts.DENIED },
    { key: 'ALL', label: 'All', count: requests.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentUser={currentUser} logout={logout} navigate={navigate} activePath="/admin/time-off" />

      <main className="ml-56 flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Time-Off Requests</h1>
          <p className="text-sm text-gray-400 mt-0.5">Review and manage employee time-off requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab.key === 'PENDING' && tab.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">🌴</p>
            <p className="text-sm font-semibold text-gray-700">No {filter.toLowerCase()} requests</p>
            <p className="text-xs text-gray-400 mt-1">Nothing to show here right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                    {req.employee_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-800">{req.employee_name}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(req.date)}
                      {req.reason && <span className="text-gray-400"> · {req.reason}</span>}
                    </p>
                    {req.manager_note && (
                      <p className="text-xs text-gray-400 mt-1 italic">Note: {req.manager_note}</p>
                    )}
                    {req.reviewed_by_name && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Reviewed by {req.reviewed_by_name} · {formatDate(req.reviewed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setReviewing({ request: req, action: 'DENIED' }); setNote('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                      Deny
                    </button>
                    <button
                      onClick={() => { setReviewing({ request: req, action: 'APPROVED' }); setNote('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 hover:bg-green-600 text-white transition-colors">
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {reviewing.action === 'APPROVED' ? '✅ Approve Request' : '❌ Deny Request'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {reviewing.request.employee_name} — {formatDate(reviewing.request.date)}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Note (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note for the employee..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewing(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReview} disabled={submitting}
                className={`flex-1 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                  reviewing.action === 'APPROVED' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {submitting ? 'Saving...' : reviewing.action === 'APPROVED' ? 'Approve' : 'Deny'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}