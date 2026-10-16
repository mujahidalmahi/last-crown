import { InviteCodeGenerator } from '../security/InviteCodeGenerator.js';

export interface RoomRegistration {
  roomId: string;
  inviteCode: string;
  createdAt: number;
  playerCount: number;
}

export class RoomRegistry {
  private static instance: RoomRegistry;

  private codeToRoom = new Map<string, RoomRegistration>();
  private roomToCode = new Map<string, string>();

  public static getInstance(): RoomRegistry {
    if (!RoomRegistry.instance) {
      RoomRegistry.instance = new RoomRegistry();
    }
    return RoomRegistry.instance;
  }

  public registerRoom(roomId: string): string {
    // Return existing invite code if already registered for this room
    if (this.roomToCode.has(roomId)) {
      return this.roomToCode.get(roomId)!;
    }

    // Generate unique code that is not currently assigned
    let code = '';
    let attempts = 0;
    do {
      code = InviteCodeGenerator.generate();
      attempts++;
      if (attempts > 50) {
        throw new Error('Unable to generate unique invite code; namespace saturated');
      }
    } while (this.codeToRoom.has(code));

    const registration: RoomRegistration = {
      roomId,
      inviteCode: code,
      createdAt: Date.now(),
      playerCount: 1,
    };

    this.codeToRoom.set(code, registration);
    this.roomToCode.set(roomId, code);

    return code;
  }

  public getCodeByRoomId(roomId: string): string | undefined {
    return this.roomToCode.get(roomId);
  }

  public getRoomByCode(code: string): RoomRegistration | undefined {
    return this.codeToRoom.get(code.toUpperCase());
  }

  public updatePlayerCount(roomId: string, count: number): void {
    const code = this.roomToCode.get(roomId);
    if (code) {
      const reg = this.codeToRoom.get(code);
      if (reg) {
        reg.playerCount = count;
      }
    }
  }

  public unregisterRoom(roomId: string): void {
    const code = this.roomToCode.get(roomId);
    if (code) {
      this.codeToRoom.delete(code);
      this.roomToCode.delete(roomId);
    }
  }

  public getActiveRoomCount(): number {
    return this.codeToRoom.size;
  }

  public getTotalPlayerCount(): number {
    let total = 0;
    for (const reg of this.codeToRoom.values()) {
      total += reg.playerCount;
    }
    return total;
  }

  public getAllRegistrations(): RoomRegistration[] {
    return Array.from(this.codeToRoom.values());
  }

  public pruneStaleRooms(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let prunedCount = 0;
    for (const [code, reg] of Array.from(this.codeToRoom.entries())) {
      if (now - reg.createdAt > maxAgeMs) {
        this.codeToRoom.delete(code);
        this.roomToCode.delete(reg.roomId);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  public clear(): void {
    this.codeToRoom.clear();
    this.roomToCode.clear();
  }
}
