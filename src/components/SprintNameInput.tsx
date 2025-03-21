import { useState } from 'react'
import '../styles/SprintNameInput.css'
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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
  const [raceDuration, setRaceDuration] = useState(DEFAULT_RACE_DURATION)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  
  // Convex queries and mutations
  const sprintNames = useQuery(api.sprintNames.listActiveSprintNames) || [];
  const addSprintName = useMutation(api.sprintNames.addSprintName);
  const clearActiveSprintNames = useMutation(api.sprintNames.clearActiveSprintNames);
  const deactivateSprintName = useMutation(api.sprintNames.deactivateSprintName);

  const handleAddName = async () => {
    if (input.trim() && !isAdding) {
      try {
        setIsAdding(true);
        await addSprintName({ name: input.trim() });
        setInput('');
      } catch (error) {
        console.error("Error adding name:", error);
      } finally {
        setIsAdding(false);
      }
    }
  }

  const handleRandomName = async () => {
    if (!isAdding) {
      try {
        setIsAdding(true);
        const randomName = generateRandomName();
        await addSprintName({ name: randomName });
      } catch (error) {
        console.error("Error adding random name:", error);
      } finally {
        setIsAdding(false);
      }
    }
  }

  const handleRemoveName = async (id: Id<"sprintNames">) => {
    if (!isRemoving) {
      try {
        setIsRemoving(id);
        await deactivateSprintName({ id });
      } catch (error) {
        console.error("Error removing name:", error);
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
        await clearActiveSprintNames();
      } catch (error) {
        console.error("Error clearing names:", error);
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

  return (
    <div className="sprint-input-container">
      <div className="input-group">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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