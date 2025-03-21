import { useState, useEffect } from 'react'
import './App.css'
import SprintNameInput from './components/SprintNameInput'
import Race2D from './components/Race2D'
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function App() {
  const [isRacing, setIsRacing] = useState(false)
  const [raceDuration, setRaceDuration] = useState(10)
  const [isCompletingRace, setIsCompletingRace] = useState(false)
  
  // Convex queries and mutations
  const names = useQuery(api.sprintNames.listActiveSprintNames) || [];
  const saveWinner = useMutation(api.winners.saveWinner);
  const latestWinner = useQuery(api.winners.getLatestWinner);

  // Mapping data for the frontend
  const sprintNames = names.map(n => n.name);
  const winner = latestWinner?.name || null;

  // Reset isCompletingRace if we're not racing
  useEffect(() => {
    if (!isRacing) {
      setIsCompletingRace(false);
    }
  }, [isRacing]);

  const handleStartRace = (names: string[], duration: number) => {
    setRaceDuration(duration);
    setIsRacing(true);
  }

  const handleRaceComplete = async (winnerName: string) => {
    try {
      // Flag that we're in the completion process
      setIsCompletingRace(true);
      
      // Store the winner in the database
      await saveWinner({ name: winnerName, raceDuration });
      
      // Return to input screen
      setIsRacing(false);
    } catch (error) {
      console.error("Error saving winner:", error);
      // Still return to input screen even on error
      setIsRacing(false);
    }
  }

  const handleBackToInput = () => {
    setIsRacing(false);
  }

  return (
    <div className="app-container">
      {!isRacing ? (
        <div className="input-container">
          <div className="app-header">
            <h1>Sprint Name Egg Spoon Race</h1>
          </div>

          {winner && (
            <div className="winner-announcement">
              <h2>🏆 Winner: {winner} 🏆</h2>
            </div>
          )}
          
          <SprintNameInput onStart={handleStartRace} />
          
          <footer className="app-footer">
            <p>Sprint Name Egg Spoon Race &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      ) : (
        <div className="race-container">
          <button 
            className="back-button" 
            onClick={handleBackToInput}
            disabled={isCompletingRace}
          >
            {isCompletingRace ? 'Finishing...' : '← Back'}
          </button>
          <Race2D 
            names={sprintNames} 
            onRaceComplete={handleRaceComplete} 
            raceDuration={raceDuration}
          />
        </div>
      )}
    </div>
  )
}

export default App
