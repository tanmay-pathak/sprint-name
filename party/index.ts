import type * as Party from "partykit/server";

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

export default class Server implements Party.Server {
  sprintNames: Map<string, { name: string; active: boolean; id: string }>;
  winners: Array<{ name: string; raceDuration: number; timestamp: number }>;
  raceState: RaceState | null = null;
  raceUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(public room: Party.Room) {
    this.sprintNames = new Map();
    this.winners = [];
  }

  async onStart() {
    // Try to load from storage if available
    const stored = await this.room.storage.get<{
      sprintNames: Array<{ name: string; active: boolean; id: string }>;
      winners: Array<{ name: string; raceDuration: number; timestamp: number }>;
    }>("state");

    if (stored) {
      this.sprintNames = new Map(
        stored.sprintNames.map((item) => [item.id, item])
      );
      this.winners = stored.winners || [];
    }
  }

  onClose() {
    if (this.raceUpdateInterval) {
      clearInterval(this.raceUpdateInterval);
      this.raceUpdateInterval = null;
    }
  }

  onConnect(conn: Party.Connection) {
    // Send current state to newly connected client
    this.sendState(conn);
    // Also send race state if there's an active race
    this.sendRaceState(conn);
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case "addSprintName":
          this.handleAddSprintName(data.name);
          break;
        case "deactivateSprintName":
          this.handleDeactivateSprintName(data.id);
          break;
        case "clearActiveSprintNames":
          this.handleClearActiveSprintNames();
          break;
        case "saveWinner":
          this.handleSaveWinner(data.name, data.raceDuration);
          break;
        case "getState":
          this.sendState(sender);
          break;
        case "startRace":
          this.handleStartRace(data.names, data.raceDuration);
          break;
        case "getRaceState":
          this.sendRaceState(sender);
          break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  async handleAddSprintName(name: string) {
    const id = crypto.randomUUID();
    this.sprintNames.set(id, { name, active: true, id });
    await this.saveState();
    this.broadcastState();
  }

  async handleDeactivateSprintName(id: string) {
    const sprintName = this.sprintNames.get(id);
    if (sprintName) {
      this.sprintNames.set(id, { ...sprintName, active: false });
      await this.saveState();
      this.broadcastState();
    }
  }

  async handleClearActiveSprintNames() {
    for (const [id, sprintName] of this.sprintNames.entries()) {
      if (sprintName.active) {
        this.sprintNames.set(id, { ...sprintName, active: false });
      }
    }
    await this.saveState();
    this.broadcastState();
  }

  async handleSaveWinner(name: string, raceDuration: number) {
    this.winners.push({
      name,
      raceDuration,
      timestamp: Date.now(),
    });
    // Keep only the last 100 winners
    if (this.winners.length > 100) {
      this.winners.shift();
    }
    await this.saveState();
    this.broadcastState();
  }

  getActiveSprintNames() {
    return Array.from(this.sprintNames.values())
      .filter((item) => item.active)
      .map((item) => ({
        _id: item.id,
        _creationTime: Date.now(), // Approximate
        name: item.name,
        active: item.active,
      }));
  }

  getLatestWinner() {
    return this.winners.length > 0 ? this.winners[this.winners.length - 1] : null;
  }

  getState() {
    return {
      sprintNames: this.getActiveSprintNames(),
      latestWinner: this.getLatestWinner(),
    };
  }

  sendState(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "state", ...this.getState() }));
  }

  broadcastState() {
    const state = this.getState();
    this.room.broadcast(JSON.stringify({ type: "state", ...state }));
  }

  async saveState() {
    await this.room.storage.put("state", {
      sprintNames: Array.from(this.sprintNames.values()),
      winners: this.winners,
    });
  }

  handleStartRace(names: string[], raceDuration: number) {
    // Stop any existing race
    if (this.raceUpdateInterval) {
      clearInterval(this.raceUpdateInterval);
      this.raceUpdateInterval = null;
    }

    // Initialize racers
    const racers: Racer[] = names.map((name, index) => {
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

    // Start countdown
    this.raceState = {
      status: 'countdown',
      countdown: 3,
      startTime: null,
      raceDuration,
      racers,
      winner: null,
      lastUpdate: Date.now()
    };

    // Broadcast initial state
    this.broadcastRaceState();

    // Start countdown timer
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      if (!this.raceState) {
        clearInterval(countdownInterval);
        return;
      }

      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        // Start the race
        this.raceState.status = 'racing';
        this.raceState.countdown = 0;
        this.raceState.startTime = Date.now();
        this.raceState.lastUpdate = Date.now();
        this.broadcastRaceState();

        // Start race update loop (60fps = ~16ms intervals)
        this.raceUpdateInterval = setInterval(() => {
          this.updateRace();
        }, 16);
      } else {
        this.raceState.countdown = countdown;
        this.raceState.lastUpdate = Date.now();
        this.broadcastRaceState();
      }
    }, 1000);
  }

  updateRace() {
    if (!this.raceState || this.raceState.status !== 'racing' || !this.raceState.startTime) {
      return;
    }

    const now = Date.now();
    const raceTimeMs = now - this.raceState.startTime;
    const raceTime = raceTimeMs / 1000;
    const deltaTime = (now - this.raceState.lastUpdate) / 1000;
    this.raceState.lastUpdate = now;

    // Update racers
    let hasWinner = false;
    const updatedRacers = this.raceState.racers.map(racer => {
      if (racer.finishTime !== null) {
        return racer;
      }

      // Dynamic speed changes
      let newSpeed = racer.speed;
      let newBoostTime = Math.max(0, racer.boostTime - deltaTime);
      let newSlowTime = Math.max(0, racer.slowTime - deltaTime);

      // Random chance for speed boost or slowdown (using deterministic seed based on race time)
      const seed = Math.floor(raceTime * 10) + racer.lane;
      const random = (Math.sin(seed) * 10000) % 1;
      
      if (random < 0.01 && newBoostTime === 0 && newSlowTime === 0) {
        const boostRandom = (Math.sin(seed * 2) * 10000) % 1;
        if (boostRandom < 0.5) {
          newBoostTime = 1 + (Math.sin(seed * 3) * 10000) % 1.5;
        } else {
          newSlowTime = 0.8 + (Math.sin(seed * 4) * 10000) % 1.2;
        }
      }

      // Apply continuous small variations (deterministic)
      const variationSeed = Math.floor(raceTime * 20) + racer.lane;
      const variationFactor = 1 + ((Math.sin(variationSeed) * 10000) % 1 * 0.2 - 0.1);

      // Calculate final speed
      if (newBoostTime > 0) {
        newSpeed = racer.baseSpeed * (1.2 + 0.4 * (newBoostTime / 2.5)) * variationFactor;
      } else if (newSlowTime > 0) {
        newSpeed = racer.baseSpeed * (0.8 - 0.4 * (newSlowTime / 2)) * variationFactor;
      } else {
        newSpeed = racer.baseSpeed * variationFactor;
      }

      // Move racer
      const distance = newSpeed * deltaTime;
      const newPosition = racer.position + distance;
      const finished = newPosition >= 85;

      // Update wobble effect
      const wobbleSpeed = 2.5;
      const newWobble = Math.sin(raceTime * wobbleSpeed + racer.lane) * 1.2;

      // Check if this racer just finished
      if (finished && this.raceState && !this.raceState.winner) {
        hasWinner = true;
        this.raceState.winner = racer.name;
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

    this.raceState.racers = updatedRacers;

    // If race finished, stop updates
    if (hasWinner) {
      this.raceState.status = 'finished';
      if (this.raceUpdateInterval) {
        clearInterval(this.raceUpdateInterval);
        this.raceUpdateInterval = null;
      }
    }

    // Broadcast updated state
    this.broadcastRaceState();
  }

  sendRaceState(conn: Party.Connection) {
    if (this.raceState) {
      conn.send(JSON.stringify({ 
        type: "raceState", 
        raceState: this.raceState 
      }));
    } else {
      conn.send(JSON.stringify({ 
        type: "raceState", 
        raceState: null 
      }));
    }
  }

  broadcastRaceState() {
    if (this.raceState) {
      this.room.broadcast(JSON.stringify({ 
        type: "raceState", 
        raceState: this.raceState 
      }));
    } else {
      this.room.broadcast(JSON.stringify({ 
        type: "raceState", 
        raceState: null 
      }));
    }
  }

  async onRequest() {
    // Save state before returning
    await this.saveState();
    return new Response(JSON.stringify(this.getState()), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

