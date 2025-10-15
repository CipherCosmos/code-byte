# HackArena Features Documentation

Comprehensive documentation of all features implemented in HackArena.

## Table of Contents

1. [Authentication System](#authentication-system)
2. [Game Management](#game-management)
3. [Question Types](#question-types)
4. [Real-time Features](#real-time-features)
5. [Cheat Detection](#cheat-detection)
6. [Analytics & Reporting](#analytics--reporting)
7. [Scoring System](#scoring-system)
8. [Qualification Rules](#qualification-rules)

## Authentication System

### Traditional Email/Password Authentication
- **User Registration**: Secure account creation with email verification
- **Password Hashing**: bcrypt with 12 salt rounds for security
- **JWT Tokens**: 24-hour session tokens with automatic refresh
- **Password Requirements**: Minimum 6 characters, enforced validation

### Google OAuth Integration
- **Seamless Sign-In**: One-click authentication with Google accounts
- **Account Linking**: Link Google accounts to existing email/password accounts
- **Token Verification**: Server-side verification of Google ID tokens
- **Profile Sync**: Automatic sync of user profile information

**Implementation Details:**
```javascript
// Google authentication flow
1. Frontend requests Google sign-in
2. Google returns ID token
3. Backend verifies token with Google servers
4. User account created or linked
5. JWT token issued for session management
```

## Game Management

### Game Creation & Configuration
- **Unique Game Codes**: 8-character alphanumeric codes for easy joining
- **QR Code Generation**: Automatic QR code creation for mobile access
- **Participant Limits**: Configurable maximum participant counts
- **Qualification Rules**: Flexible qualification criteria (top N, percentage, threshold)

### Game Lifecycle
- **Draft State**: Game setup and configuration phase
- **Active State**: Live gameplay with real-time updates
- **Paused State**: Temporary suspension with time preservation
- **Completed State**: Final results and qualification application

### Real-time Game Control
- **Start/Stop/Pause**: Full game state management
- **Question Progression**: Sequential question delivery
- **Time Management**: Configurable question timers with auto-progression
- **Participant Management**: Real-time elimination and readmission

## Question Types

### Multiple Choice Questions (MCQ)
- **Dynamic Options**: 2-10 configurable answer options
- **Single Correct Answer**: Traditional multiple choice format
- **Visual Feedback**: Real-time answer validation

### Fill in the Blank
- **Text Input**: Free-form text answers
- **Case Sensitivity**: Configurable case-sensitive matching
- **Partial Credit**: Optional partial scoring for close answers

### Code Snippet Questions
- **Syntax Highlighting**: Prism.js integration for code display
- **Multiple Languages**: Support for popular programming languages
- **Evaluation Modes**:
  - **MCQ Mode**: Auto-check against predefined answers
  - **Text Area Mode**: AI-based semantic validation
  - **Compiler Mode**: Test case execution and validation

### True/False Questions
- **Binary Choice**: Simple true/false format
- **Quick Assessment**: Fast evaluation for time-sensitive rounds

### Short Answer Questions
- **Text Response**: Brief written answers
- **Manual/Automated Grading**: Configurable evaluation methods

### Image-Based Questions
- **File Upload**: Support for JPEG, PNG, GIF formats (max 5MB)
- **Image Display**: Integrated question display with images
- **Visual Assessment**: Questions requiring image interpretation

### Crossword Puzzle Questions
- **Grid Configuration**: Customizable grid sizes (5x5 to 20x20)
- **Clue System**: Across and down clues with word definitions
- **Interactive Solving**: Real-time crossword completion
- **Validation**: Automatic correctness checking

**Advanced Question Features:**
- **Hints**: Optional hint system with configurable penalty points
- **Time Limits**: Per-question time constraints (10-300 seconds)
- **Difficulty Levels**: Easy, Medium, Hard classification
- **Explanations**: Answer explanations for educational purposes
- **Marks Allocation**: Variable point values per question

## Real-time Features

### Socket.IO Integration
- **Room-based Communication**: Isolated game sessions
- **Real-time Updates**: Instant leaderboard and status updates
- **Connection Management**: Automatic reconnection handling
- **Cross-platform Support**: Web and mobile compatibility

### Live Leaderboard
- **Real-time Rankings**: Instant score updates during gameplay
- **Participant Tracking**: Live participant count and status
- **Ranking Display**: Visual ranking with avatars and scores

### Game Synchronization
- **Question Broadcasting**: Coordinated question delivery to all participants
- **Timer Synchronization**: Server-controlled question timers
- **Answer Reveals**: Coordinated correct answer displays
- **Status Updates**: Real-time game state synchronization

## Cheat Detection

### Automated Monitoring
- **Browser Focus Detection**: Monitors when participants switch tabs/windows
- **Copy/Paste Prevention**: Blocks clipboard operations during questions
- **Right-click Disable**: Prevents context menu access
- **Keyboard Shortcuts**: Blocks common cheating shortcuts

### Progressive Penalty System
- **Warning Levels**:
  - **Level 1**: First violation (10 point penalty)
  - **Level 2**: Second violation (15 point penalty)
  - **Level 3+**: Participant flagged for organizer review

### Real-time Alerts
- **Organizer Notifications**: Instant alerts for suspicious activities
- **Participant Feedback**: Immediate penalty notifications
- **Activity Logging**: Comprehensive cheat detection logs

## Analytics & Reporting

### Real-time Analytics
- **Live Question Stats**: Current question performance metrics
- **Participant Progress**: Individual and group progress tracking
- **Time Analytics**: Average completion times and distributions

### Comprehensive Reporting
- **Game Overview**: Complete game statistics and metrics
- **Question Analysis**: Per-question performance breakdown
- **Participant Analytics**: Individual performance profiles
- **Qualification Reports**: Detailed qualification results

### Export Capabilities
- **CSV Export**: Raw data export for external analysis
- **PDF Reports**: Formatted reports with charts and summaries
- **Real-time Generation**: On-demand report creation

### Dashboard Features
- **Interactive Charts**: Recharts-powered visualizations
- **Performance Breakdown**: Analysis by game phases (early/mid/late)
- **Score Distribution**: Histogram of participant scores
- **Accuracy Trends**: Performance trends over time

## Scoring System

### Base Scoring
- **Question Marks**: Configurable points per question
- **Correct/Incorrect**: Binary scoring with configurable penalties
- **Partial Credit**: Optional partial scoring for complex answers

### Advanced Scoring Features
- **Time Decay**: Points decrease as time expires (configurable rate)
- **Hint Penalties**: Point deductions for using hints
- **Cheat Penalties**: Automatic deductions for rule violations
- **Bonus Points**: Optional bonuses for speed or difficulty

### Scoring Formula
```
Final Score = Base Marks × Time Multiplier - Penalties

Where:
- Time Multiplier = 1 - (Time Used / Total Time) × Decay Factor
- Penalties = Hint Penalties + Cheat Penalties
```

### Leaderboard Calculation
- **Real-time Updates**: Instant ranking recalculation
- **Tie Breaking**: Timestamp-based tie resolution
- **Rank Preservation**: Historical rank tracking

## Qualification Rules

### Rule Types

#### Top N Qualification
- **Description**: Top N highest-scoring participants qualify
- **Configuration**: Set N as the number of qualifiers
- **Example**: Top 10 participants in a 100-person competition

#### Percentage-based Qualification
- **Description**: Top X% of participants qualify
- **Configuration**: Set percentage threshold
- **Example**: Top 25% qualify (25 out of 100 participants)

#### Custom Threshold Qualification
- **Description**: Participants above score threshold qualify
- **Configuration**: Set minimum score requirement
- **Example**: All participants with 70+ points qualify

### Qualification Process
1. **Game Completion**: Wait for all questions to be answered
2. **Score Calculation**: Compute final scores with all modifiers
3. **Rule Application**: Apply configured qualification rules
4. **Status Update**: Mark qualified/unqualified participants
5. **Results Display**: Show qualification results to participants

### Post-Qualification Features
- **Certificate Generation**: Automatic qualification certificates
- **Results Sharing**: Social media sharing of results
- **Detailed Breakdown**: Individual performance summaries
- **Appeal Process**: Optional review mechanisms for edge cases

## Technical Architecture

### Backend Architecture
- **Node.js/Express**: RESTful API server
- **SQLite**: Lightweight database with full ACID compliance
- **Socket.IO**: Real-time bidirectional communication
- **JWT**: Secure authentication tokens
- **bcrypt**: Password hashing and verification

### Frontend Architecture
- **React 18**: Modern component-based UI framework
- **Vite**: Fast development and optimized production builds
- **React Router**: Client-side routing and navigation
- **Axios**: HTTP client for API communication
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Data visualization library

### Security Features
- **Input Validation**: Joi schema validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization and CSP headers
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: API rate limiting and abuse prevention

### Performance Optimizations
- **Database Indexing**: Optimized queries with proper indexing
- **Caching**: Redis integration for session and data caching
- **CDN Support**: Static asset delivery optimization
- **Lazy Loading**: Component and route-based code splitting
- **Compression**: Gzip compression for API responses

## Deployment & Scaling

### Development Environment
- **Hot Reload**: Instant code changes without server restart
- **Source Maps**: Debug production code with source mapping
- **Environment Isolation**: Separate dev/prod configurations

### Production Deployment
- **Process Management**: PM2 for production process management
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **SSL/TLS**: Let's Encrypt certificates for HTTPS
- **Monitoring**: Application and system monitoring integration

### Scaling Strategies
- **Horizontal Scaling**: Multiple server instances with load balancing
- **Database Scaling**: Read replicas and connection pooling
- **Caching Layer**: Redis for session and data caching
- **CDN Integration**: Global content delivery for static assets

## Future Enhancements

### Planned Features
- **AI-Powered Proctoring**: Advanced cheat detection with AI
- **Mobile App**: Native mobile applications for iOS and Android
- **Advanced Analytics**: Machine learning-based insights
- **Integration APIs**: Third-party platform integrations
- **Custom Branding**: White-label solutions for organizations

### Technology Upgrades
- **TypeScript Migration**: Full TypeScript adoption for better type safety
- **GraphQL API**: More flexible API querying capabilities
- **Microservices**: Modular architecture for better scalability
- **Real-time Database**: Firebase integration for enhanced real-time features