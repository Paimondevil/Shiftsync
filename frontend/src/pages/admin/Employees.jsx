// Admin — Manage Employees
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const PREF_OPTIONS = [
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'PRIORITY_1', label: 'Priority 1 (prefers not to)' },
  { value: 'PRIORITY_2', label: 'Priority 2 (worst case)' },
]
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PRIORITY_OPTIONS = [
  { value: 3, label: '3 — Never' },
  { value: 2, label: '2 — Emergency only' },
  { value: 1, label: '1 — Prefer not to' },
]
const SHIFT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6]

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

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  role: 'EMPLOYEE', is_oncall: false,
  priority_rank: 99, min_shifts_per_week: 1, max_shifts_per_week: 5,
  hire_date: '',
  shift_eligibilities: [],
  fixed_days_off: [],
}

export default function Employees() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [shiftTypes, setShiftTypes] = useState([]) // loaded from API
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [resendSuccess, setResendSuccess] = useState(null)

  const fetchEmployees = () => {
    setLoading(true)
    api.get('/employees/')
      .then(res => setEmployees(res.data || []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEmployees()
    // Load shift types from API so we have real IDs
    api.get('/shifts/').then(res => setShiftTypes(res.data || []))
  }, [])

  const toggleShiftEligibility = (shiftTypeId) => {
    setForm(prev => {
      const exists = prev.shift_eligibilities.find(e => e.shift_type === shiftTypeId)
      if (exists) {
        return { ...prev, shift_eligibilities: prev.shift_eligibilities.filter(e => e.shift_type !== shiftTypeId) }
      }
      return { ...prev, shift_eligibilities: [...prev.shift_eligibilities, { shift_type: shiftTypeId, preference: 'PREFERRED' }] }
    })
  }

  const updateShiftPref = (shiftTypeId, preference) => {
    setForm(prev => ({
      ...prev,
      shift_eligibilities: prev.shift_eligibilities.map(e =>
        e.shift_type === shiftTypeId ? { ...e, preference } : e
      )
    }))
  }

  const toggleFixedDay = (day) => {
    setForm(prev => {
      const exists = prev.fixed_days_off.find(d => d.day_of_week === day)
      if (exists) {
        return { ...prev, fixed_days_off: prev.fixed_days_off.filter(d => d.day_of_week !== day) }
      }
      return { ...prev, fixed_days_off: [...prev.fixed_days_off, { day_of_week: day, priority: 3 }] }
    })
  }

  const updateDayPriority = (day, priority) => {
    setForm(prev => ({
      ...prev,
      fixed_days_off: prev.fixed_days_off.map(d =>
        d.day_of_week === day ? { ...d, priority: parseInt(priority) } : d
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/employees/', form)
      setSuccess(`Invite sent to ${form.email}!`)
      setShowForm(false)
      setForm(emptyForm)
      fetchEmployees()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const msgs = []
        Object.entries(data).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            val.forEach(v => msgs.push(typeof v === 'string' ? `${key}: ${v}` : JSON.stringify(v)))
          } else if (typeof val === 'string') {
            msgs.push(`${key}: ${val}`)
          } else {
            msgs.push(JSON.stringify(val))
          }
        })
        setError(msgs.join(' | '))
      } else {
        setError('Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/employees/${id}/`)
      setDeleteConfirm(null)
      fetchEmployees()
    } catch {
      setError('Failed to deactivate employee.')
    }
  }

  const handleResendInvite = async (id, name) => {
    try {
      await api.post(`/employees/${id}/resend-invite/`)
      setResendSuccess(name)
      setTimeout(() => setResendSuccess(null), 3000)
    } catch {
      setError('Failed to resend invite.')
    }
  }

  const getRoleBadge = (role) => {
    if (role === 'OWNER') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">Owner</span>
    if (role === 'MANAGER') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Manager</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Employee</span>
  }

  const getShiftLabel = (name) => {
    if (name === 'MORNING') return 'Morning'
    if (name === 'EVENING') return 'Evening'
    if (name === 'NIGHT') return 'Night'
    return name
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentUser={currentUser} logout={logout} navigate={navigate} activePath="/admin/employees" />

      <main className="ml-56 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-400 mt-0.5">{employees.length} active staff members</p>
          </div>
          <button onClick={() => { setShowForm(true); setError('') }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            + Add Employee
          </button>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">✅ {success}</div>
        )}
        {resendSuccess && (
          <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3 rounded-xl">📧 Invite resent to {resendSuccess}.</div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm font-semibold text-gray-700">No employees yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first employee to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Shifts/Week</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Eligible Shifts</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{emp.full_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {getRoleBadge(emp.role)}
                        {emp.is_oncall && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 w-fit">On-call</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {emp.min_shifts_per_week}–{emp.max_shifts_per_week === 6 ? '5+' : emp.max_shifts_per_week}
                    </td>
                    <td className="px-5 py-4 text-gray-700">#{emp.priority_rank}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {emp.shift_eligibilities?.map(e => (
                          <span key={e.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            {getShiftLabel(e.shift_type_name)}
                          </span>
                        ))}
                        {(!emp.shift_eligibilities || emp.shift_eligibilities.length === 0) && (
                          <span className="text-xs text-gray-400">None set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => handleResendInvite(emp.id, emp.full_name)}
                          className="text-xs text-blue-600 hover:underline">
                          Resend invite
                        </button>
                        {emp.id !== currentUser?.id && (
                          <button onClick={() => setDeleteConfirm(emp)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50">
          <div className="bg-white h-full w-full max-w-lg overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add New Employee</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 flex-1">
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {/* Basic Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                    <input required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                    <input required value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hire Date</label>
                    <input type="date" value={form.hire_date} onChange={e => setForm(p => ({ ...p, hire_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Role & Settings */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Role & Scheduling</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority Rank</label>
                    <input type="number" min="1" value={form.priority_rank}
                      onChange={e => setForm(p => ({ ...p, priority_rank: parseInt(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Min Shifts/Week</label>
                    <select value={form.min_shifts_per_week} onChange={e => setForm(p => ({ ...p, min_shifts_per_week: parseInt(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {SHIFT_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n === 6 ? '5+' : n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Shifts/Week</label>
                    <select value={form.max_shifts_per_week} onChange={e => setForm(p => ({ ...p, max_shifts_per_week: parseInt(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {SHIFT_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n === 6 ? '5+' : n}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 bg-amber-50 rounded-lg px-3 py-2.5">
                    <input type="checkbox" id="oncall" checked={form.is_oncall}
                      onChange={e => setForm(p => ({ ...p, is_oncall: e.target.checked }))} className="rounded" />
                    <label htmlFor="oncall" className="text-sm text-amber-800 font-medium cursor-pointer">
                      On-call employee (only scheduled when shift has zero coverage)
                    </label>
                  </div>
                </div>
              </div>

              {/* Shift Eligibility — loaded from API */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Shift Eligibility</p>
                {shiftTypes.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading shift types...</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {shiftTypes.map(shift => {
                      const selected = form.shift_eligibilities.find(e => e.shift_type === shift.id)
                      return (
                        <div key={shift.id} className={`rounded-lg border transition-colors ${selected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <input type="checkbox" checked={!!selected}
                              onChange={() => toggleShiftEligibility(shift.id)}
                              className="rounded" id={`shift-${shift.id}`} />
                            <label htmlFor={`shift-${shift.id}`} className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                              {getShiftLabel(shift.name)} ({shift.start_time?.slice(0,5)} – {shift.end_time?.slice(0,5)})
                            </label>
                            {selected && (
                              <select value={selected.preference} onChange={e => updateShiftPref(shift.id, e.target.value)}
                                className="text-xs border border-blue-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                                {PREF_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Fixed Days Off */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fixed Days Off</p>
                <div className="flex flex-col gap-2">
                  {DAY_LABELS.map((day, idx) => {
                    const selected = form.fixed_days_off.find(d => d.day_of_week === idx)
                    return (
                      <div key={idx} className={`rounded-lg border transition-colors ${selected ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <input type="checkbox" checked={!!selected} onChange={() => toggleFixedDay(idx)}
                            className="rounded" id={`day-${idx}`} />
                          <label htmlFor={`day-${idx}`} className="text-sm font-medium text-gray-700 cursor-pointer flex-1">{day}</label>
                          {selected && (
                            <select value={selected.priority} onChange={e => updateDayPriority(idx, e.target.value)}
                              className="text-xs border border-red-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-auto">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {submitting ? 'Sending invite...' : 'Add & Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">Remove {deleteConfirm.full_name}?</h3>
            <p className="text-sm text-gray-500 mb-5">They will be deactivated and removed from future scheduling. Their history is kept.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}