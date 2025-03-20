import { useState, useEffect } from 'react'
import '../styles/SprintNameInput.css'

interface SprintNameInputProps {
  onStart: (names: string[], duration: number) => void
}

// Fun sprint name suggestions
const SPRINT_NAME_SUGGESTIONS = [
  "Sonic Sprint", "Rocket Race", "Thunder Team", "Lightning Launch",
  "Phoenix Flight", "Quantum Quickstep", "Velocity Voyage", "Dragon Dash",
  "Titan Trek", "Comet Charge"
];

const DEFAULT_RACE_DURATION = 10; // 10 seconds default

const SprintNameInput = ({ onStart }: SprintNameInputProps) => {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [raceDuration, setRaceDuration] = useState(DEFAULT_RACE_DURATION)

  useEffect(() => {
    // Check if we have valid input
    const names = getNamesList(input);
    
    if (names.length === 0) {
      setError(null);
    } else if (names.length === 1) {
      setError("Please enter at least 2 names");
    } else {
      setError(null);
    }
  }, [input]);

  const getNamesList = (text: string): string[] => {
    return text
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  const handleStart = () => {
    const names = getNamesList(input);
    if (names.length >= 2) {
      onStart(names, raceDuration);
    }
  }

  const handleAddRandomNames = () => {
    const randomNames = generateRandomNames(3).join('\n');
    setInput(prev => {
      const currentNames = prev.trim();
      return currentNames ? `${currentNames}\n${randomNames}` : randomNames;
    });
  }

  const generateRandomNames = (count: number): string[] => {
    const shuffled = [...SPRINT_NAME_SUGGESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  const handleClear = () => {
    setInput('');
  }

  return (
    <div className="sprint-input-container">
      <p>Enter one sprint name per line (minimum 2 names):</p>
      <div className="textarea-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter sprint names here...
Example:
Sonic Sprint
Rocket Race
Thunder Team"
          className={error ? 'error' : ''}
        />
        {error && <div className="error-message">{error}</div>}
      </div>
      
      <div className="input-actions">
        <button onClick={handleAddRandomNames} className="secondary-button">
          Add Random Names
        </button>
        <button onClick={handleClear} className="secondary-button">
          Clear
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

      <button
        className="start-button"
        onClick={handleStart}
        disabled={getNamesList(input).length < 2}
      >
        Start Race! 🏁
      </button>
    </div>
  )
}

export default SprintNameInput 