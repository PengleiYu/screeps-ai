namespace MemorySpace {
    export interface Position {
        x: number,
        y: number,
        room: string,
    }

    export interface ParkingData {
        [room: string]: MemorySpace.Position | undefined,
    }

    function parkingPosData() {
        if (Memory.parkingData == null) Memory.parkingData = {};
        const parkingPos = Memory.parkingData;
    }
}