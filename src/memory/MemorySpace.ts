namespace MemorySpace {
    export interface Position {
        x: number,
        y: number,
        room: string,
    }

    export interface ParkingData {
        [room: string]: MemorySpace.Position | undefined,
    }
}