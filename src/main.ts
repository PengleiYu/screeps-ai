import {
    Builder,
    CONFIG_BUILDER,
    CONFIG_HARVESTER,
    CONFIG_REPAIRER,
    CONFIG_UPGRADER,
    Harvester,
    Repairer,
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

// todo 目前所有的role都有相同模式：从一个地方拿资源，到另一个地方干活，
// todo 应该抽象出来，变化点在于拿资源和干活的地方，不变点是拿资源、移动、干活

export function runHarvester() {
    let creep = checkCreepExist(CONFIG_HARVESTER);
    if (!creep) return;

    new Harvester(creep).work();
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


    let spawnIfNotExist = true;
    for (const config of configs) {
        const creep = checkCreepExist(config, spawnIfNotExist);
        if (!creep) {
            // creep不存在，已提交孵化，后续不再尝试孵化
            spawnIfNotExist = false;
            continue;
        }
        new Builder(creep).work();
    }

}

function runUpgrader() {
    const configs = Array.from({length: 3},
        (_, index) => ({...CONFIG_UPGRADER, name: `upgrader${index}`}))
    let spawnIfNotExist = true;
    for (const config of configs) {
        const creep = checkCreepExist(config, spawnIfNotExist);
        if (!creep) {
            spawnIfNotExist = false;
            continue;
        }
        new Upgrader(creep).work();
    }
}

function runRepairer() {
    const creep = checkCreepExist(CONFIG_REPAIRER);
    if (!creep) return;

    new Repairer(creep).work();
}

export function loop() {
    runHarvester();
    runBuilder();
    runUpgrader();
    runRepairer();
}