import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const Header = () => {
  console.log('Header component rendered')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="p-2 bg-dsba-navy rounded-lg group-hover:bg-blue-800 transition-colors">
              <img src="/dsba-logo.svg" alt="DSBA Logo" className="h-8 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="dsba-logo text-xl font-bold">DSBA HackArena</span>
              <span className="text-xs text-dsba-navy font-medium">College Hackathon Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
           <nav className="hidden md:flex items-center space-x-8">
             <Link to="/" className="text-gray-700 hover:text-dsba-navy transition-colors font-medium">
               Home
             </Link>
             <Link to="/join" className="text-gray-700 hover:text-dsba-navy transition-colors font-medium">
               Join Game
             </Link>
             {user ? (
               <>
                 <Link to="/dashboard" className="text-gray-700 hover:text-dsba-navy transition-colors font-medium">
                   Dashboard
                 </Link>
                 <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                   <div className="flex items-center space-x-2">
                     <div className="w-8 h-8 bg-dsba-navy rounded-full flex items-center justify-center text-white text-sm font-medium">
                       {user?.name?.charAt(0)?.toUpperCase()}
                     </div>
                     <span className="text-sm font-medium text-gray-700">Welcome, {user?.name}</span>
                   </div>
                   <button
                     onClick={handleLogout}
                     className="btn btn-secondary flex items-center hover:bg-red-50 hover:border-red-200"
                   >
                     <LogOut className="h-4 w-4 mr-2" />
                     Logout
                   </button>
                 </div>
               </>
             ) : (
               <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                 <Link to="/login" className="text-gray-700 hover:text-dsba-navy transition-colors font-medium">
                   Login
                 </Link>
                 <Link to="/register" className="btn btn-primary shadow-md hover:shadow-lg">
                   Get Started
                 </Link>
               </div>
             )}
           </nav>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
         {isMenuOpen && (
           <div className="md:hidden border-t border-gray-200 py-6 bg-gray-50">
             <nav className="flex flex-col space-y-4">
               <Link
                 to="/"
                 className="text-gray-700 hover:text-dsba-navy transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white"
                 onClick={() => setIsMenuOpen(false)}
               >
                 Home
               </Link>
               <Link
                 to="/join"
                 className="text-gray-700 hover:text-dsba-navy transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white"
                 onClick={() => setIsMenuOpen(false)}
               >
                 Join Game
               </Link>
               {user ? (
                 <>
                   <Link
                     to="/dashboard"
                     className="text-gray-700 hover:text-dsba-navy transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white"
                     onClick={() => setIsMenuOpen(false)}
                   >
                     Dashboard
                   </Link>
                   <div className="pt-4 border-t border-gray-200 mt-4">
                     <div className="flex items-center space-x-3 mb-4 px-4">
                       <div className="w-10 h-10 bg-dsba-navy rounded-full flex items-center justify-center text-white font-medium">
                         {user?.name?.charAt(0)?.toUpperCase()}
                       </div>
                       <span className="text-sm font-medium text-gray-700">Welcome, {user?.name}</span>
                     </div>
                     <button
                       onClick={() => {
                         handleLogout()
                         setIsMenuOpen(false)
                       }}
                       className="btn btn-secondary w-full flex items-center justify-center hover:bg-red-50 hover:border-red-200"
                     >
                       <LogOut className="h-4 w-4 mr-2" />
                       Logout
                     </button>
                   </div>
                 </>
               ) : (
                 <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200 mt-4">
                   <Link
                     to="/login"
                     className="text-gray-700 hover:text-dsba-navy transition-colors font-medium px-4 py-3 rounded-lg hover:bg-white text-center"
                     onClick={() => setIsMenuOpen(false)}
                   >
                     Login
                   </Link>
                   <Link
                     to="/register"
                     className="btn btn-primary text-center shadow-md"
                     onClick={() => setIsMenuOpen(false)}
                   >
                     Get Started
                   </Link>
                 </div>
               )}
             </nav>
           </div>
         )}
      </div>
    </header>
  )
}

export default Header