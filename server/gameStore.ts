import type { RoomState } from "../src/shared/types";

/**
 * Abstraksi penyimpanan room.
 * MVP memakai in-memory; untuk produksi tinggal ganti dengan RedisRoomStore
 * yang mengimplementasikan interface yang sama (lihat README).
 */
export interface RoomStore {
  get(code: string): RoomState | undefined;
  set(code: string, room: RoomState): void;
  delete(code: string): void;
  values(): IterableIterator<RoomState>;
}

export class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomState>();

  get(code: string) {
    return this.rooms.get(code);
  }

  set(code: string, room: RoomState) {
    this.rooms.set(code, room);
  }

  delete(code: string) {
    this.rooms.delete(code);
  }

  values() {
    return this.rooms.values();
  }
}
