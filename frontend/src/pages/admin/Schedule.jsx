// Admin — Schedule Page
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

const SHIFT_CONFIG = {
  MORNING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: '7–3am',   full: 'Morning 7am–3pm' },
  EVENING: { bg: 'bg-blue-100',  text: 'text-blue-800',  border: 'border-blue-300',  label: '3–11pm',  full: 'Evening 3pm–11pm' },
  NIGHT:   { bg: 'bg-indigo-900',text: 'text-indigo-100',border: 'border-indigo-700',label: '11–7am',  full: 'Night 11pm–7am' },
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function getNextSunday() {
  const today = new Date()
  today.setHours(0,0,0,0)
  const day = today.getDay()
  const diff = day === 0 ? 7 : 7 - day
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + diff)
  return sunday
}

export default function Schedule() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState(null)
  const [employees, setEmployees] = useState([])
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingShift, setEditingShift] = useState(null)
  const [editEmployee, setEditEmployee] = useState('')
  const [weekStart] = useState(getNextSunday())

  const fetchSchedule = () => {
    setLoading(true)
    api.get(`/schedule/?week_start=${formatDate(weekStart)}`)
      .then(res => setSchedule(res.data))
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSchedule()
    api.get('/employees/').then(res => setEmployees((res.data || []).filter(e => !e.is_deleted && e.is_active)))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/schedule/generate/', {})
      setSchedule(res.data.schedule)
      setWarnings(res.data.warnings || [])
      showToast('✅ Schedule generated!')
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Failed to generate.'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async () => {
    if (!schedule) return
    setApproving(true)
    try {
      const res = await api.patch(`/schedule/${schedule.id}/approve/`)
      setSchedule(res.data)
      showToast('✅ Schedule approved and sent to everyone!')
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Failed to approve.'}`)
    } finally {
      setApproving(false)
    }
  }

  const handleEditShift = async () => {
    if (!editingShift || !editEmployee) return
    try {
      await api.put(`/schedule/shift/${editingShift.shiftId}/`, { employee: parseInt(editEmployee) })
      showToast('✅ Shift updated.')
      setEditingShift(null)
      setEditEmployee('')
      fetchSchedule()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Failed to update.'}`)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const isEditable = () => {
    if (!schedule) return false
    if (schedule.status === 'DRAFT') return true
    if (schedule.status === 'APPROVED' && schedule.approved_at) {
      return (new Date() - new Date(schedule.approved_at)) / 3600000 < 24
    }
    return false
  }

  const getStatusBadge = () => {
    if (!schedule) return null
    const s = schedule.status
    if (s === 'DRAFT')    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Draft</span>
    if (s === 'APPROVED') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">Approved</span>
    if (s === 'LOCKED')   return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">🔒 Locked</span>
    return null
  }

  // Build 14 days
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))
  const week1 = days.slice(0, 7)
  const week2 = days.slice(7, 14)

  // Get shift for a specific employee + date
  const getShiftForEmployee = (employeeId, date) => {
    if (!schedule?.shifts) return null
    const dateStr = formatDate(date)
    return schedule.shifts.find(s => s.employee === employeeId && s.date === dateStr) || null
  }

  // Unique employees in the schedule, sorted by priority
  const scheduledEmployeeIds = [...new Set(schedule?.shifts?.map(s => s.employee) || [])]
  const scheduledEmployees = scheduledEmployeeIds
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean)
    .sort((a, b) => a.priority_rank - b.priority_rank)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentUser={currentUser} logout={logout} navigate={navigate} activePath="/admin/schedule" />

      <main className="ml-56 flex-1 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – {addDays(weekStart, 13).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            {!schedule && (
              <button onClick={handleGenerate} disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-50">
                {generating ? 'Generating...' : '⚡ Generate Schedule'}
              </button>
            )}
            {schedule?.status === 'DRAFT' && (
              <>
                <button onClick={handleGenerate} disabled={generating}
                  className="border border-gray-200 bg-white text-gray-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                  {generating ? 'Regenerating...' : '↺ Regenerate'}
                </button>
                <button onClick={handleApprove} disabled={approving}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-50">
                  {approving ? 'Approving...' : '✓ Approve & Send'}
                </button>
              </>
            )}
            {schedule?.status === 'APPROVED' && isEditable() && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                ⏰ 24hr edit window active
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-6">
          {Object.entries(SHIFT_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.border} border`}>
              <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.full}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold text-gray-400">— Off</span>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 flex flex-col gap-2">
            {warnings.map((w, i) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                ⚠️ {w.message}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !schedule ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-base font-bold text-gray-800 mb-2">No schedule yet</p>
            <p className="text-sm text-gray-400 mb-6">Generate the 2-week schedule to get started.</p>
            <button onClick={handleGenerate} disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-3 rounded-xl disabled:opacity-50">
              {generating ? 'Generating...' : '⚡ Generate Schedule'}
            </button>
          </div>
        ) : (
          <>
            <ScheduleGrid
              label="Week 1"
              dateRange={`${week1[0].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} to ${week1[6].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
              days={week1}
              employees={scheduledEmployees}
              getShiftForEmployee={getShiftForEmployee}
              isEditable={isEditable()}
              onEdit={(shift, date) => { setEditingShift({ shiftId: shift.id, date: shift.date, shiftTypeName: shift.shift_type_name }); setEditEmployee('') }}
            />
            <div className="mt-6">
              <ScheduleGrid
                label="Week 2"
                dateRange={`${week2[0].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} to ${week2[6].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
                days={week2}
                employees={scheduledEmployees}
                getShiftForEmployee={getShiftForEmployee}
                isEditable={isEditable()}
                onEdit={(shift, date) => { setEditingShift({ shiftId: shift.id, date: shift.date, shiftTypeName: shift.shift_type_name }); setEditEmployee('') }}
              />
            </div>
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Edit Shift</h3>
            <p className="text-sm text-gray-500 mb-4">
              {editingShift.shiftTypeName} — {new Date(editingShift.date).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign Employee</label>
              <select value={editEmployee} onChange={e => setEditEmployee(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditingShift(null); setEditEmployee('') }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleEditShift} disabled={!editEmployee}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50">
                Save
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

function ScheduleGrid({ label, dateRange, days, employees, getShiftForEmployee, isEditable, onEdit }) {
  const today = formatDate(new Date())

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Week header */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label} — {dateRange}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              {/* Name column header */}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 w-28 sticky left-0 z-10">
                Employee
              </th>
              {/* Day headers */}
              {days.map((day, i) => {
                const dateStr = formatDate(day)
                const isToday = dateStr === today
                return (
                  <th key={i} className={`px-3 py-3 text-center w-24 ${isToday ? 'bg-blue-50' : ''}`}>
                    <p className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                      {DAYS_SHORT[day.getDay()]}
                    </p>
                    <p className={`text-base font-bold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </p>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                {/* Employee name */}
                <td className="px-4 py-3 bg-white sticky left-0 z-10 border-r border-gray-100">
                  <p className="font-semibold text-gray-800 text-sm">{emp.first_name}</p>
                  {emp.is_oncall && <p className="text-xs text-amber-500">on-call</p>}
                </td>
                {/* Shift cells */}
                {days.map((day, i) => {
                  const shift = getShiftForEmployee(emp.id, day)
                  const dateStr = formatDate(day)
                  const isToday = dateStr === today
                  const cfg = shift ? SHIFT_CONFIG[shift.shift_type_name] : null

                  return (
                    <td key={i} className={`px-2 py-2 text-center ${isToday ? 'bg-blue-50/40' : ''}`}>
                      {shift ? (
                        <div className={`rounded-lg px-2 py-2 ${cfg.bg} ${cfg.border} border`}>
                          <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
                          {shift.is_override && (
                            <p className="text-xs text-purple-400 mt-0.5">✎</p>
                          )}
                          {isEditable && (
                            <button
                              onClick={() => onEdit(shift, day)}
                              className="text-xs text-gray-400 hover:text-blue-600 mt-0.5 transition-colors block w-full"
                            >
                              edit
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg px-2 py-2 bg-gray-50 border border-gray-100">
                          <p className="text-xs text-gray-300 font-medium">—</p>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}