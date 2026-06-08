// =============================================================================
// ShiftSync — App Router
// =============================================================================
// TODO: Wire up all routes. Placeholder structure below.
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Public
import Login from './pages/Login'
import Register from './pages/Register'

// Employee
import EmployeeDashboard from './pages/employee/Dashboard'
import MySchedule from './pages/employee/MySchedule'
import TimeOff from './pages/employee/TimeOff'
import EmployeeNotifications from './pages/employee/Notifications'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import Employees from './pages/admin/Employees'
import Schedule from './pages/admin/Schedule'
import TimeOffRequests from './pages/admin/TimeOffRequests'
import ShiftTypes from './pages/admin/ShiftTypes'
import AdminNotifications from './pages/admin/Notifications'

// Common
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Employee routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'OWNER']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/my-schedule" element={
            <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'OWNER']}>
              <MySchedule />
            </ProtectedRoute>
          } />
          <Route path="/time-off" element={
            <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'OWNER']}>
              <TimeOff />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'OWNER']}>
              <EmployeeNotifications />
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <Employees />
            </ProtectedRoute>
          } />
          <Route path="/admin/schedule" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <Schedule />
            </ProtectedRoute>
          } />
          <Route path="/admin/time-off" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <TimeOffRequests />
            </ProtectedRoute>
          } />
          <Route path="/admin/shifts" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <ShiftTypes />
            </ProtectedRoute>
          } />
          <Route path="/admin/notifications" element={
            <ProtectedRoute roles={['MANAGER', 'OWNER']}>
              <AdminNotifications />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
