// =============================================================================
// Navbar — Top navigation bar
// TODO: Implement with role-based nav links and notification bell
// =============================================================================

import { useAuth } from '../../context/AuthContext'

function Navbar() {
  const { currentUser, logout } = useAuth()

  // TODO: implement full navbar
  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <span className="font-bold text-lg">ShiftSync</span>
      <button onClick={logout} className="text-sm hover:underline">Logout</button>
    </nav>
  )
}

export default Navbar
