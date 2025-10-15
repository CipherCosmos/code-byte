# HackArena API Documentation

Comprehensive API reference for the HackArena backend server.

## Base URL
```
http://localhost:3001/api
```

## Authentication

All API endpoints (except public leaderboard) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required, min 6 chars)",
  "name": "string (required)"
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "token": "string",
  "user": {
    "id": "number",
    "email": "string",
    "name": "string"
  }
}
```

**Error Responses:**
- `400`: Email already exists or invalid input
- `500`: Server error

#### POST /auth/login
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "string",
  "user": {
    "id": "number",
    "email": "string",
    "name": "string"
  }
}
```

#### POST /auth/google
Authenticate using Google OAuth ID token.

**Request Body:**
```json
{
  "idToken": "string (required)"
}
```

**Response (200):** Same as login response.

#### GET /auth/verify
Verify JWT token and return user information.

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "number",
    "email": "string",
    "name": "string"
  }
}
```

## Game Management

### Game CRUD Operations

#### GET /games
Get all games for the authenticated organizer.

**Query Parameters:**
- None

**Response (200):**
```json
[
  {
    "id": "number",
    "title": "string",
    "description": "string",
    "game_code": "string",
    "status": "string (draft|active|completed)",
    "max_participants": "number",
    "qualification_type": "string (none|top_n|top_percentage|custom_threshold)",
    "qualification_threshold": "number",
    "created_at": "string (ISO date)",
    "participant_count": "number",
    "question_count": "number"
  }
]
```

#### POST /games
Create a new game.

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "maxParticipants": "number (optional, default: 500)",
  "qualificationType": "string (optional, default: 'none')",
  "qualificationThreshold": "number (optional, default: 0)"
}
```

**Response (201):**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "game_code": "string",
  "organizer_id": "number",
  "status": "draft",
  "max_participants": "number",
  "qualification_type": "string",
  "qualification_threshold": "number",
  "created_at": "string",
  "qrCode": "string (base64 data URL)",
  "joinUrl": "string"
}
```

#### GET /games/:gameId
Get detailed information about a specific game.

**Response (200):**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "game_code": "string",
  "status": "string",
  "max_participants": "number",
  "qualification_type": "string",
  "qualification_threshold": "number",
  "created_at": "string",
  "started_at": "string (nullable)",
  "ended_at": "string (nullable)",
  "current_question_index": "number (nullable)",
  "total_questions": "number",
  "questions": [
    {
      "id": "number",
      "question_order": "number",
      "question_text": "string",
      "question_type": "string",
      "options": "array (JSON string)",
      "correct_answer": "string",
      "hint": "string (nullable)",
      "hint_penalty": "number",
      "time_limit": "number",
      "marks": "number",
      "difficulty": "string",
      "explanation": "string (nullable)",
      "evaluation_mode": "string",
      "test_cases": "string (nullable)",
      "ai_validation_settings": "string (nullable)",
      "image_url": "string (nullable)",
      "crossword_grid": "string (nullable)",
      "crossword_clues": "string (nullable)",
      "crossword_size": "string (nullable)"
    }
  ],
  "participants": [
    {
      "id": "number",
      "name": "string",
      "avatar": "string",
      "total_score": "number",
      "current_rank": "number",
      "status": "string",
      "qualified": "boolean",
      "cheat_warnings": "number",
      "joined_at": "string"
    }
  ],
  "qrCode": "string",
  "joinUrl": "string"
}
```

#### PUT /games/:gameId
Update game configuration.

**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "maxParticipants": "number (optional)",
  "qualificationType": "string (optional)",
  "qualificationThreshold": "number (optional)"
}
```

#### DELETE /games/:gameId
Delete a game.

**Response (200):**
```json
{
  "message": "Game deleted successfully"
}
```

### Question Management

#### POST /games/:gameId/questions
Add a question to a game.

**Request Body:**
```json
{
  "questionText": "string (required)",
  "questionType": "string (required)",
  "options": "array (for MCQ)",
  "correctAnswer": "string (required)",
  "hint": "string (optional)",
  "hintPenalty": "number (optional, default: 10)",
  "timeLimit": "number (optional, default: 60)",
  "marks": "number (optional, default: 10)",
  "difficulty": "string (optional, default: 'medium')",
  "explanation": "string (optional)",
  "evaluationMode": "string (optional)",
  "testCases": "string (optional)",
  "aiValidationSettings": "string (optional)",
  "imageUrl": "string (optional)",
  "crosswordGrid": "array (optional)",
  "crosswordClues": "object (optional)",
  "crosswordSize": "object (optional)"
}
```

**Supported Question Types:**
- `mcq`: Multiple Choice Questions
- `fill`: Fill in the Blank
- `code`: Code Snippet
- `truefalse`: True/False
- `short`: Short Answer
- `image`: Image-based
- `crossword`: Crossword Puzzle

#### PUT /games/:gameId/questions/:questionId
Update an existing question.

**Request Body:** Same as POST above.

#### DELETE /games/:gameId/questions/:questionId
Remove a question from the game.

### File Upload

#### POST /games/upload-image
Upload an image for use in questions.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: File (JPEG, PNG, GIF, max 5MB)

**Response (200):**
```json
{
  "imageUrl": "/uploads/filename.jpg"
}
```

## Game Control

### Game State Management

#### POST /games/:gameId/start
Start the game and begin the first question.

**Response (200):**
```json
{
  "message": "Game started successfully"
}
```

#### POST /games/:gameId/next-question
Move to the next question.

**Response (200):**
```json
{
  "message": "Next question started"
}
```

#### POST /games/:gameId/reveal-answer
Reveal the correct answer and update scores.

**Response (200):**
```json
{
  "message": "Answer revealed successfully"
}
```

#### POST /games/:gameId/end
End the game and apply qualification rules.

**Response (200):**
```json
{
  "message": "Game ended successfully"
}
```

#### POST /games/:gameId/pause
Pause the current game session.

**Response (200):**
```json
{
  "message": "Game paused successfully"
}
```

#### POST /games/:gameId/resume
Resume a paused game.

**Response (200):**
```json
{
  "message": "Game resumed successfully"
}
```

## Analytics

### Game Analytics

#### GET /analytics/games/:gameId/overview
Get comprehensive game overview analytics.

**Response (200):**
```json
{
  "game": {
    "id": "number",
    "title": "string",
    "status": "string",
    "startedAt": "string",
    "endedAt": "string",
    "duration": "number (minutes)",
    "qualificationType": "string",
    "qualificationThreshold": "number"
  },
  "overview": {
    "totalParticipants": "number",
    "totalQuestions": "number",
    "totalAnswers": "number",
    "overallAccuracy": "number",
    "averageCompletionTime": "number",
    "scoreDistribution": [
      {
        "range": "string",
        "count": "number"
      }
    ],
    "qualificationStats": {
      "qualifiedCount": "number",
      "qualificationRate": "number"
    }
  }
}
```

#### GET /analytics/games/:gameId/questions
Get per-question performance analytics.

**Response (200):**
```json
{
  "gameId": "number",
  "questions": [
    {
      "id": "number",
      "questionOrder": "number",
      "questionText": "string",
      "questionType": "string",
      "marks": "number",
      "timeLimit": "number",
      "difficulty": "string",
      "totalAttempts": "number",
      "correctAttempts": "number",
      "accuracy": "number",
      "averageTime": "number",
      "averageScore": "number"
    }
  ]
}
```

#### GET /analytics/games/:gameId/participants
Get participant performance analytics.

**Response (200):**
```json
{
  "gameId": "number",
  "participants": [
    {
      "id": "number",
      "name": "string",
      "avatar": "string",
      "finalRank": "number",
      "totalScore": "number",
      "questionsAttempted": "number",
      "correctAnswers": "number",
      "accuracy": "number",
      "averageTime": "number",
      "joinedAt": "string",
      "cheatWarnings": "number"
    }
  ],
  "qualificationStats": {
    "totalQualified": "number",
    "qualificationRate": "number"
  }
}
```

#### GET /analytics/games/:gameId/top-performers
Get top performing participants.

**Query Parameters:**
- `limit`: number (optional, default: 10)

**Response (200):**
```json
{
  "gameId": "number",
  "topPerformers": [
    {
      "name": "string",
      "avatar": "string",
      "score": "number",
      "rank": "number",
      "questionsAnswered": "number",
      "correctAnswers": "number",
      "accuracy": "number",
      "averageTime": "number"
    }
  ]
}
```

#### GET /analytics/games/:gameId/performance-breakdown
Get performance breakdown by game phases.

**Response (200):**
```json
{
  "gameId": "number",
  "performanceBreakdown": {
    "earlyGame": {
      "accuracy": "number",
      "avgTime": "number",
      "avgScore": "number",
      "count": "number"
    },
    "midGame": {
      "accuracy": "number",
      "avgTime": "number",
      "avgScore": "number",
      "count": "number"
    },
    "lateGame": {
      "accuracy": "number",
      "avgTime": "number",
      "avgScore": "number",
      "count": "number"
    }
  }
}
```

### Export Features

#### GET /analytics/games/:gameId/export/csv
Export game results as CSV file.

**Response:** CSV file download

#### GET /analytics/games/:gameId/export/pdf
Export game results as PDF report.

**Response:** PDF file download

## Public Endpoints

### Leaderboard

#### GET /games/:gameCode/leaderboard
Get public leaderboard for a game (no authentication required).

**Response (200):**
```json
[
  {
    "name": "string",
    "avatar": "string",
    "total_score": "number",
    "current_rank": "number",
    "status": "string"
  }
]
```

## Health Check

#### GET /health
Check server health status.

**Response (200):**
```json
{
  "status": "OK",
  "message": "HackArena Backend is running"
}
```

## Error Responses

All endpoints may return the following error formats:

### 400 Bad Request
```json
{
  "error": "Error message description"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- Authentication endpoints: 10 requests per minute per IP
- Game management endpoints: 100 requests per minute per user
- Analytics endpoints: 50 requests per minute per user
- Public endpoints: 200 requests per minute per IP

## WebSocket Events

The API also supports real-time communication via Socket.IO:

### Client Events (Organizer)
- `joinGameRoom`: Join game room as organizer
- `eliminateParticipant`: Remove participant from game
- `warnParticipant`: Issue warning to participant
- `reAdmitParticipant`: Re-admit eliminated participant

### Client Events (Participant)
- `joinGameRoom`: Join game room as participant
- `cheatDetected`: Report cheat detection event

### Server Events
- `gameStarted`: Game has begun
- `nextQuestion`: New question is available
- `answerRevealed`: Correct answer shown
- `gameEnded`: Game has concluded
- `gamePaused`: Game paused by organizer
- `gameResumed`: Game resumed by organizer
- `leaderboardUpdate`: Leaderboard updated
- `participantCountUpdate`: Participant count changed
- `cheatPenalty`: Penalty applied for cheating
- `organiserWarning`: Warning from organizer
- `eliminated`: Participant eliminated
- `reAdmitted`: Participant re-admitted

## Data Types

### Question Types
- `mcq`: Multiple Choice Questions
- `fill`: Fill in the Blank
- `code`: Code Snippet with evaluation modes
- `truefalse`: True/False
- `short`: Short Answer
- `image`: Image-based questions
- `crossword`: Crossword puzzles

### Evaluation Modes (for code questions)
- `mcq`: Standard auto-check
- `textarea`: AI semantic validation
- `compiler`: Test case execution

### Qualification Types
- `none`: No qualification rules
- `top_n`: Top N participants qualify
- `top_percentage`: Top X% qualify
- `custom_threshold`: Score threshold based

### Game Status
- `draft`: Game being set up
- `active`: Game in progress
- `paused`: Game temporarily paused
- `completed`: Game finished

### Participant Status
- `active`: Participating normally
- `flagged`: Marked for suspicious activity
- `eliminated`: Removed from game

## File Upload Specifications

- **Supported Formats**: JPEG, JPG, PNG, GIF
- **Maximum Size**: 5MB per file
- **Storage**: Local filesystem in `/uploads` directory
- **URL Pattern**: `/uploads/{filename}`
- **Security**: File type validation and size limits enforced

## Pagination

Analytics endpoints support pagination for large datasets:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Versioning

API versioning is handled through URL paths:
- Current version: v1 (implied in base path)
- Future versions: `/api/v2/...`

## SDKs and Libraries

### JavaScript/TypeScript Client
```javascript
import HackArena from 'hackarena-client';

const client = new HackArena({
  baseURL: 'http://localhost:3001/api',
  token: 'your-jwt-token'
});

// Example usage
const games = await client.games.list();
const analytics = await client.analytics.getOverview(gameId);
```

### cURL Examples

#### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "name": "John Doe"
  }'
```

#### Get Games
```bash
curl -X GET http://localhost:3001/api/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Game
```bash
curl -X POST http://localhost:3001/api/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Spring Hackathon 2024",
    "description": "Annual coding competition",
    "maxParticipants": 500
  }'
```

## Changelog

### v1.0.0
- Initial API release
- Basic game management
- Authentication system
- Real-time gameplay
- Analytics and reporting

### Recent Updates
- Added Google OAuth authentication
- Implemented AI evaluation modes
- Added advanced question types (crossword, image-based)
- Enhanced analytics with export features
- Improved cheat detection system
- Added qualification rule engine