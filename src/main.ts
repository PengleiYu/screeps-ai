const harvesterConfig: SpawnConfig = {
    name: 'harvester1',
    body: [MOVE, WORK, CARRY],
}
const builderConfig: SpawnConfig = {
    name: 'builder',
    body: [MOVE, WORK, CARRY],
}

interface SpawnConfig {
    body: BodyPartConstant[];
    name: string;
}


function getSpawn() {
    return Game.spawns['Spawn1'];
}

function trySpawnCreep(config: SpawnConfig) {
    const spawn = getSpawn();
    if (spawn.spawning) {
        return;
    }
    console.log('开始孵化', config.name)
    let spawnResult = spawn.spawnCreep(config.body, config.name,);
    if (spawnResult != OK) {
        console.log(config.name, "孵化失败", spawnResult);
    }
}

function doHarvest(creep: Creep, source: Source) {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
    } else {
        const spawn = getSpawn();
        if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(spawn, {
                visualizePathStyle: {
                    lineStyle: 'dashed',
                }
            });
        }
    }
}

function runHarvester() {
    let harvester = Game.creeps[harvesterConfig.name]
    if (!harvester) {
        trySpawnCreep(harvesterConfig);
        return;
    }
    let source = harvester.room.find(FIND_SOURCES)[0];
    doHarvest(harvester, source);
}

const MEMORY_STATE_HARVEST = "harvest";
const MEMORY_STATE_BUILD = "build";
const MEMORY_STATE_STORE = "store";

declare global {

    interface CreepMemory {
        state: string,
    }
}

function doBuild(creep: Creep, source: Source, site: ConstructionSite) {
    // console.log('doBuild', creep, source, site);
    if (!creep.memory.state) {
        creep.memory.state = MEMORY_STATE_HARVEST;
    }
    if (creep.memory.state === MEMORY_STATE_BUILD && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.state = MEMORY_STATE_HARVEST;
        console.log('建造者进入采集模式');
    } else if (creep.memory.state === MEMORY_STATE_HARVEST && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.state = MEMORY_STATE_BUILD;
        console.log('建造者进入建造模式');
    }

    if (creep.memory.state === MEMORY_STATE_BUILD) {
        if (creep.build(site) === ERR_NOT_IN_RANGE) {
            creep.moveTo(site);
        }
    } else if (creep.memory.state === MEMORY_STATE_HARVEST) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
    }
}

function runBuilder() {
    const builder = Game.creeps[builderConfig.name];
    if (!builder) {
        trySpawnCreep(builderConfig);
        return;
    }
    const source = builder.room.find(FIND_SOURCES)[0];
    const site = builder.room.find(FIND_MY_CONSTRUCTION_SITES)[0];
    doBuild(builder, source, site);
}

export function loop() {
    runHarvester();
    runBuilder();
}