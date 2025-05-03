# Open Texas - Texas Hold'em Poker Game

A web-based Texas Hold'em poker game with React frontend and Node.js backend.

## Features

- Real-time multiplayer gameplay using Socket.io
- Beautiful and responsive UI
- Fully functional Texas Hold'em poker rules
- Game lobby for creating and joining games
- Persistent user data with Prisma and PostgreSQL

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Socket.io Client, Styled Components
- **Backend**: Node.js, Express, Socket.io, TypeScript
- **Database**: PostgreSQL with Prisma ORM

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/open-texas.git
   cd open-texas
   ```

2. Install dependencies:
   ```
   npm run install:all
   ```

3. Configure the database:
   - Create a PostgreSQL database
   - Update the `.env` file in the server directory with your database connection string
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5433/opentexas"
   ```

4. Push the database schema:
   ```
   cd server
   npm run db:push
   ```

### Running the Application

1. Start the development servers:
   ```
   npm run dev
   ```

   This will start both the frontend (http://localhost:3000) and backend (http://localhost:8080) servers.

## Project Structure

```
open-texas/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   └── assets/      # Static assets
│   ├── index.html
│   └── vite.config.ts
├── server/              # Backend Node.js application
│   ├── src/
│   │   ├── controllers/ # API controllers
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   └── tsconfig.json
└── prisma/              # Prisma ORM schema and migrations
    └── schema.prisma
```

## Game Rules

The game follows standard Texas Hold'em poker rules:

1. Each player is dealt two private cards (hole cards)
2. Five community cards are dealt face-up in three stages:
   - The Flop: First three community cards
   - The Turn: Fourth community card
   - The River: Fifth community card
3. Players make betting decisions: fold, check, call, bet, raise, or all-in
4. The best five-card hand wins the pot

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors and poker enthusiasts 