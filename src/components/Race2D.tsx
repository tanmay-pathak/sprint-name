import { useEffect, useState, useRef } from 'react';
import '../styles/Race2D.css';
import confetti from 'canvas-confetti';

interface Racer {
  name: string;
  position: number;
  speed: number;
  baseSpeed: number;
  lane: number;
  wobble: number;
  finishTime: number | null;
  boostTime: number;
  slowTime: number;
}

interface RaceState {
  status: 'idle' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  startTime: number | null;
  raceDuration: number;
  racers: Racer[];
  winner: string | null;
  lastUpdate: number;
}

interface Race2DProps {
  names: string[];
  onRaceComplete: (winner: string) => void;
  raceDuration?: number;
  raceState: RaceState | null;
}

const Race2D: React.FC<Race2DProps> = ({ raceState, onRaceComplete }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  
  const raceTrackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastWinnerRef = useRef<string | null>(null);

  // Update elapsed time based on server state
  useEffect(() => {
    if (!raceState) {
      setElapsedTime(0);
      return;
    }

    if (raceState.status === 'racing' && raceState.startTime) {
      const updateElapsedTime = () => {
        const now = Date.now();
        const elapsed = (now - raceState.startTime!) / 1000;
        setElapsedTime(elapsed);
        
        if (raceState.status === 'racing') {
          animationRef.current = requestAnimationFrame(updateElapsedTime);
        }
      };
      
      animationRef.current = requestAnimationFrame(updateElapsedTime);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else if (raceState.status === 'finished' && raceState.winner) {
      // Calculate final elapsed time
      if (raceState.startTime) {
        const elapsed = (raceState.lastUpdate - raceState.startTime) / 1000;
        setElapsedTime(elapsed);
      }
    }
  }, [raceState]);

  // Handle confetti and race completion
  useEffect(() => {
    if (!raceState || !raceTrackRef.current) return;

    if (raceState.status === 'finished' && raceState.winner) {
      // Only trigger confetti once per winner
      if (lastWinnerRef.current !== raceState.winner && !hasTriggeredConfetti) {
        setHasTriggeredConfetti(true);
        lastWinnerRef.current = raceState.winner;
        
        // Find the racer's lane for targeted confetti
        const racer = raceState.racers.find(r => r.name === raceState.winner);
        if (racer) {
          const rect = raceTrackRef.current.getBoundingClientRect();
          const x = 0.9; // Finish line x position
          const y = (racer.lane * 80 + 50) / rect.height;
          
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x, y },
            gravity: 0.5
          });
        }
        
        // Big confetti celebration
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { x: 0.5, y: 0.5 }
        });

        // Notify parent component after delay
        setTimeout(() => {
          onRaceComplete(raceState.winner!);
        }, 2000);
      }
    } else if (raceState.status !== 'finished') {
      // Reset confetti flag when race starts again
      setHasTriggeredConfetti(false);
      lastWinnerRef.current = null;
    }
  }, [raceState, hasTriggeredConfetti, onRaceComplete]);

  if (!raceState) {
    return (
      <div className="race-track">
        <div className="race-background">
          <p>Waiting for race to start...</p>
        </div>
      </div>
    );
  }

  const racers = raceState.racers;
  const raceStatus = raceState.status;
  const countdown = raceState.countdown;
  const winner = raceState.winner;

  return (
    <div className="race-track" ref={raceTrackRef}>
      <div className="race-background">
        <div className="track-lane-markers">
          {racers.map((_, index) => (
            <div key={`lane-${index}`} className="track-lane" style={{ top: `${10 + index * 90}px` }}></div>
          ))}
        </div>
      </div>
      
      <div className="start-line"></div>
      <div className="finish-line"></div>
      
      {raceStatus === 'countdown' && (
        <div className="countdown-overlay">
          <div className="countdown">{countdown}</div>
        </div>
      )}
      
      <div className="race-stats">
        <div className="race-timer">{elapsedTime.toFixed(2)}s</div>
      </div>
      
      {racers.map((racer) => (
        <div 
          key={racer.name} 
          className={`racer ${racer.finishTime !== null ? 'finished' : ''} ${racer.boostTime > 0 ? 'boosting' : ''} ${racer.slowTime > 0 ? 'slowing' : ''}`}
          style={{ 
            left: `${5 + racer.position}%`, 
            top: `${10 + racer.lane * 90}px`,
            backgroundColor: 'transparent'
          }}
        >
          <div className="human-racer">
            <div className="person">
              <div className="head"></div>
              <div className="body" style={{ backgroundColor: getRandomColor(racer.lane) }}></div>
              <div className="arm"></div>
              <div className="arm arm-extended"></div>
              <div className="leg leg-left"></div>
              <div className="leg leg-right"></div>
            </div>
            <div className="spoon"></div>
            <div className="egg" style={{ 
              transform: `rotate(${racer.wobble * 8}deg) translateY(${Math.sin(racer.position * 2) * 3}px)` 
            }}></div>
          </div>
          <div className="racer-name">{racer.name}</div>
          {racer.finishTime !== null && 
            <div className="finish-time">{racer.finishTime.toFixed(2)}s</div>
          }
        </div>
      ))}
      
      {winner && (
        <div className="winner-overlay">
          <h2>{winner} wins!</h2>
        </div>
      )}
    </div>
  );
};

// Helper function to generate colors
function getRandomColor(index: number): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', 
    '#118AB2', '#EF476F', '#FFC43D', '#1B9AAA',
    '#E76F51', '#2A9D8F', '#E9C46A', '#264653'
  ];
  return colors[index % colors.length];
}

export default Race2D;
