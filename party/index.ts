import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  sprintNames: Map<string, { name: string; active: boolean; id: string }>;
  winners: Array<{ name: string; raceDuration: number; timestamp: number }>;

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

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state to newly connected client
    this.sendState(conn);
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

  async onRequest(req: Party.Request) {
    // Save state before returning
    await this.saveState();
    return new Response(JSON.stringify(this.getState()), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

