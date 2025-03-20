import { useState } from 'react'
import './App.css'
import SprintNameInput from './components/SprintNameInput'
import Race2D from './components/Race2D'

function App() {
  const [names, setNames] = useState<string[]>([])
  const [isRacing, setIsRacing] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [raceDuration, setRaceDuration] = useState(10)

  const handleStartRace = (inputNames: string[], duration: number) => {
    setNames(inputNames)
    setRaceDuration(duration)
    setIsRacing(true)
    setWinner(null)
  }

  const handleRaceComplete = (winnerName: string) => {
    setWinner(winnerName)
    setIsRacing(false)
  }

  const handleBackToInput = () => {
    setIsRacing(false)
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
          <button className="back-button" onClick={handleBackToInput}>
            ← Back
          </button>
          <Race2D 
            names={names} 
            onRaceComplete={handleRaceComplete} 
            raceDuration={raceDuration}
          />
        </div>
      )}
    </div>
  )
}

export default App
