export type Positionable = RoomPosition | { pos: RoomPosition };
export type ResourceStorable = StructureContainer | StructureStorage;
export type ResourceWithdrawn = Tombstone | Ruin | ResourceStorable;
export type SpawnStruct = StructureSpawn | StructureExtension;
export var globalInfo = {
    canSpawn: true,
}

/**
 * 当前房间某类建筑的剩余可用数量
 */
function availableBuildings(room: Room, type: BuildableStructureConstant): number {
    const controller = room.controller;
    if (!controller) return 0;
    const max = CONTROLLER_STRUCTURES[type][controller.level];
    const current = room.find(FIND_STRUCTURES, {
        filter: it => it.structureType === type
    }).length;
    return max - current;
}

function bodyCost(body: BodyPartConstant[]): number {
    return body.map(it => BODYPART_COST[it])
        .reduce((previousValue, currentValue) => previousValue + currentValue)
}

export function getSpawn() {
    return Game.spawns['Spawn1'];
}

function getSpawnResultStr(result: ScreepsReturnCode): string {
    switch (result) {
        case OK:
            return 'OK';
        case ERR_NOT_OWNER:
            return 'ERR_NOT_OWNER';
        case ERR_NAME_EXISTS:
            return 'ERR_NAME_EXISTS';
        case ERR_BUSY:
            return 'ERR_BUSY';
        case ERR_NOT_ENOUGH_ENERGY:
            return 'ERR_NOT_ENOUGH_ENERGY';
        case ERR_INVALID_ARGS:
            return 'ERR_INVALID_ARGS';
        case ERR_RCL_NOT_ENOUGH:
            return 'ERR_RCL_NOT_ENOUGH';
        default:
            return 'unknown';
    }
}

export function trySpawn(name: string, body: BodyPartConstant[], memory: CreepMemory): boolean {
    if (!globalInfo.canSpawn) {
        return false;
    }
    globalInfo.canSpawn = false;

    const spawn = getSpawn();
    if (spawn.spawning) {
        return false;
    }
    const result = spawn.spawnCreep(body, name, {memory: memory});
    console.log(`正在孵化${memory.role}:${name}, result=${getSpawnResultStr(result)}`);
    if (result === ERR_NOT_ENOUGH_ENERGY) {
        console.log(`孵化需要能量${(bodyCost(body))}, 可用${(spawn.room.energyAvailable)}, 上限${(spawn.room.energyCapacityAvailable)}`);
    }
    return result == OK;
}

export function getClosestCmpFun<T extends RoomPosition | Positionable | null, E extends RoomPosition | Positionable | null>(center: T)
    : (a: E, b: E) => number {
    return (a, b) => {
        if (!center || !a || !b) return 0;
        const pos = center instanceof RoomPosition ? center : center.pos;
        return pos.getRangeTo(a) - pos.getRangeTo(b);
    };
}

export function getEnergyStorageOfSpawn(checkNotEmpty: boolean = true, center: Positionable = getSpawn()): StructureStorage | null {
    return getSpawn().room.find(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE
    })
        .filter(it => (checkNotEmpty
                ? it.store.getUsedCapacity(RESOURCE_ENERGY)
                : it.store.getFreeCapacity(RESOURCE_ENERGY))
            > 0
        )
        .sort(getClosestCmpFun(center))
        [0];
}

export function getEnergyContainerOfSpawn(checkNotEmpty: boolean = true, center: Positionable = getSpawn()): StructureContainer | null {
    return getSpawn().room.find(FIND_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_CONTAINER
    })
        .filter(it => (checkNotEmpty
                ? it.store.getUsedCapacity(RESOURCE_ENERGY)
                : it.store.getFreeCapacity(RESOURCE_ENERGY))
            > 0
        )
        .sort(getClosestCmpFun(center))
        [0];
}

export function getEnergyDropOfSpawn(center: Positionable = getSpawn()): Ruin | null {
    return (getSpawn().room.find(FIND_RUINS, {
        filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    }).sort(getClosestCmpFun(center)))
        [0];
}

export function getEnergySourceOfSpawn(): Source | null {
    return getSpawn().room.find(FIND_SOURCES)
        .sort(getClosestCmpFun(getSpawn()))
        [0];
}

export function getSpawnStructureNotFull(center: RoomPosition): StructureSpawn | StructureExtension | null {
    const extension: StructureExtension | null = center.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: obj =>
            obj.structureType === STRUCTURE_EXTENSION && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    })
    if (extension) return extension;
    return center.findClosestByRange(FIND_MY_SPAWNS, {
        filter: obj => obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    })
}

export function getClosestEnergyWithdrawn(pos: RoomPosition): ResourceWithdrawn | null {
    const filterRetainEnergy = (it: ResourceWithdrawn) => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const tombstone = pos.findClosestByPath(FIND_TOMBSTONES, {filter: filterRetainEnergy});
    const ruin = pos.findClosestByPath(FIND_RUINS, {filter: filterRetainEnergy});
    const container: StructureContainer | null = pos.findClosestByRange(FIND_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_CONTAINER && filterRetainEnergy(it),
    });
    const storage: StructureStorage | null = pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE && filterRetainEnergy(it)
    });
    const arr = [tombstone, ruin, container, storage];
    return arr.filter(it => !!it)
        .sort(getClosestCmpFun(pos))[0]
}

export function getClosestEnergyWithdrawn2(pos: RoomPosition): Structure | null {
    const findInRange: (StructureContainer | StructureLink)[] = pos.findInRange(FIND_STRUCTURES, 5, {
        filter: it => it.structureType === STRUCTURE_CONTAINER || it.structureType === STRUCTURE_LINK,
    });
    return findInRange
        .filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
        .sort(getClosestCmpFun(pos))
        [0];
}

export function getClosestEnergyStorable(obj: RoomPosition): ResourceStorable | null {
    const filterCapacity = (it: ResourceWithdrawn) => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    const container: StructureContainer | null = obj.findClosestByRange(FIND_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_CONTAINER && filterCapacity(it),
    });
    const storage: StructureStorage | null = obj.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE && filterCapacity(it)
    });
    const arr = [container, storage];
    return arr.filter(it => !!it)
        .sort(getClosestCmpFun(obj))[0]
}

export function getClosestDroppedEnergy(obj: Positionable): Resource<RESOURCE_ENERGY> | null {
    const pos = obj instanceof RoomPosition ? obj : obj.pos;
    return pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: it => it.resourceType === RESOURCE_ENERGY,
    });
}

export function getClosetTombstone(obj: RoomPosition): Tombstone | null {
    return obj.findClosestByPath(FIND_TOMBSTONES, {
        filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    })
}

export function findFlag() {
    const pos = getSpawn().pos;
    return pos.findClosestByRange(FIND_FLAGS, {
        filter: it => it.name === 'Parking'
    })?.pos ?? pos;
}

export function mapToObj<K, V>(map: Map<K, V>): { [key: string]: V } {
    const result: { [key: string]: V } = {};
    for (const [key, value] of map) {
        result[String(key)] = value;
    }
    return result;
}
