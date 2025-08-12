# Overview

Skillnox is a comprehensive online coding and MCQ testing platform designed for college environments. It functions as a HackerRank-like system that supports 250-300 concurrent students on a local intranet server. The platform features role-based access control (admin/student), real-time coding contests with Monaco Editor integration, MCQ assessments, live leaderboards, and comprehensive anti-cheating mechanisms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **Code Editor**: Monaco Editor integration for syntax highlighting and IntelliSense support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Animation**: Framer Motion for smooth UI transitions and interactions
- **Anti-Cheat Features**: Browser-level restrictions including tab switch detection, fullscreen enforcement, and keyboard shortcut blocking

## Backend Architecture
- **Runtime**: Node.js with TypeScript using Express framework
- **Real-time Communication**: Socket.IO for live leaderboards and contest updates
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit Auth integration with session-based authentication using JWT tokens
- **File Structure**: Monorepo structure with shared schema between client and server

## Database Design
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle migrations for version control
- **Key Tables**: users, contests, problems, test_cases, mcq_questions, submissions, contest_participants, sessions
- **Indexing**: Strategic indexes on frequently queried fields for performance optimization

## Authentication & Authorization
- **Authentication Provider**: Replit OpenID Connect (OIDC) integration
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Role-Based Access**: Admin and student roles with middleware-based route protection
- **Security**: HTTP-only cookies, secure session handling, and CSRF protection

## Anti-Cheating System
- **Tab Monitoring**: Visibility API to detect tab switches with automatic submission after threshold
- **Fullscreen Enforcement**: Mandatory fullscreen mode with exit detection
- **Input Restrictions**: Disabled right-click, copy/paste, text selection, and developer tools access
- **Idle Detection**: Activity monitoring with warnings and auto-submission on prolonged inactivity
- **Browser Controls**: Zoom restrictions and keyboard shortcut blocking

## Code Execution & Testing
- **Test Case Management**: Visible and hidden test cases with partial scoring
- **Language Support**: Multiple programming languages through Monaco Editor
- **Execution Environment**: Prepared for Docker containerization or Judge0 API integration
- **Resource Limits**: CPU, memory, and execution time constraints for submissions

## Performance Optimization
- **Connection Pooling**: Database connection management for concurrent users
- **Caching Strategy**: Redis integration prepared for job queues and caching
- **Query Optimization**: Efficient database queries with proper indexing
- **Asset Optimization**: Vite-based bundling with code splitting and lazy loading

# External Dependencies

## Database Services
- **Neon Serverless PostgreSQL**: Primary database with WebSocket support for serverless environments
- **Redis with BullMQ**: Queue management and caching (architecture prepared)

## Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication and authorization

## Development Tools
- **Monaco Editor CDN**: Code editor functionality with syntax highlighting
- **Google Fonts**: Inter and JetBrains Mono font families for typography

## UI Libraries
- **Radix UI**: Accessible component primitives for complex UI components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Framer Motion**: Animation library for smooth user interactions

## Code Execution (Planned)
- **Docker**: Container-based code execution environment (architecture prepared)
- **Judge0 API**: Alternative code execution service integration (architecture prepared)

## Real-time Features
- **Socket.IO**: WebSocket communication for live updates, leaderboards, and contest monitoring

## Build & Development
- **Vite**: Fast development server and build tool with Hot Module Replacement
- **TypeScript**: Type safety across the entire application stack
- **ESBuild**: Fast JavaScript bundling for production builds