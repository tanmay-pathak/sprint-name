import { useEffect, useState } from 'react'
import '../styles/SprintNameInput.css'
import { usePartyKit } from '../hooks/usePartyKit'

interface SprintNameInputProps {
  onStart: (names: string[], duration: number) => void
  onDurationChange?: (duration: number) => void
}

// Fun sprint name suggestions
const SPRINT_NAME_SUGGESTIONS = [
  "Sonic Sprint", "Rocket Race", "Thunder Team", "Lightning Launch",
  "Phoenix Flight", "Quantum Quickstep", "Velocity Voyage", "Dragon Dash",
  "Titan Trek", "Comet Charge"
];

const DEFAULT_RACE_DURATION = 10; // 10 seconds default

const SprintNameInput = ({ onStart, onDurationChange }: SprintNameInputProps) => {
  const [input, setInput] = useState('')
  const [raceDuration, setRaceDuration] = useState(DEFAULT_RACE_DURATION)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // PartyKit hook
  const { sprintNames, addSprintName, clearActiveSprintNames, deactivateSprintName } = usePartyKit();

  const nameExists = (value: string) => {
    return sprintNames.some(item => item.name.toLowerCase() === value.toLowerCase())
  }

  const handleAddName = async () => {
    const trimmed = input.trim()

    if (!trimmed || isAdding) {
      return
    }

    if (nameExists(trimmed)) {
      setErrorMessage('That racer is already warming up. Try a different name!')
      return
    }

    try {
      setIsAdding(true);
      setErrorMessage(null)
      addSprintName(trimmed);
      setInput('');
    } catch (error) {
      console.error("Error adding name:", error);
      setErrorMessage('We couldn\'t add that name. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  const handleRandomName = async () => {
    if (!isAdding) {
      try {
        setIsAdding(true);
        let randomName = generateRandomName();
        let attempts = 0;

        while (nameExists(randomName) && attempts < SPRINT_NAME_SUGGESTIONS.length) {
          randomName = generateRandomName();
          attempts += 1;
        }

        if (nameExists(randomName)) {
          setErrorMessage('All our suggestions are already racing. Add your own!');
          return;
        }

        setErrorMessage(null)
        addSprintName(randomName);
      } catch (error) {
        console.error("Error adding random name:", error);
        setErrorMessage('Could not add a random racer. Give it another go.');
      } finally {
        setIsAdding(false);
      }
    }
  }

  const handleRemoveName = async (id: string) => {
    if (!isRemoving) {
      try {
        setIsRemoving(id);
        deactivateSprintName(id);
        setErrorMessage(null)
      } catch (error) {
        console.error("Error removing name:", error);
        setErrorMessage('Removing that racer hit a snag. Refresh and try again.');
      } finally {
        setIsRemoving(null);
      }
    }
  }

  const generateRandomName = (): string => {
    const randomIndex = Math.floor(Math.random() * SPRINT_NAME_SUGGESTIONS.length);
    return SPRINT_NAME_SUGGESTIONS[randomIndex];
  }

  const handleClearAll = async () => {
    if (!isAdding) {
      try {
        setIsAdding(true);
        clearActiveSprintNames();
        setErrorMessage(null)
      } catch (error) {
        console.error("Error clearing names:", error);
        setErrorMessage('We couldn\'t clear the roster. Please retry.');
      } finally {
        setIsAdding(false);
      }
    }
  }

  const handleStart = () => {
    if (sprintNames.length >= 2) {
      const names = sprintNames.map(item => item.name);
      onStart(names, raceDuration);
    }
  }

  // Get a random placeholder from suggestions
  const getRandomPlaceholder = () => {
    const randomIndex = Math.floor(Math.random() * SPRINT_NAME_SUGGESTIONS.length);
    return `Try: "${SPRINT_NAME_SUGGESTIONS[randomIndex]}"`;
  }

  const handleAddSuggestion = async (name: string) => {
    if (isAdding) {
      return
    }

    if (nameExists(name)) {
      setErrorMessage('Looks like that racer is already lined up!')
      return
    }

    try {
      setIsAdding(true)
      setErrorMessage(null)
      addSprintName(name)
    } catch (error) {
      console.error("Error adding suggestion:", error)
      setErrorMessage('Suggestion failed to join the race. Try again.')
    } finally {
      setIsAdding(false)
    }
  }

  useEffect(() => {
    onDurationChange?.(raceDuration)
  }, [raceDuration, onDurationChange])

  const readinessTarget = 6
  const readinessPercentage = Math.min(100, Math.round((sprintNames.length / readinessTarget) * 100))
  const readinessStatus = sprintNames.length >= 2
    ? readinessPercentage >= 100
      ? 'This heat is stacked. Time to sprint!'
      : 'Great! Add a few more if you want extra chaos.'
    : 'Add at least two names to unlock the starting whistle.'

  const availableSuggestions = SPRINT_NAME_SUGGESTIONS
    .filter(name => !nameExists(name))
    .slice(0, 6)

  return (
    <div className="sprint-input-container">
      <div className="panel-intro">
        <h2>Create your roster</h2>
        <p>Mix inside jokes with epic titles. We&apos;ll keep them neatly organised until it&apos;s race time.</p>
      </div>

      <div className="input-group">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (errorMessage) {
              setErrorMessage(null)
            }
          }}
          placeholder={getRandomPlaceholder()}
          className="name-input"
          disabled={isAdding}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAdding) {
              handleAddName();
            }
          }}
        />
        <button
          onClick={handleAddName}
          className="add-button"
          disabled={isAdding || !input.trim()}
        >
          {isAdding ? 'Adding...' : 'Add Name'}
        </button>
      </div>

      {errorMessage && <div className="form-error" role="alert">{errorMessage}</div>}

      <div className="names-list">
        <h3>Sprint Names ({sprintNames.length})</h3>
        {sprintNames.length === 0 ? (
          <p className="empty-message">No names added yet. Add at least 2 names to start the race.</p>
        ) : (
          <ul className="names-grid">
            {sprintNames.map((item) => (
              <li key={item._id} className="name-item">
                <span className="name-text">{item.name}</span>
                <button
                  className="remove-name-btn"
                  onClick={() => handleRemoveName(item._id)}
                  disabled={isRemoving === item._id}
                >
                  {isRemoving === item._id ? '...' : '×'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {availableSuggestions.length > 0 && (
        <div className="suggestions-panel" aria-label="Sprint name suggestions">
          <p className="suggestions-label">Need inspiration? Tap a suggestion to add it instantly.</p>
          <div className="suggestion-chips">
            {availableSuggestions.map(name => (
              <button
                key={name}
                type="button"
                className="suggestion-chip"
                onClick={() => handleAddSuggestion(name)}
                disabled={isAdding}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="input-actions">
        <button
          onClick={handleRandomName}
          className="secondary-button"
          disabled={isAdding}
        >
          <span className="button-icon">🎲</span>
          {isAdding ? 'Adding...' : 'Add Random Name'}
        </button>
        <button 
          onClick={handleClearAll} 
          className="secondary-button clear-button"
          disabled={isAdding || sprintNames.length === 0}
        >
          <span className="button-icon">🗑️</span>
          {isAdding ? 'Clearing...' : 'Clear All'}
        </button>
      </div>

      <div className="race-options">
        <div className="option-group">
          <label htmlFor="race-duration">Race Duration (seconds):</label>
          <input 
            id="race-duration"
            type="range" 
            min="5" 
            max="20" 
            step="1"
            value={raceDuration} 
            onChange={(e) => setRaceDuration(parseInt(e.target.value))}
          />
          <span className="range-value">{raceDuration}s</span>
        </div>
      </div>

      <div className="readiness-meter" role="status" aria-live="polite">
        <div className="meter-headline">
          <span className="meter-title">Race readiness</span>
          <span className="meter-percentage">{readinessPercentage}%</span>
        </div>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${readinessPercentage}%` }}></div>
        </div>
        <p className="meter-helper">{readinessStatus}</p>
      </div>

      <button
        className="start-button"
        onClick={handleStart}
        disabled={sprintNames.length < 2 || isAdding}
      >
        Start Race! 🏁
      </button>
    </div>
  )
}

export default SprintNameInput 