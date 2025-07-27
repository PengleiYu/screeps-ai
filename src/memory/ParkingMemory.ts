import ParkingData = MemorySpace.ParkingData;
import {findFlagPos} from "../utils";

export class ParkingMemory {
    static get parkingData(): ParkingData {
        if (Memory.parkingData == null) Memory.parkingData = {};
        return Memory.parkingData;
    }

    static set parkingData(parkingData: ParkingData | null) {
        Memory.parkingData = parkingData ?? undefined;
    }

    static getParkingPos(room: Room): RoomPosition | null {
        let parkingData = this.parkingData;
        let pos = parkingData[room.name];
        if (pos != null) return new RoomPosition(pos.x, pos.y, room.name);

        let flagPos = findFlagPos(room);
        if (flagPos == null) return null;

        parkingData[room.name] = {x: flagPos.x, y: flagPos.y, room: room.name};
        return flagPos;
    }

    static onLoop() {
        // 选用质数，减少碰撞
        if (Game.time % 11 === 0) this.parkingData = null;
    }
}