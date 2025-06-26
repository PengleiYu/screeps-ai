export type Positionable = { pos: RoomPosition }

export interface SpawnConfig {
    body: BodyPartConstant[];
    name: string;
}

export function getSpawn() {
    return Game.spawns['Spawn1'];
}

export function trySpawnCreep(roleName: string, roleBody: BodyPartConstant[]) {
    const spawn = getSpawn();
    if (spawn.spawning) {
        return;
    }
    console.log('开始孵化', roleName)
    let spawnResult = spawn.spawnCreep(roleBody, roleName,);
    if (spawnResult != OK) {
        console.log(roleName, "孵化失败", spawnResult);
    }
}

export function checkCreepExist(config: SpawnConfig, spawnIfNotExist: boolean = true): Creep | undefined {
    const creep = Game.creeps[config.name];
    if (creep) return creep;
    if (spawnIfNotExist) {
        const roleName = config.name;
        const roleBody = config.body;
        trySpawnCreep(roleName, roleBody);
    }
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