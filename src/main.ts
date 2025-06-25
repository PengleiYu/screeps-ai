import {CONFIG_REPAIRER, CONFIG_TRANSFER, CONFIG_UPGRADER, Repairer, Transfer, Upgrader} from "./roles";
import {SpawnConfig, trySpawnCreep} from "./utils";
import {BuildController, HarvestController} from "./controller";

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

function runTransfer() {
    const creep = checkCreepExist(CONFIG_TRANSFER);
    if (!creep) return;

    new Transfer(creep).work();
}

export function loop() {
    new HarvestController().run();
    runTransfer();
    new BuildController().run();
    runUpgrader();
    runRepairer();
}