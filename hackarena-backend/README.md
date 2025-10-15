# HackArena Backend

A comprehensive backend API server for HackArena, an inter-college hackathon game management system built with Node.js, Express, and SQLite.

## 🚀 Features

### Core Functionality
- **User Authentication**: Traditional email/password and Google OAuth integration
- **Game Management**: Create, configure, and manage hackathon games
- **Real-time Gameplay**: Socket.IO-powered live game sessions
- **Advanced Question Types**: MCQ, fill-in-blank, code snippets, true/false, short answers, image-based, and crossword puzzles
- **Cheat Detection**: Real-time monitoring and penalty system
- **Analytics & Reporting**: Comprehensive game analytics with CSV/PDF export
- **Qualification System**: Flexible qualification rules (top N, percentage, custom threshold)

### Advanced Features
- **AI-Powered Evaluation**: Semantic validation for code and text answers
- **Enhanced Scoring**: Time decay, partial marking, and hint penalties
- **Real-time Leaderboards**: Live ranking updates during games
- **Game Control**: Pause, resume, eliminate participants, and manual interventions
- **File Uploads**: Image support for questions and user avatars

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite with sqlite3
- **Authentication**: JWT + Google OAuth2
- **Real-time**: Socket.IO
- **File Handling**: Multer
- **PDF Generation**: PDFKit
- **QR Codes**: qrcode
- **Validation**: Joi

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google OAuth credentials (for Google authentication)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hackarena-backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=./database/hackarena.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

### 3. Database Setup

```bash
# Initialize database
npm run migrate
```

### 4. Start Development Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/api/auth/login`
Authenticate user with email and password.

#### POST `/api/auth/google`
Authenticate using Google OAuth ID token.

#### GET `/api/auth/verify`
Verify JWT token and return user information.

### Game Management Endpoints

#### GET `/api/games`
Get all games for the authenticated organizer.

#### POST `/api/games`
Create a new game.

**Request Body:**
```json
{
  "title": "Spring Hackathon 2024",
  "description": "Annual coding competition",
  "maxParticipants": 500,
  "qualificationType": "top_percentage",
  "qualificationThreshold": 50
}
```

#### GET `/api/games/:gameId`
Get detailed information about a specific game.

#### PUT `/api/games/:gameId`
Update game configuration.

#### DELETE `/api/games/:gameId`
Delete a game.

### Question Management

#### POST `/api/games/:gameId/questions`
Add a question to a game.

**Supported Question Types:**
- `mcq`: Multiple Choice Questions
- `fill`: Fill in the Blank
- `code`: Code Snippet (with AI evaluation modes)
- `truefalse`: True/False
- `short`: Short Answer
- `image`: Image-based questions
- `crossword`: Crossword puzzles

**Code Evaluation Modes:**
- `mcq`: Auto-check against key
- `textarea`: AI-based semantic validation
- `compiler`: Test case validation

#### PUT `/api/games/:gameId/questions/:questionId`
Update an existing question.

#### DELETE `/api/games/:gameId/questions/:questionId`
Remove a question from the game.

### Game Control Endpoints

#### POST `/api/games/:gameId/start`
Start the game and begin the first question.

#### POST `/api/games/:gameId/next-question`
Move to the next question.

#### POST `/api/games/:gameId/reveal-answer`
Reveal the correct answer and update scores.

#### POST `/api/games/:gameId/end`
End the game and apply qualification rules.

#### POST `/api/games/:gameId/pause`
Pause the current game session.

#### POST `/api/games/:gameId/resume`
Resume a paused game.

### Analytics Endpoints

#### GET `/api/analytics/games/:gameId/overview`
Get comprehensive game overview analytics.

#### GET `/api/analytics/games/:gameId/questions`
Get per-question performance analytics.

#### GET `/api/analytics/games/:gameId/participants`
Get participant performance analytics.

#### GET `/api/analytics/games/:gameId/top-performers`
Get top performing participants.

#### GET `/api/analytics/games/:gameId/performance-breakdown`
Get performance breakdown by game phases.

#### GET `/api/analytics/games/:gameId/export/csv`
Export game results as CSV.

#### GET `/api/analytics/games/:gameId/export/pdf`
Export game results as PDF.

### Public Endpoints

#### GET `/api/games/:gameCode/leaderboard`
Get public leaderboard for a game (no authentication required).

## 🎮 Game Flow

1. **Setup Phase**: Organizer creates game, configures questions, and sets qualification rules
2. **Registration Phase**: Participants join using game code or QR code
3. **Game Start**: Organizer initiates the game, questions are presented sequentially
4. **Live Gameplay**: Real-time answering with time limits and hint penalties
5. **Cheat Detection**: Automatic monitoring with progressive penalties
6. **Scoring**: Dynamic scoring with time decay and partial marking
7. **Qualification**: Automatic qualification based on configured rules
8. **Analytics**: Comprehensive post-game analysis and reporting

## 🔧 Configuration

### Qualification Types

- `none`: No qualification rules
- `top_n`: Top N participants qualify
- `top_percentage`: Top X% of participants qualify
- `custom_threshold`: Participants above score threshold qualify

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing secret | Required |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Required for Google auth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Required for Google auth |
| `DATABASE_URL` | SQLite database path | `./database/hackarena.db` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Maximum upload file size (bytes) | `5242880` |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: Secure third-party authentication
- **Input Validation**: Joi schema validation for all inputs
- **File Upload Security**: Type and size restrictions
- **Cheat Detection**: Real-time monitoring and penalties
- **CORS Protection**: Configured cross-origin policies

## 📊 Analytics & Reporting

### Available Metrics
- Overall game statistics (participants, accuracy, completion time)
- Per-question performance analysis
- Participant ranking and qualification status
- Performance breakdown by game phases
- Score distribution analysis
- Export capabilities (CSV/PDF)

### Real-time Features
- Live leaderboard updates
- Real-time participant count
- Live analytics during gameplay
- Socket.IO-powered notifications

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure `JWT_SECRET`
- [ ] Configure Google OAuth for production
- [ ] Set up file storage (consider cloud storage for production)
- [ ] Configure reverse proxy (nginx recommended)
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment-specific CORS settings

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Ensure database file exists and has proper permissions
- Run `npm run migrate` to initialize database

**Google Authentication Issues**
- Verify Google OAuth credentials are correct
- Ensure redirect URIs are configured in Google Console
- Check that `GOOGLE_CLIENT_ID` matches your application

**File Upload Problems**
- Check upload directory permissions
- Verify file size limits in configuration
- Ensure supported file types are configured

**Socket.IO Connection Issues**
- Verify CORS configuration matches frontend URL
- Check firewall settings for WebSocket connections
- Ensure proper port forwarding in production

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🔄 Recent Updates

### New Features
- **Google Authentication**: Seamless login with Google accounts
- **AI Evaluation Modes**: Advanced code assessment with semantic validation
- **Advanced Question Types**: Support for crossword puzzles and image-based questions
- **Enhanced Analytics**: Comprehensive reporting with export capabilities
- **Real-time Cheat Detection**: Automated monitoring with progressive penalties
- **Flexible Qualification System**: Multiple qualification rule types

### Improvements
- Improved scoring system with time decay
- Enhanced real-time features with Socket.IO
- Better error handling and validation
- Comprehensive analytics dashboard
- PDF and CSV export functionality