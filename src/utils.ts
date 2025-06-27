export type Positionable = { pos: RoomPosition };
export type ResourceStorable = StructureContainer | StructureStorage;
export type ResourceWithdrawn = Tombstone | Ruin | ResourceStorable;
export type SpawnStruct = StructureSpawn | StructureExtension;
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

export function getClosestCmpFun<T extends RoomPosition | Positionable | undefined, E extends RoomPosition | Positionable | undefined>(center: T)
    : (a: E, b: E) => number {
    return (a, b) => {
        if (!center || !a || !b) return 0;
        const pos = center instanceof RoomPosition ? center : center.pos;
        return pos.getRangeTo(a) - pos.getRangeTo(b);
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

export function getClosestEnergyWithdrawn(creep: Creep): ResourceWithdrawn | undefined {
    const filterRetainEnergy = (it: ResourceWithdrawn) => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: filterRetainEnergy});
    const ruin = creep.pos.findClosestByPath(FIND_RUINS, {filter: filterRetainEnergy});
    const container: StructureContainer | null = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_CONTAINER && filterRetainEnergy(it),
    });
    const storage: StructureStorage | null = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE && filterRetainEnergy(it)
    });
    const arr = [tombstone, ruin, container, storage];
    return arr.filter(it => !!it)
        .sort(getClosestCmpFun(creep))[0]
}

export function getClosestEnergyStorable(obj: RoomPosition): ResourceStorable | undefined {
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
    return obj.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: it => it.resourceType === RESOURCE_ENERGY,
    });
}