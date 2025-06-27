export type Positionable = { pos: RoomPosition }
export var globalInfo = {
    canSpawn: true,
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
    return result == OK;
}

export function getClosestCmpFun<T extends Positionable | undefined, E extends Positionable | undefined>(center: T)
    : (a: E, b: E) => number {
    return (a, b) => {
        if (!center || !a || !b) return 0;
        return center.pos.getRangeTo(a) - center.pos.getRangeTo(b);
    };
}

export function getEnergyStorageOfSpawn(checkNotEmpty: boolean = true, center: Positionable = getSpawn()): StructureStorage | undefined {
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

export function getEnergyContainerOfSpawn(checkNotEmpty: boolean = true, center: Positionable = getSpawn()): StructureContainer | undefined {
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

export function getEnergyDropOfSpawn(center: Positionable = getSpawn()): Ruin | undefined {
    return (getSpawn().room.find(FIND_RUINS, {
        filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    }).sort(getClosestCmpFun(center)))
        [0];
}

export function getEnergySourceOfSpawn(): Source | undefined {
    return getSpawn().room.find(FIND_SOURCES)
        .sort(getClosestCmpFun(getSpawn()))
        [0];
}

export function getSpawnStructureNotFull(center: Positionable): StructureSpawn | StructureExtension | undefined {
    return getSpawn().room.find(FIND_MY_STRUCTURES, {
        filter: obj => obj.structureType === STRUCTURE_SPAWN || obj.structureType === STRUCTURE_EXTENSION
    })
        .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        .sort(getClosestCmpFun(center)) [0];
}