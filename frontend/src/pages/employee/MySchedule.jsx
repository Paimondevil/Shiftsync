// Employee — My Schedule
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const SHIFT_CONFIG = {
  MORNING: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Morning', time: '7am–3pm' },
  EVENING: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Evening', time: '3pm–11pm' },
  NIGHT:   { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-400', label: 'Night', time: '11pm–7am' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getNextScheduleSunday() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 0 : 7 - day
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + diff)
  sunday.setHours(0, 0, 0, 0)
  return sunday
}

function formatWeekStart(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString()
}

export default function MySchedule() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(getNextScheduleSunday())
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const weekStr = formatWeekStart(weekStart)
    api.get(`/schedule/?week_start=${weekStr}`)
      .then(res => setSchedule(res.data))
      .catch(err => {
        if (err.response?.status === 404) {
          setSchedule(null)
          setError('No schedule available for this period yet.')
        } else if (err.response?.status === 403) {
          setSchedule(null)
          setError('Schedule has not been published yet.')
        } else {
          setError('Failed to load schedule.')
        }
      })
      .finally(() => setLoading(false))
  }, [weekStart])

  const goBack = () => {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 14)
    setWeekStart(prev)
  }

  const goForward = () => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 14)
    setWeekStart(next)
  }

  // Get my shifts from the schedule
  const myShifts = schedule?.shifts?.filter(s => s.employee === currentUser?.id) || []

  // Build 2-week grid: 14 days
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))

  const getMyShiftForDay = (day) => {
    const dateStr = formatWeekStart(day)
    return myShifts.find(s => s.date === dateStr) || null
  }

  const formatHeaderDate = (date) => {
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  const formatPeriod = () => {
    const end = addDays(weekStart, 13)
    return `${weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const totalShifts = myShifts.length
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingShift = myShifts
    .filter(s => new Date(s.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]

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

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Title + Nav */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-sm text-gray-400 mt-0.5">{formatPeriod()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">
              ←
            </button>
            <button onClick={goForward}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">
              →
            </button>
          </div>
        </div>

        {/* Upcoming shift banner */}
        {upcomingShift && !loading && (
          <div className={`mb-6 rounded-2xl border p-4 flex items-center gap-4 ${SHIFT_CONFIG[upcomingShift.shift_type_name]?.bg} ${SHIFT_CONFIG[upcomingShift.shift_type_name]?.border}`}>
            <span className="text-2xl">⏰</span>
            <div>
              <p className={`text-sm font-semibold ${SHIFT_CONFIG[upcomingShift.shift_type_name]?.text}`}>
                Next shift: {upcomingShift.shift_type_name} — {SHIFT_CONFIG[upcomingShift.shift_type_name]?.time}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(upcomingShift.date).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm font-semibold text-gray-700">{error}</p>
            <p className="text-xs text-gray-400 mt-1">Check back later or contact your manager.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalShifts}</p>
                <p className="text-xs text-gray-400 mt-0.5">Shifts this period</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalShifts * 8}h</p>
                <p className="text-xs text-gray-400 mt-0.5">Total hours</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className={`text-2xl font-bold ${schedule?.status === 'LOCKED' ? 'text-green-600' : 'text-amber-500'}`}>
                  {schedule?.status === 'LOCKED' ? '🔒' : schedule?.status === 'APPROVED' ? '✅' : '📝'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{schedule?.status?.toLowerCase()}</p>
              </div>
            </div>

            {/* Week 1 */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Week 1 — {weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} to {addDays(weekStart, 6).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(0, 7).map((day, i) => {
                  const shift = getMyShiftForDay(day)
                  const isToday = isSameDay(day, new Date())
                  const isPast = day < today
                  const cfg = shift ? SHIFT_CONFIG[shift.shift_type_name] : null
                  return (
                    <div key={i} className={`rounded-2xl border p-3 flex flex-col items-center gap-2 min-h-[100px] transition-all ${
                      isToday ? 'border-blue-400 bg-blue-50' :
                      shift ? `${cfg.border} ${cfg.bg}` :
                      isPast ? 'border-gray-100 bg-gray-50' :
                      'border-gray-100 bg-white'
                    }`}>
                      <p className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{DAYS[i]}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-blue-700' : isPast ? 'text-gray-300' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </p>
                      {shift ? (
                        <div className="text-center">
                          <span className={`flex items-center justify-center gap-1 text-xs font-semibold ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <p className={`text-xs mt-0.5 ${cfg.text} opacity-70`}>{cfg.time}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300">Off</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Week 2 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Week 2 — {addDays(weekStart, 7).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} to {addDays(weekStart, 13).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(7, 14).map((day, i) => {
                  const shift = getMyShiftForDay(day)
                  const isToday = isSameDay(day, new Date())
                  const isPast = day < today
                  const cfg = shift ? SHIFT_CONFIG[shift.shift_type_name] : null
                  return (
                    <div key={i} className={`rounded-2xl border p-3 flex flex-col items-center gap-2 min-h-[100px] transition-all ${
                      isToday ? 'border-blue-400 bg-blue-50' :
                      shift ? `${cfg.border} ${cfg.bg}` :
                      isPast ? 'border-gray-100 bg-gray-50' :
                      'border-gray-100 bg-white'
                    }`}>
                      <p className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{DAYS[i]}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-blue-700' : isPast ? 'text-gray-300' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </p>
                      {shift ? (
                        <div className="text-center">
                          <span className={`flex items-center justify-center gap-1 text-xs font-semibold ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <p className={`text-xs mt-0.5 ${cfg.text} opacity-70`}>{cfg.time}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300">Off</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}