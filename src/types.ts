// 目前只考虑能量

// 带有store的类型

export type StructureWithSpawn =
    | StructureSpawn | StructureExtension;
export const STRUCTURE_WITH_SPAWN_CONST = [
    STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
];
export type StructureHaveStoreNoSpawn =
    | StructureContainer | StructureStorage | StructureLink;
export const STRUCTURE_HAVE_STORE_NO_SPAWN_CONST = [
    STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK,
];
export type StructureHaveStore =
    | StructureWithSpawn
    | StructureHaveStoreNoSpawn;

export const STRUCTURE_HAVE_STORE_CONST = [
    ...STRUCTURE_WITH_SPAWN_CONST,
    ...STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
];


// 可获取能量的类型
export type CanHarvest = Source
export type CanWithdraw = StructureHaveStore | Tombstone | Ruin;
export type CanPickup = Resource<RESOURCE_ENERGY>;
export type CanGetEnergy = CanHarvest | CanPickup | CanWithdraw;

// 可存储能量的类型
export type CanPutEnergy = StructureHaveStore

// 可操作的类型
export type CanWork = ConstructionSite | StructureController;

// 大杂烩
export type ActionReturnCode = CreepActionReturnCode | ScreepsReturnCode

interface IPosition {
    roomName?: string;
    x?: number;
    y?: number;
}

export class MyPosition {
    constructor(private pos: IPosition) {
    }

    toJson(): string {
        return JSON.stringify(this.pos);
    }

    toRoomPosition(): RoomPosition | null {
        const pos = this.pos;
        if (pos.roomName != undefined && pos.x != undefined && pos.y != undefined)
            return new RoomPosition(pos.x, pos.y, pos.roomName);
        return null;
    }

    static fromJson(json: string): MyPosition {
        const parse = JSON.parse(json) as IPosition;
        return new MyPosition(parse);
    }

    static fromRoomPosition(pos: RoomPosition) {
        return new MyPosition({roomName: pos.roomName, x: pos.x, y: pos.y});
    }
}