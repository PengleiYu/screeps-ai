import {Builder, CONFIG_BUILDER, CONFIG_HARVESTER, Harvester} from "./roles";
import {getSpawn, SpawnConfig, trySpawnCreep} from "./utils";


declare global {

    interface CreepMemory {
        state: string,
    }
}

function checkCreepExist(config: SpawnConfig, spawnIfNotExist: boolean = true): Creep | undefined {
    const creep = Game.creeps[config.name];
    if (creep) return creep;
    if (spawnIfNotExist) trySpawnCreep(config);
}

export function runHarvester() {
    let creep = checkCreepExist(CONFIG_HARVESTER);
    if (!creep) return;

    // 寻找资源
    let source = getSpawn().room.find(FIND_SOURCES)[0];
    // 寻找容器，没有则使用孵化器
    const container = getSpawn().room.find(FIND_STRUCTURES, {
        filter: object => object.structureType === STRUCTURE_CONTAINER,
    })[0] ?? getSpawn();

    let harvester = new Harvester(creep);
    harvester.workHarvest(source, container);
}

export function runBuilder() {

    const room = getSpawn().room;
    // 寻找工地
    const site = room.find(FIND_MY_CONSTRUCTION_SITES)[0];

    let configs = Array.from({length: 3},
        (_, index) =>
            ({...CONFIG_BUILDER, name: `builder${index}`}),);

    if (!site) {
        // 没有工地，在孵化场等待
        for (const config of configs) {
            const creep = checkCreepExist(config, false);
            if (creep && !creep.pos.inRangeTo(getSpawn(), 10)) {
                creep.moveTo(getSpawn())
            }
        }
        return;
    }


    // 寻找资源容器，若没有则使用资源点
    const source: StructureContainer | Source = room.find(FIND_STRUCTURES, {
            filter: object =>
                object.structureType === STRUCTURE_CONTAINER,
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0]
        ?? room.find(FIND_SOURCES)[0];

    let spawnIfNotExist = true;
    for (const config of configs) {
        const creep = checkCreepExist(config, spawnIfNotExist);
        if (!creep) {
            // creep不存在，已提交孵化，后续不再尝试孵化
            spawnIfNotExist = false;
            return;
        }
        let builder = new Builder(creep);
        builder.workBuild(source, site);
    }

}

export function loop() {
    runHarvester();
    runBuilder();
}