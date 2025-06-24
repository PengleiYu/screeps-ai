import {
    Builder,
    CONFIG_BUILDER,
    CONFIG_HARVESTER,
    CONFIG_REPAIRER,
    CONFIG_UPGRADER,
    Harvester, Repairer,
    Upgrader
} from "./roles";
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
    const container = getSpawn().room.find(FIND_STRUCTURES,
            {filter: object => object.structureType === STRUCTURE_CONTAINER})
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => {
                return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
            })[0]
        ?? getSpawn();

    let harvester = new Harvester(creep);
    harvester.workHarvest(source, container);
}

export function runBuilder() {

    const room = getSpawn().room;
    // 寻找工地
    const site = room.find(FIND_MY_CONSTRUCTION_SITES)[0];

    // todo 抽象多实体逻辑
    let configs = Array.from({length: 3},
        (_, index) =>
            ({...CONFIG_BUILDER, name: `builder${index}`}),);

    if (!site) {
        // todo 等待前，存储剩余能量
        // 没有工地，在孵化场等待
        for (const config of configs) {
            const creep = checkCreepExist(config, false);
            if (creep && !creep.pos.inRangeTo(getSpawn(), 1)) {
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

function runUpgrader() {
    const creep = checkCreepExist(CONFIG_UPGRADER);
    if (!creep) return;
    const controller = getSpawn().room.controller;
    const container: StructureContainer | undefined = getSpawn().room.find(FIND_STRUCTURES, {
        filter: object => object.structureType === STRUCTURE_CONTAINER
    })[0];
    if (!container || !controller) return;
    new Upgrader(creep).workUpgrade(container, controller);
}

function runRepairer() {
    const creep = checkCreepExist(CONFIG_REPAIRER);
    if (!creep) return;
    const structure = getSpawn().room.find(FIND_STRUCTURES, {
        filter: object => object.hits < object.hitsMax
    }).sort((a, b) => a.hits - b.hits)[0]
    const container = getSpawn().room.find(FIND_STRUCTURES, {
        filter: object => object.structureType === STRUCTURE_CONTAINER
    }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0]

    new Repairer(creep).workRepair(container, structure);
}

export function loop() {
    runHarvester();
    runBuilder();
    runUpgrader();
    runRepairer();
}