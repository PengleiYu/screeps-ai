import {SpawnConfig} from "./utils";

class BaseRole {
    protected creep: Creep;

    constructor(creep: Creep) {
        this.creep = creep;
    }

    visualizeMoveTo(target: RoomPosition | { pos: RoomPosition },) {
        this.creep.moveTo(target, {
            visualizePathStyle: {
                lineStyle: 'dashed',
            }
        });
    }
}

export class Harvester extends BaseRole {

    workHarvest(source: Source, structure: Structure) {
        // console.log('workerHarvest', source, structure);
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        } else {
            if (this.creep.transfer(structure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(structure);
            }
        }
    }
}

export class Builder extends BaseRole {

    workBuild(source: Source | StructureContainer, site: ConstructionSite) {
        // console.log('doBuild', creep, source, site);
        const creep = this.creep;
        const memory = creep.memory;
        if (!memory.state) {
            memory.state = MEMORY_STATE_HARVEST;
        }

        if (memory.state === MEMORY_STATE_BUILD && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            memory.state = MEMORY_STATE_HARVEST;
            console.log('建造者进入采集模式');
        } else if (memory.state === MEMORY_STATE_HARVEST && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            memory.state = MEMORY_STATE_BUILD;
            console.log('建造者进入建造模式');
        }

        if (memory.state === MEMORY_STATE_BUILD) {
            if (creep.build(site) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(site);
            }
        } else if (memory.state === MEMORY_STATE_HARVEST) {
            const result = source instanceof Source
                ? creep.harvest(source) : creep.withdraw(source, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        }
    }
}

export class Upgrader extends BaseRole {
    workUpgrade(container: StructureContainer, controller: StructureController) {
        console.log('workUpgrade', container, controller);
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(controller);
            }
        } else {
            if (this.creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(container);
            }
        }
    }
}

export const CONFIG_HARVESTER: SpawnConfig = {
    name: 'harvester1',
    body: [MOVE, WORK, CARRY],
}
export const CONFIG_BUILDER: SpawnConfig = {
    name: 'builder',
    body: [MOVE, WORK, CARRY],
}
export const CONFIG_UPGRADER: SpawnConfig = {
    name: 'upgrader',
    body: [MOVE, WORK, CARRY],
}

const MEMORY_STATE_HARVEST = "harvest";
const MEMORY_STATE_BUILD = "build";
const MEMORY_STATE_STORE = "store";

