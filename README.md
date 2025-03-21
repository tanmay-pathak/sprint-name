# Sprint Name Selector Game

A fun and interactive game to help teams select sprint names through a competitive egg-and-spoon race visualization.

## Features

- 🏁 Visualize sprint name selection as an exciting egg-and-spoon race
- 🎮 Interactive and fun animation with physics-based movement
- 🎨 Modern, responsive UI with dark theme support
- 🔊 Sound effects for race events
- 🎉 Celebratory confetti for the winner
- 📊 Track race history and previous winners
- 🎲 Random name generator option for quick races
- 💾 Persistent storage of race results and sprint names
- 🔄 Real-time updates across multiple users

## Technologies Used

- React 19
- TypeScript
- Vite
- Canvas Confetti
- CSS Animations
- Convex (for real-time backend)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/sprint-name.git
   cd sprint-name
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Convex:
   ```
   npx convex dev
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Building for Production

To build the app for production, run:

```
npm run build
```

The build artifacts will be located in the `dist/` directory.

For deploying the Convex backend:

```
npx convex deploy
```

## How to Use

1. Enter sprint name options (one per line) or use the random name generator
2. Click "Start Race!" to begin
3. Watch as the egg-and-spoon racers compete
4. The winner will be your new sprint name
5. Race results are automatically saved and synchronized across all users

## Convex Backend

This application uses Convex as a backend service for:
- Storing sprint name suggestions
- Recording race results and history
- Enabling real-time updates across multiple users
- Managing user sessions

## Show your support

Give a ⭐️ if this project helped you!
