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

export function usePartyKit(roomId: string = 'main') {
  const [sprintNames, setSprintNames] = useState<SprintName[]>([]);
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [raceDuration, setRaceDuration] = useState<number>(10);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const host = import.meta.env.VITE_PARTYKIT_HOST || 
                 (import.meta.env.PROD ? 'sprint-name-party.tanmay-pathak.partykit.dev' : 'localhost:1999');
    
    if (!host) {
      console.error('PartyKit host not configured');
      return;
    }

    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'ws' : 'wss';
    const wsUrl = `${protocol}://${host}/party/${roomId}`;
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
          if (data.raceDuration !== undefined) {
            setRaceDuration(data.raceDuration);
          }
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

  const updateRaceDuration = (duration: number) => {
    sendMessage({ type: 'updateRaceDuration', raceDuration: duration });
  };

  return {
    sprintNames,
    latestWinner,
    raceState,
    raceDuration,
    isConnected,
    addSprintName,
    deactivateSprintName,
    clearActiveSprintNames,
    saveWinner,
    startRace,
    updateRaceDuration,
  };
}

