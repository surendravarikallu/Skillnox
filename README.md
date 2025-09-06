# Skillnox - Online Coding Contest Platform

## 🏆 Overview

Skillnox is a comprehensive online coding contest platform designed for educational institutions and organizations to conduct programming competitions. The platform features real-time contest management, anti-cheating mechanisms, live leaderboards, and automated code evaluation.

## ✨ Key Features

### For Students
- **Contest Participation**: Join live coding contests with real-time updates
- **Code Editor**: Monaco-based editor with syntax highlighting for multiple languages
- **Test Case Execution**: Run code against sample test cases before submission
- **Live Leaderboard**: Real-time ranking updates during contests
- **Submission History**: Track all submissions and their results
- **MCQ Questions**: Answer multiple-choice questions alongside coding problems

### For Administrators
- **Contest Management**: Create, edit, and manage coding contests
- **Problem Creation**: Add programming problems with test cases
- **Student Management**: Import and manage student data
- **Real-time Monitoring**: Monitor contest progress and submissions
- **Report Generation**: Export detailed reports and analytics
- **Anti-cheat System**: Monitor tab switches and disqualify violators

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Framer Motion** for animations
- **Monaco Editor** for code editing
- **Socket.IO** for real-time updates

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** with Drizzle ORM
- **Socket.IO** for WebSocket communication
- **Express Session** for authentication
- **Passport.js** for local authentication

### Infrastructure
- **Vite** for development server
- **ESBuild** for production builds
- **Drizzle Kit** for database migrations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Skillnox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/skillnox
   SESSION_SECRET=your-session-secret
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
Skillnox/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── index.html
├── server/                 # Backend Express application
│   ├── auth.ts            # Authentication middleware
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database operations
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema definitions
├── migrations/             # Database migrations
└── docs/                   # Documentation files
```

## 🔧 Configuration

### Database Configuration
The application uses Drizzle ORM with PostgreSQL. Configure your database connection in the `.env` file:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

### Session Configuration
Configure session settings for user authentication:

```env
SESSION_SECRET=your-secure-session-secret
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Contests
- `GET /api/contests` - Get all contests
- `POST /api/contests` - Create new contest
- `GET /api/contests/:id` - Get contest details
- `PUT /api/contests/:id` - Update contest
- `DELETE /api/contests/:id` - Delete contest

### Problems
- `GET /api/problems` - Get problems
- `POST /api/problems` - Create problem
- `GET /api/problems/:id` - Get problem details
- `PUT /api/problems/:id` - Update problem

### Submissions
- `POST /api/submissions` - Submit code
- `GET /api/submissions/user/:userId` - Get user submissions
- `POST /api/execute-code` - Execute code against test cases

### Leaderboard
- `GET /api/contests/:id/leaderboard` - Get contest leaderboard

## 🔒 Security Features

- **Anti-cheat System**: Monitors tab switches and fullscreen violations
- **Session Management**: Secure user sessions with configurable timeouts
- **Input Validation**: Comprehensive input validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries through Drizzle ORM
- **XSS Protection**: Content sanitization and secure rendering

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📊 Monitoring

The platform includes built-in monitoring for:
- Contest participation rates
- Submission success rates
- Anti-cheat violations
- System performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔄 Version History

- **v1.0.0** - Initial release with core contest functionality
- **v1.1.0** - Added anti-cheat system and real-time updates
- **v1.2.0** - Enhanced UI/UX and performance optimizations

---

**Skillnox** - Empowering coding excellence through competitive programming.
