import {Builder, CONFIG_BUILDER, CONFIG_HARVESTER, Harvester} from "./roles";
import {trySpawnCreep} from "./utils";


declare global {

    interface CreepMemory {
        state: string,
    }
}

export function runHarvester() {
    let creep = Game.creeps[CONFIG_HARVESTER.name]
    if (!creep) {
        trySpawnCreep(CONFIG_HARVESTER);
        return;
    }
    let source = creep.room.find(FIND_SOURCES)[0];
    let harvester = new Harvester(creep);
    harvester.workHarvest(source);
}

export function runBuilder() {
    const creep = Game.creeps[CONFIG_BUILDER.name];
    if (!creep) {
        trySpawnCreep(CONFIG_BUILDER);
        return;
    }
    const room = creep.room;
    const source = room.find(FIND_SOURCES)[0];
    const site = room.find(FIND_MY_CONSTRUCTION_SITES)[0];
    let builder = new Builder(creep);
    builder.workBuild(source, site);
}

export function loop() {
    runHarvester();
    runBuilder();
}