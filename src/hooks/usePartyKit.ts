import { useEffect, useState, useRef } from 'react';

interface SprintName {
  _id: string;
  _creationTime: number;
  name: string;
  active: boolean;
}

interface Winner {
  name: string;
  raceDuration: number;
  timestamp: number;
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

interface RaceState {
  status: 'idle' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  startTime: number | null;
  raceDuration: number;
  racers: Racer[];
  winner: string | null;
  lastUpdate: number;
}

interface PartyState {
  sprintNames: SprintName[];
  latestWinner: Winner | null;
}

export function usePartyKit(roomId: string = 'main') {
  const [sprintNames, setSprintNames] = useState<SprintName[]>([]);
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Determine the host - use environment variable or default to localhost for dev
    const host = import.meta.env.VITE_PARTYKIT_HOST || 
                 (import.meta.env.DEV ? 'localhost:1999' : undefined);
    
    if (!host) {
      console.error('PartyKit host not configured');
      return;
    }

    // Construct WebSocket URL
    // For local dev: ws://localhost:1999/party/main
    // For production: wss://your-project.partykit.dev/party/main
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'ws' : 'wss';
    const wsUrl = `${protocol}://${host}/party/${roomId}`;
    
    // Create WebSocket connection
    const socket = new WebSocket(wsUrl);

    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      // Request initial state
      socket.send(JSON.stringify({ type: 'getState' }));
      // Request race state
      socket.send(JSON.stringify({ type: 'getRaceState' }));
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error('PartyKit connection error:', error);
      setIsConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'state') {
          setSprintNames(data.sprintNames || []);
          setLatestWinner(data.latestWinner || null);
        } else if (data.type === 'raceState') {
          setRaceState(data.raceState || null);
        }
      } catch (error) {
        console.error('Error parsing PartyKit message:', error);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = (message: Record<string, unknown>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && isConnected) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  const addSprintName = (name: string) => {
    sendMessage({ type: 'addSprintName', name });
  };

  const deactivateSprintName = (id: string) => {
    sendMessage({ type: 'deactivateSprintName', id });
  };

  const clearActiveSprintNames = () => {
    sendMessage({ type: 'clearActiveSprintNames' });
  };

  const saveWinner = (name: string, raceDuration: number) => {
    sendMessage({ type: 'saveWinner', name, raceDuration });
  };

  const startRace = (names: string[], raceDuration: number) => {
    sendMessage({ type: 'startRace', names, raceDuration });
  };

  return {
    sprintNames,
    latestWinner,
    raceState,
    isConnected,
    addSprintName,
    deactivateSprintName,
    clearActiveSprintNames,
    saveWinner,
    startRace,
  };
}

