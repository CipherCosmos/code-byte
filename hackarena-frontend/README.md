# HackArena Frontend

A modern, responsive React frontend for HackArena, an inter-college hackathon game management system. Built with React, Vite, and Tailwind CSS for optimal performance and user experience.

## 🎯 Features

### Core Functionality
- **User Authentication**: Traditional login/register and Google OAuth integration
- **Game Management**: Create, configure, and manage hackathon games
- **Real-time Gameplay**: Live game interface with Socket.IO integration
- **Advanced Question Types**: Support for MCQ, code snippets, crossword puzzles, and more
- **Analytics Dashboard**: Comprehensive game analytics with interactive charts
- **Public Leaderboards**: Real-time ranking displays for participants

### Advanced Features
- **AI-Powered Evaluation**: Support for semantic code validation
- **Real-time Updates**: Live leaderboard and game state synchronization
- **Cheat Detection**: Real-time monitoring with visual feedback
- **File Uploads**: Image support for questions and user avatars
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Theme**: Modern UI with consistent design system

## 🛠 Technology Stack

- **Framework**: React 18 with Hooks
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Testing**: Jest + React Testing Library

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Running HackArena backend server

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hackarena-frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Google OAuth (for Google Sign-In)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Application Settings
VITE_APP_NAME=HackArena
VITE_APP_VERSION=1.0.0
```

### 3. Start Development Server

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
hackarena-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AnalyticsCharts.jsx
│   │   ├── GameCodeDisplay.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── QuestionForm.jsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx
│   ├── pages/               # Page components
│   │   ├── auth/            # Authentication pages
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── organizer/       # Organizer dashboard pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GameControl.jsx
│   │   │   └── GameAnalytics.jsx
│   │   ├── participant/     # Participant pages
│   │   │   ├── GameInterface.jsx
│   │   │   ├── JoinGame.jsx
│   │   │   └── PostGameAnalytics.jsx
│   │   ├── public/          # Public pages
│   │   │   └── PublicLeaderboard.jsx
│   │   ├── Home.jsx
│   │   └── App.jsx
│   ├── utils/               # Utility functions
│   │   ├── api.js
│   │   ├── cheatDetection.js
│   │   └── socket.js
│   ├── index.css            # Global styles
│   └── main.jsx             # Application entry point
├── tests/                   # Test files
├── package.json
├── vite.config.js
├── tailwind.config.js
├── jest.config.js
└── README.md
```

## 🎨 Component Architecture

### Key Components

#### AnalyticsCharts
Interactive charts for game analytics using Recharts:
- Bar charts for score distribution and question accuracy
- Line charts for performance over time
- Pie charts for qualification status and accuracy ranges
- Responsive design with customizable themes

#### QuestionForm
Comprehensive form for creating and editing questions:
- Support for all question types (MCQ, code, crossword, etc.)
- Dynamic form fields based on question type
- Image upload integration
- JSON configuration for complex question types

#### AuthContext
Authentication state management:
- JWT token handling
- Google OAuth integration
- Automatic token refresh
- Protected route management

### Page Components

#### Organizer Pages
- **Dashboard**: Game overview and management
- **GameControl**: Real-time game management interface
- **GameAnalytics**: Comprehensive analytics dashboard

#### Participant Pages
- **GameInterface**: Live game participation interface
- **JoinGame**: Game code entry and participant registration
- **PostGameAnalytics**: Individual performance review

#### Public Pages
- **PublicLeaderboard**: Real-time leaderboard display
- **Home**: Landing page with feature overview

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | Required for Google auth |
| `VITE_APP_NAME` | Application display name | `HackArena` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

### Tailwind Configuration

Custom Tailwind configuration in `tailwind.config.js`:
- Custom color palette
- Extended spacing and typography
- Component-specific utilities
- Dark mode support

## 🎮 User Flows

### Organizer Flow
1. **Authentication**: Login/register or Google OAuth
2. **Dashboard**: View and manage games
3. **Game Creation**: Configure game settings and qualification rules
4. **Question Setup**: Add questions with various types and settings
5. **Game Control**: Start, pause, and manage live games
6. **Analytics**: Review comprehensive game analytics

### Participant Flow
1. **Join Game**: Enter game code or scan QR code
2. **Registration**: Provide name and avatar
3. **Gameplay**: Answer questions in real-time
4. **Live Updates**: View real-time leaderboard and rankings
5. **Post-Game**: Review personal performance

## 🔄 Real-time Features

### Socket.IO Integration
- **Game State Sync**: Real-time game status updates
- **Live Leaderboard**: Instant ranking changes
- **Question Broadcasting**: Synchronized question delivery
- **Answer Reveals**: Coordinated answer displays
- **Cheat Detection**: Real-time penalty notifications
- **Participant Management**: Live participant count and status

### Event Handling
```javascript
// Example socket event handling
socket.on('nextQuestion', (data) => {
  setCurrentQuestion(data.question);
  setTimeRemaining(data.question.timeLimit);
});

socket.on('leaderboardUpdate', (leaderboard) => {
  setLeaderboard(leaderboard);
});
```

## 📊 Analytics Dashboard

### Available Charts
- **Score Distribution**: Histogram of participant scores
- **Question Accuracy**: Per-question success rates
- **Performance Timeline**: Accuracy trends over game phases
- **Qualification Status**: Pass/fail distribution
- **Time Analysis**: Average completion times

### Export Features
- **CSV Export**: Raw data for external analysis
- **PDF Reports**: Formatted reports for stakeholders
- **Real-time Updates**: Live data during active games

## 🎨 UI/UX Design

### Design System
- **Color Palette**: Consistent primary/secondary colors
- **Typography**: Hierarchical text sizing with Tailwind utilities
- **Spacing**: Standardized padding and margins
- **Components**: Reusable button, card, and form components

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Adaptive layouts for tablets
- **Desktop Enhancement**: Full-featured desktop experience
- **Touch-Friendly**: Appropriate touch targets and gestures

## 🧪 Testing

### Test Structure
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Testing Stack
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **Jest DOM**: DOM-specific assertions
- **User Event**: User interaction simulation

### Test Categories
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Multi-component interaction testing
- **E2E Tests**: Full user flow testing (planned)

## 🚀 Deployment

### Build Process
```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Deployment Options

#### Static Hosting (Netlify, Vercel, etc.)
```javascript
// vite.config.js
export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  base: process.env.NODE_ENV === 'production' ? '/your-base-path/' : '/'
})
```

#### Docker Deployment
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Builds
- **Development**: Hot reload, source maps, debug logging
- **Production**: Minified code, optimized assets, error boundaries

## 🔧 Development

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting (planned)
- **Husky**: Git hooks for quality checks (planned)

### Performance Optimization
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Dynamic imports for heavy components
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Analysis**: Webpack bundle analyzer integration

## 🐛 Troubleshooting

### Common Issues

**API Connection Problems**
- Verify backend server is running
- Check `VITE_API_BASE_URL` configuration
- Ensure CORS is properly configured

**Socket.IO Connection Issues**
- Confirm backend WebSocket server is accessible
- Check network/firewall settings
- Verify Socket.IO client version compatibility

**Google OAuth Issues**
- Validate Google Client ID configuration
- Ensure OAuth consent screen is set up
- Check redirect URIs match deployment URL

**Build/Deployment Issues**
- Clear node_modules and reinstall dependencies
- Verify Node.js version compatibility
- Check build logs for specific errors

### Debug Mode
Enable development logging:
```javascript
// In development mode
localStorage.setItem('debug', 'hackarena:*');
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/hackarena-frontend.git`
3. Install dependencies: `npm install`
4. Create feature branch: `git checkout -b feature/your-feature-name`
5. Make changes and test thoroughly
6. Submit pull request

### Code Standards
- Use functional components with hooks
- Follow React best practices
- Maintain consistent naming conventions
- Add proper TypeScript types (planned)
- Write comprehensive tests for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the backend API documentation
- Create an issue in the repository

## 🔄 Recent Updates

### New Features
- **Google Authentication**: One-click login with Google accounts
- **Advanced Question Types**: Support for crossword puzzles and image-based questions
- **Real-time Analytics**: Live dashboard with interactive charts
- **Enhanced UI/UX**: Modern design with improved responsiveness
- **Cheat Detection UI**: Visual feedback for security measures
- **Export Functionality**: CSV and PDF report generation

### Technical Improvements
- Migrated to Vite for faster development
- Implemented comprehensive testing suite
- Added TypeScript support (planned)
- Enhanced performance with code splitting
- Improved accessibility and SEO
- Added comprehensive error boundaries

### UI Enhancements
- Responsive design for all screen sizes
- Dark/light theme support
- Improved loading states and animations
- Better form validation and user feedback
- Enhanced mobile experience
- Accessible design patterns