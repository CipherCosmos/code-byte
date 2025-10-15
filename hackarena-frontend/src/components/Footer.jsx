import { Link } from 'react-router-dom'
import { Trophy, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-dsba-navy rounded-xl">
                <img src="/dsba-logo.svg" alt="DSBA Logo" className="h-8 w-auto" />
              </div>
              <div className="flex flex-col">
                <span className="dsba-logo text-white text-xl font-bold">DSBA HackArena</span>
                <span className="text-sm text-dsba-gold font-medium">College Hackathon Platform</span>
              </div>
            </div>
            <p className="text-gray-300 mb-6 max-w-lg leading-relaxed">
              Empowering DSBA college hackathons with real-time competition technology.
              Built for live technical events with enterprise-grade reliability and performance.
            </p>
            <div className="flex space-x-6">
              <a
                href="mailto:itclub@dsba.edu.in"
                className="text-gray-400 hover:text-dsba-gold transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Email DSBA IT Club"
              >
                <Mail className="h-6 w-6" />
              </a>
              <a
                href="tel:+919876543210"
                className="text-gray-400 hover:text-dsba-gold transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Call DSBA"
              >
                <Phone className="h-6 w-6" />
              </a>
              <a
                href="https://maps.google.com/?q=DSBA+Business+Academy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dsba-gold transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Find DSBA on map"
              >
                <MapPin className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
           <div>
             <h3 className="text-white font-bold mb-6 text-lg">Quick Links</h3>
             <ul className="space-y-3">
               <li>
                 <Link to="/" className="hover:text-dsba-gold transition-colors flex items-center group">
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Home
                 </Link>
               </li>
               <li>
                 <Link to="/join" className="hover:text-dsba-gold transition-colors flex items-center group">
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Join Game
                 </Link>
               </li>
               <li>
                 <Link to="/login" className="hover:text-dsba-gold transition-colors flex items-center group">
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Organizer Login
                 </Link>
               </li>
               <li>
                 <Link to="/register" className="hover:text-dsba-gold transition-colors flex items-center group">
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Create Account
                 </Link>
               </li>
             </ul>
           </div>

           {/* Support */}
           <div>
             <h3 className="text-white font-bold mb-6 text-lg">Support</h3>
             <ul className="space-y-3">
               <li>
                 <a
                   href="mailto:support@dsba.edu.in"
                   className="hover:text-dsba-gold transition-colors flex items-center group"
                 >
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Contact Support
                   <ExternalLink className="h-4 w-4 ml-2 opacity-60" />
                 </a>
               </li>
               <li>
                 <a
                   href="https://dsba.edu.in"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="hover:text-dsba-gold transition-colors flex items-center group"
                 >
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   DSBA Website
                   <ExternalLink className="h-4 w-4 ml-2 opacity-60" />
                 </a>
               </li>
               <li>
                 <a
                   href="https://github.com/dsba-it-club"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="hover:text-dsba-gold transition-colors flex items-center group"
                 >
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   GitHub
                   <ExternalLink className="h-4 w-4 ml-2 opacity-60" />
                 </a>
               </li>
               <li>
                 <a
                   href="https://docs.dsba.edu.in/hackarena"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="hover:text-dsba-gold transition-colors flex items-center group"
                 >
                   <span className="w-2 h-2 bg-dsba-gold rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                   Documentation
                   <ExternalLink className="h-4 w-4 ml-2 opacity-60" />
                 </a>
               </li>
             </ul>
           </div>
        </div>

        {/* Bottom Section */}
         <div className="border-t border-gray-700 mt-12 pt-8">
           <div className="flex flex-col md:flex-row justify-between items-center">
             <div className="flex items-center space-x-3 mb-6 md:mb-0">
               <div className="p-2 bg-dsba-navy rounded-lg">
                 <Trophy className="h-5 w-5 text-dsba-gold" />
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-white">
                   Developed by DSBA IT Club
                 </span>
                 <span className="text-xs text-gray-400">
                   Dayananda Sagar Business Academy
                 </span>
               </div>
             </div>
             <div className="text-sm text-gray-400 font-medium">
               © {currentYear} DSBA HackArena. All rights reserved.
             </div>
           </div>
         </div>
      </div>
    </footer>
  )
}

export default Footer