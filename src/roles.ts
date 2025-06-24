import {getSpawn, SpawnConfig} from "./utils";

class BaseRole{
    protected creep:Creep;

    constructor(creep: Creep) {
        this.creep = creep;
    }
}

export class Harvester extends BaseRole{

    workHarvest(source:Source){
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(source);
            }
        } else {
            const spawn = getSpawn();
            if (this.creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(spawn, {
                    visualizePathStyle: {
                        lineStyle: 'dashed',
                    }
                });
            }
        }
    }
}

export class Builder extends BaseRole{
    workBuild(source:Source, site:ConstructionSite){
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
                creep.moveTo(site);
            }
        } else if (memory.state === MEMORY_STATE_HARVEST) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
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

const MEMORY_STATE_HARVEST = "harvest";
const MEMORY_STATE_BUILD = "build";
const MEMORY_STATE_STORE = "store";

