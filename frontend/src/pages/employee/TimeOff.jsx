// Employee — Time-Off Requests
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getNextSunday() {
  const today = new Date()
  today.setHours(0,0,0,0)
  const day = today.getDay()
  const diff = day === 0 ? 7 : 7 - day
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + diff)
  return sunday
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getTuesdayCutoff(sunday) {
  // Tuesday midnight before the schedule generation Wednesday
  const tuesday = new Date(sunday)
  tuesday.setDate(sunday.getDate() - 5) // Sunday - 5 = previous Tuesday
  tuesday.setHours(23, 59, 59, 0)
  return tuesday
}

const STATUS_CONFIG = {
  PENDING:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Pending'  },
  APPROVED: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Approved' },
  DENIED:   { bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-200',    label: 'Denied'   },
}

export default function TimeOff() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [reason, setReason] = useState('')
  const [showReasonModal, setShowReasonModal] = useState(false)

  const sunday = getNextSunday()
  // Schedule covers next sunday to sunday+13
  const scheduleStart = sunday
  const scheduleEnd = addDays(sunday, 13)
  const cutoff = getTuesdayCutoff(sunday)
  const today = new Date()
  today.setHours(0,0,0,0)
  const isPastCutoff = new Date() > cutoff

  const fetchRequests = () => {
    setLoading(true)
    api.get('/timeoff/')
      .then(res => setAllRequests(res.data || []))
      .catch(() => setAllRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRequests() }, [])

  // My requests
  const myRequests = allRequests.filter(r => r.employee === currentUser?.id)

  // All requests mapped by date for the calendar
  const requestsByDate = {}
  allRequests.forEach(r => {
    if (!requestsByDate[r.date]) requestsByDate[r.date] = []
    requestsByDate[r.date].push(r)
  })

  // My request for a given date
  const myRequestForDate = (dateStr) => myRequests.find(r => r.date === dateStr) || null

  // Build calendar days for the 2-week schedule period
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(scheduleStart, i))

  const isDayRequestable = (day) => {
    const dateStr = formatDate(day)
    // Past cutoff = window closed
    if (isPastCutoff) return false
    // Already have a request for this day
    if (myRequestForDate(dateStr)) return false
    // Day is in the past
    if (day < today) return false
    return true
  }

  const handleDayClick = (day) => {
    if (!isDayRequestable(day)) return
    setSelectedDate(day)
    setReason('')
    setShowReasonModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedDate) return
    setSubmitting(true)
    try {
      await api.post('/timeoff/', {
        date: formatDate(selectedDate),
        reason,
      })
      showToast('✅ Request submitted!')
      setShowReasonModal(false)
      setSelectedDate(null)
      fetchRequests()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong.'
      showToast(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    setCancellingId(id)
    try {
      await api.delete(`/timeoff/${id}/`)
      showToast('Request cancelled.')
      fetchRequests()
    } catch {
      showToast('Could not cancel request.')
    } finally {
      setCancellingId(null)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const getDayState = (day) => {
    const dateStr = formatDate(day)
    const myReq = myRequestForDate(dateStr)
    const othersReqs = requestsByDate[dateStr]?.filter(r => r.employee !== currentUser?.id) || []
    const isPast = day < today

    if (myReq) return { type: 'mine', req: myReq, others: othersReqs }
    if (isPast || isPastCutoff) return { type: 'unavailable', others: othersReqs }
    return { type: 'open', others: othersReqs }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Back
          </button>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Shift<span className="text-blue-600">Sync</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{currentUser?.full_name}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Time Off</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Next schedule: {scheduleStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – {scheduleEnd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* Cutoff warning */}
        {isPastCutoff ? (
          <div className="mb-5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
            🔒 The request window has closed. New requests cannot be submitted for this schedule period.
          </div>
        ) : (
          <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700">
            ⏰ Requests close <strong>Tuesday midnight</strong> before the schedule is generated. Tap a day to request it off.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              {/* Month header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-800">
                  {MONTHS[scheduleStart.getMonth()]}
                  {scheduleStart.getMonth() !== scheduleEnd.getMonth() && ` – ${MONTHS[scheduleEnd.getMonth()]}`}
                  {' '}{scheduleStart.getFullYear()}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Mine</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Others</span>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Week 1 */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {calendarDays.slice(0, 7).map((day, i) => {
                  const state = getDayState(day)
                  const dateStr = formatDate(day)
                  const isToday = day.getTime() === today.getTime()
                  const othersCount = state.others.length

                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(day)}
                      disabled={state.type !== 'open'}
                      className={`relative rounded-xl p-2 flex flex-col items-center gap-1 min-h-[64px] transition-all border ${
                        state.type === 'mine'
                          ? state.req.status === 'APPROVED' ? 'bg-green-50 border-green-200 cursor-default'
                          : state.req.status === 'DENIED' ? 'bg-red-50 border-red-200 cursor-default'
                          : 'bg-blue-50 border-blue-200 cursor-default'
                        : state.type === 'unavailable'
                          ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'
                          : 'bg-white border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                      } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : state.type === 'unavailable' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>

                      {state.type === 'mine' && (
                        <span className={`text-xs font-semibold ${
                          state.req.status === 'APPROVED' ? 'text-green-600'
                          : state.req.status === 'DENIED' ? 'text-red-500'
                          : 'text-blue-600'
                        }`}>
                          {state.req.status === 'APPROVED' ? '✓' : state.req.status === 'DENIED' ? '✗' : '…'}
                        </span>
                      )}

                      {othersCount > 0 && (
                        <span className="flex gap-0.5">
                          {state.others.slice(0, 3).map((_, idx) => (
                            <span key={idx} className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                          ))}
                          {othersCount > 3 && <span className="text-xs text-gray-400">+</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Week 2 */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.slice(7, 14).map((day, i) => {
                  const state = getDayState(day)
                  const isToday = day.getTime() === today.getTime()
                  const othersCount = state.others.length

                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(day)}
                      disabled={state.type !== 'open'}
                      className={`relative rounded-xl p-2 flex flex-col items-center gap-1 min-h-[64px] transition-all border ${
                        state.type === 'mine'
                          ? state.req.status === 'APPROVED' ? 'bg-green-50 border-green-200 cursor-default'
                          : state.req.status === 'DENIED' ? 'bg-red-50 border-red-200 cursor-default'
                          : 'bg-blue-50 border-blue-200 cursor-default'
                        : state.type === 'unavailable'
                          ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'
                          : 'bg-white border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                      } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : state.type === 'unavailable' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>

                      {state.type === 'mine' && (
                        <span className={`text-xs font-semibold ${
                          state.req.status === 'APPROVED' ? 'text-green-600'
                          : state.req.status === 'DENIED' ? 'text-red-500'
                          : 'text-blue-600'
                        }`}>
                          {state.req.status === 'APPROVED' ? '✓' : state.req.status === 'DENIED' ? '✗' : '…'}
                        </span>
                      )}

                      {othersCount > 0 && (
                        <span className="flex gap-0.5">
                          {state.others.slice(0, 3).map((_, idx) => (
                            <span key={idx} className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                          ))}
                          {othersCount > 3 && <span className="text-xs text-gray-400">+</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Others' requests for visibility */}
            {allRequests.filter(r => r.employee !== currentUser?.id && r.status !== 'DENIED').length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Others' Requests</h2>
                <div className="flex flex-col gap-2">
                  {allRequests
                    .filter(r => r.employee !== currentUser?.id && r.status !== 'DENIED')
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(req => (
                      <div key={req.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {req.employee_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{req.employee_name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(req.date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[req.status].bg} ${STATUS_CONFIG[req.status].text}`}>
                          {STATUS_CONFIG[req.status].label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* My requests */}
            {myRequests.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Requests</h2>
                <div className="flex flex-col gap-2">
                  {myRequests.sort((a, b) => new Date(a.date) - new Date(b.date)).map(req => (
                    <div key={req.id} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${STATUS_CONFIG[req.status].bg} ${STATUS_CONFIG[req.status].border}`}>
                      <div>
                        <p className={`text-sm font-semibold ${STATUS_CONFIG[req.status].text}`}>
                          {new Date(req.date).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        {req.reason && <p className="text-xs text-gray-500 mt-0.5">{req.reason}</p>}
                        {req.manager_note && <p className="text-xs text-gray-400 mt-0.5 italic">Note: {req.manager_note}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${STATUS_CONFIG[req.status].text}`}>
                          {STATUS_CONFIG[req.status].label}
                        </span>
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={cancellingId === req.id}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            {cancellingId === req.id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Reason Modal */}
      {showReasonModal && selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Request Day Off</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. family event, appointment..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReasonModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Request'}
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