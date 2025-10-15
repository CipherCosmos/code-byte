import { Link } from 'react-router-dom'
import {
  Trophy,
  Users,
  Clock,
  Shield,
  BarChart3,
  Zap,
  ArrowRight,
  Play,
  UserPlus,
  Smartphone,
  Eye,
  CheckCircle
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BreadcrumbNavigation from '../components/BreadcrumbNavigation'
import { useCommonShortcuts } from '../hooks/useKeyboardShortcuts'

const Home = () => {
  // Enable keyboard shortcuts
  useCommonShortcuts()

  const features = [
    {
      icon: <Trophy className="h-8 w-8" />,
      title: "Real-time Competition",
      description: "Live hackathon games with instant leaderboards and scoring"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "500+ Participants",
      description: "Support for massive concurrent participation"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Time-based Scoring",
      description: "Faster responses earn more points with dynamic scoring"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Anti-cheat Protection",
      description: "Advanced cheat detection and prevention system"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Live Analytics",
      description: "Real-time performance insights and detailed reports"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Multiple Question Types",
      description: "MCQ, Code snippets, Fill-in-blanks, and more"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Mobile Optimized",
      description: "Fully responsive design that works perfectly on all devices"
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Accessibility First",
      description: "Screen reader support, keyboard navigation, and WCAG compliance"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbNavigation />
      <Header />

      {/* Hero Section */}
      <section className="relative dsba-hero-gradient text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-8">
            <img src="/dsba-logo.svg" alt="DSBA Logo" className="h-6 w-auto" />
            <span className="text-sm font-medium">Dayananda Sagar Business Academy</span>
          </div>
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            DSBA Inter-College
            <span className="block dsba-accent text-7xl font-extrabold">Hackathon Platform</span>
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Host live technical competitions with real-time scoring, anti-cheat protection,
            and support for 500+ concurrent participants. Perfect for college fests and tech events.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/register" className="btn bg-white text-dsba-navy hover:bg-gray-100 text-lg px-10 py-4 shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all focus:ring-4 focus:ring-white/30">
              <UserPlus className="h-6 w-6 mr-3" />
              Create Account
              <span className="sr-only">Create organizer account to host hackathon games</span>
            </Link>
            <Link to="/join" className="btn bg-transparent border-2 border-white text-white hover:bg-white hover:text-dsba-navy text-lg px-10 py-4 shadow-xl hover:shadow-white/25 transform hover:scale-105 transition-all focus:ring-4 focus:ring-white/30">
              <Play className="h-6 w-6 mr-3" />
              Join Game
              <span className="sr-only">Join an existing hackathon game as a participant</span>
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-blue-100 text-sm">
              ⌨️ <strong>Keyboard shortcuts:</strong> Press <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs">G+H</kbd> for Home, <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs">G+J</kbd> to Join Game, <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs">?</kbd> for help
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Everything You Need for Live Competitions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Designed specifically for college hackathons and technical events with
              enterprise-grade reliability and real-time performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 border-l-4 border-dsba-navy group">
                <div className="text-dsba-navy mb-4 p-2 bg-blue-50 rounded-lg w-fit group-hover:bg-dsba-navy group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  {feature.description}
                </p>
                {index >= 6 && (
                  <div className="mt-3">
                    <CheckCircle className="h-4 w-4 text-green-500 inline mr-1" />
                    <span className="text-xs text-green-600 font-medium">New Feature</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How HackArena Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple setup, powerful features, seamless execution
            </p>
          </div>
          
          <div className="space-y-12">
            <div className="flex items-center space-x-8">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold">Create Your Game</h3>
                </div>
                <p className="text-gray-600 ml-14">
                  Set up questions, configure scoring rules, and generate QR codes for easy participant access.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold">Participants Join</h3>
                </div>
                <p className="text-gray-600 ml-14">
                  Students scan QR codes or enter game codes to join. Anti-duplication ensures fair play.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold">Live Competition</h3>
                </div>
                <p className="text-gray-600 ml-14">
                  Control the game flow, reveal answers, and watch real-time leaderboards update instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-dsba-navy via-blue-800 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Host Your Next DSBA Hackathon?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join hundreds of organizers already using DSBA HackArena for their technical events.
          </p>
          <Link
            to="/register"
            className="btn bg-white text-dsba-navy hover:bg-gray-100 text-xl px-12 py-4 inline-flex items-center shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all font-bold"
          >
            Start Free Today
            <ArrowRight className="h-6 w-6 ml-3" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Home