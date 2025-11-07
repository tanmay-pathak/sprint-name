import { useState, useEffect } from 'react'
import './App.css'
import SprintNameInput from './components/SprintNameInput'
import Race2D from './components/Race2D'
import { usePartyKit } from './hooks/usePartyKit'

function App() {
  const [isRacing, setIsRacing] = useState(false)
  const [isCompletingRace, setIsCompletingRace] = useState(false)
  
  // PartyKit hook - raceDuration is now synced from server
  const { sprintNames, latestWinner, saveWinner, raceState, startRace, raceDuration } = usePartyKit();

  // Mapping data for the frontend
  const names = sprintNames.map(n => n.name);
  const winner = latestWinner?.name || null;

  // Sync local racing state with PartyKit race state
  useEffect(() => {
    if (raceState) {
      const isRacingFromState = raceState.status === 'countdown' || 
                                 raceState.status === 'racing' || 
                                 raceState.status === 'finished';
      
      if (isRacingFromState) {
        setIsRacing(true);
      }
      
      // Handle race completion
      if (raceState.status === 'finished' && raceState.winner && !isCompletingRace) {
        setIsCompletingRace(true);
        saveWinner(raceState.winner, raceState.raceDuration);
        // Return to input after delay
        setTimeout(() => {
          setIsRacing(false);
        }, 2000);
      }
    }
  }, [raceState, isCompletingRace, saveWinner]);

  // Reset isCompletingRace if we're not racing
  useEffect(() => {
    if (!isRacing) {
      setIsCompletingRace(false);
    }
  }, [isRacing]);

  const handleStartRace = (names: string[], duration: number) => {
    // Start race via PartyKit - this will sync to all clients
    startRace(names, duration);
    setIsRacing(true);
  }

  const handleRaceComplete = async (winnerName: string) => {
    try {
      // Flag that we're in the completion process
      setIsCompletingRace(true);
      
      // Store the winner
      saveWinner(winnerName, raceDuration);
      
      // Don't set isRacing to false here - let the useEffect handle it based on raceState
    } catch (error) {
      console.error("Error saving winner:", error);
    }
  }

  const handleBackToInput = () => {
    setIsRacing(false);
  }

  return (
    <div className="app-container">
      <div className="background-accents">
        <span className="accent accent-one" />
        <span className="accent accent-two" />
        <span className="accent accent-three" />
      </div>
      {!isRacing ? (
        <div className="input-container">
          <header className="app-header">
            <div className="app-title-group">
              <span className="app-pill">Sprint rituals, elevated</span>
              <h1>Sprint Name Egg Spoon Race</h1>
              <p className="app-subtitle">
                Queue up your team&apos;s wildest sprint names, tweak the race, then cheer as a winner is crowned in glorious 2D.
              </p>
            </div>
          </header>

          <div className="input-layout">
            <section className="info-panel" aria-label="Race information">
              <h2>How it works</h2>
              <ul className="info-list">
                <li><span className="info-icon">📝</span> Add sprint names manually, grab a suggestion, or clear the deck for a fresh batch.</li>
                <li><span className="info-icon">🎚️</span> Set the race duration to decide how intense the dash should feel.</li>
                <li><span className="info-icon">🏁</span> Once you have at least two names, hit start and watch the chaos unfold.</li>
              </ul>

              <div className="stats-grid">
                <div className="stat-card" role="status" aria-live="polite">
                  <p className="stat-label">Active racers</p>
                  <p className="stat-value">{names.length}</p>
                  <p className="stat-helper">{names.length >= 2 ? 'Ready to race!' : 'Add at least two racers to begin.'}</p>
                </div>

                <div className="stat-card">
                  <p className="stat-label">Race duration</p>
                  <p className="stat-value">{raceDuration}s</p>
                  <p className="stat-helper">Adjust the slider to make the race longer or shorter.</p>
                </div>
              </div>

              {winner && (
                <div className="latest-winner-card" aria-live="polite">
                  <p className="latest-winner-label">Most recent champion</p>
                  <p className="latest-winner-name">{winner}</p>
                  <p className="latest-winner-helper">Ready to defend their title?</p>
                </div>
              )}
            </section>

            <SprintNameInput
              onStart={handleStartRace}
            />
          </div>
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
            names={names}
            onRaceComplete={handleRaceComplete}
            raceDuration={raceDuration}
            raceState={raceState}
          />
        </div>
      )}
    </div>
  )
}

export default App
