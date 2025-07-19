// 目前只考虑能量

// 带有store的类型

export type StructureWithSpawn =
    | StructureSpawn | StructureExtension;
export const STRUCTURE_WITH_SPAWN_CONST = [
    STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
];

export function isStructureWithSpawn(input: any): input is StructureWithSpawn {
    return input instanceof StructureSpawn
        || input instanceof StructureExtension;
}

export type StructureHaveStoreNoSpawn =
    | StructureContainer | StructureStorage | StructureLink | StructureTower;
export const STRUCTURE_HAVE_STORE_NO_SPAWN_CONST = [
    STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK, STRUCTURE_TOWER,
];

export function isStructureHaveStoreNoSpawn(input: any): input is StructureHaveStoreNoSpawn {
    return input instanceof StructureContainer
        || input instanceof StructureStorage
        || input instanceof StructureLink
        || input instanceof StructureTower;
}


export type StructureHaveStore =
    | StructureWithSpawn
    | StructureHaveStoreNoSpawn;

export const STRUCTURE_HAVE_STORE_CONST = [
    ...STRUCTURE_WITH_SPAWN_CONST,
    ...STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
];

export function isStructureHaveStore(input: any): input is StructureHaveStore {
    return isStructureWithSpawn(input) || isStructureHaveStoreNoSpawn(input);
}

// 可获取能量的类型
export type CanHarvest = Source | Mineral;

export function isCanHarvest(input: any): input is CanHarvest {
    return input instanceof Source || input instanceof Mineral;
}

export type CanWithdraw = StructureHaveStore | Tombstone | Ruin;

export function isCanWithdraw(input: any): input is CanWithdraw {
    return isStructureHaveStore(input) || input instanceof Tombstone || input instanceof Ruin;
}

export type CanPickup = Resource;

export function isCanPickup(input: any): input is CanPickup {
    return input instanceof Resource;
}

export type CanGetSource = CanHarvest | CanPickup | CanWithdraw;

// 可存储能量的类型
export type CanPutSource = StructureHaveStore

export function isCanPutSource(input: any): input is CanPutSource {
    return isStructureHaveStore(input);
}

// 可操作的类型
export type CanWork = ConstructionSite | StructureController | Structure;

function isCanWork(input: any): input is CanWork {
    return input instanceof ConstructionSite
        || input instanceof StructureController
        || input instanceof Structure;
}

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