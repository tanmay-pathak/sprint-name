import { useEffect, useState, useRef } from 'react';
import '../styles/Race2D.css';
import confetti from 'canvas-confetti';

interface Race2DProps {
  names: string[];
  onRaceComplete: (winner: string) => void;
  raceDuration?: number;
}

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

const Race2D: React.FC<Race2DProps> = ({ names, onRaceComplete, raceDuration = 10 }) => {
  const [racers, setRacers] = useState<Racer[]>([]);
  const [raceStatus, setRaceStatus] = useState<'countdown' | 'racing' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const raceTrackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const raceStatusRef = useRef<'countdown' | 'racing' | 'finished'>('countdown');
  const racersRef = useRef<Racer[]>([]);
  const frameCountRef = useRef(0);
  
  // Sync racers state with ref for animation frame
  useEffect(() => {
    racersRef.current = racers;
  }, [racers]);
  
  // Update ref when race status changes
  useEffect(() => {
    raceStatusRef.current = raceStatus;
  }, [raceStatus]);
  
  // Initialize racers and start countdown
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Reset state
    setRaceStatus('countdown');
    raceStatusRef.current = 'countdown';
    setCountdown(3);
    setWinner(null);
    setElapsedTime(0);
    startTimeRef.current = null;
    lastTimeRef.current = 0;
    frameCountRef.current = 0;
    
    // Create new racers with similar starting speeds
    const newRacers = names.map((name, index) => {
      // Everyone starts at roughly the same speed
      const baseSpeed = (85 / raceDuration) * (0.9 + Math.random() * 0.2);
      
      return {
        name,
        position: 0,
        speed: baseSpeed,
        baseSpeed: baseSpeed,
        lane: index,
        wobble: Math.random() * 2 - 1,
        finishTime: null,
        boostTime: 0,
        slowTime: 0
      };
    });
    
    setRacers(newRacers);
    racersRef.current = newRacers;
    
    // Start the countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setRaceStatus('racing');
          raceStatusRef.current = 'racing';
          startTimeRef.current = performance.now();
          lastTimeRef.current = performance.now();
          requestAnimationFrame(animateRace);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(countdownInterval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, raceDuration]);
  
  const animateRace = (timestamp: number) => {
    if (raceStatusRef.current !== 'racing') {
      animationRef.current = requestAnimationFrame(animateRace);
      return;
    }
    
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animateRace);
      return;
    }
    
    // Calculate time delta in seconds
    const deltaTimeMs = timestamp - lastTimeRef.current;
    const deltaTime = deltaTimeMs / 1000;
    lastTimeRef.current = timestamp;
    
    // Calculate elapsed race time
    const raceTimeMs = timestamp - startTimeRef.current;
    const raceTime = raceTimeMs / 1000;
    
    // Only update UI timer every few frames to reduce rendering
    frameCountRef.current++;
    if (frameCountRef.current % 5 === 0) {
      setElapsedTime(raceTime);
    }
    
    // Update racers positions
    let newWinner = false;
    let winnerName = '';
    
    const updatedRacers = racersRef.current.map(racer => {
      if (racer.finishTime !== null) {
        return racer;
      }
      
      // Dynamic speed changes
      let newSpeed = racer.speed;
      let newBoostTime = Math.max(0, racer.boostTime - deltaTime);
      let newSlowTime = Math.max(0, racer.slowTime - deltaTime);
      
      // Random chance for speed boost or slowdown
      if (Math.random() < 0.01 && newBoostTime === 0 && newSlowTime === 0) {
        if (Math.random() < 0.5) {
          // Boost!
          newBoostTime = 1 + Math.random() * 1.5; // Boost for 1-2.5 seconds
        } else {
          // Slowdown!
          newSlowTime = 0.8 + Math.random() * 1.2; // Slow for 0.8-2 seconds
        }
      }
      
      // Apply continuous small variations
      const variationFactor = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
      
      // Calculate final speed
      if (newBoostTime > 0) {
        // Boost - up to 60% faster
        newSpeed = racer.baseSpeed * (1.2 + 0.4 * (newBoostTime / 2.5)) * variationFactor;
      } else if (newSlowTime > 0) {
        // Slowdown - up to 60% slower
        newSpeed = racer.baseSpeed * (0.8 - 0.4 * (newSlowTime / 2)) * variationFactor;
      } else {
        // Normal - small random variations
        newSpeed = racer.baseSpeed * variationFactor;
      }
      
      // Move racer
      const distance = newSpeed * deltaTime;
      const newPosition = racer.position + distance;
      const finished = newPosition >= 85;
      
      // Update wobble effect
      const wobbleSpeed = 2.5; // Wobble frequency
      const newWobble = Math.sin(raceTime * wobbleSpeed + racer.lane) * 1.2;
      
      // Check if this racer just finished
      if (finished && !winner && !newWinner) {
        newWinner = true;
        winnerName = racer.name;
      }
      
      return {
        ...racer,
        position: finished ? 85 : newPosition,
        speed: newSpeed,
        wobble: newWobble,
        finishTime: finished ? raceTime : null,
        boostTime: newBoostTime,
        slowTime: newSlowTime
      };
    });
    
    // Update racers state - batch with other UI updates
    if (frameCountRef.current % 2 === 0 || newWinner) {
      setRacers(updatedRacers);
    }
    
    // Always update the reference for the next animation frame
    racersRef.current = updatedRacers;
    
    // Handle winner
    if (newWinner) {
      handleRacerFinish(winnerName);
    }
    
    // Continue animation if not finished
    if (raceStatusRef.current === 'racing') {
      animationRef.current = requestAnimationFrame(animateRace);
    }
  };
  
  const handleRacerFinish = (racerName: string) => {
    // Set the winner
    setWinner(racerName);
    setRaceStatus('finished');
    raceStatusRef.current = 'finished';
    
    // Play confetti for the winner
    if (raceTrackRef.current) {
      // Find the racer's lane for targeted confetti
      const racer = racersRef.current.find(r => r.name === racerName);
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
    }
    
    // Notify parent component after delay
    setTimeout(() => {
      onRaceComplete(racerName);
    }, 2000);
  };
  
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