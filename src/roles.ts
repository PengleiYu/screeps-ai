import {getSpawn, SpawnConfig} from "./utils";

export abstract class BaseRole<Source, Target> {
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

    haveRest() {
        this.putBackEnergy()
        this.park();
    }

    private putBackEnergy() {
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return;

        const storage = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER || object.structureType === STRUCTURE_STORAGE
        });

        if (!storage) return;
        if (this.creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.visualizeMoveTo(storage);
        }
    }

    private park() {
        const spawn = getSpawn();
        if (!spawn) return;
        if (!this.creep.pos.inRangeTo(spawn, 2)) {
            this.visualizeMoveTo(spawn);
        }
    }

    abstract get source(): Source;

    abstract get target(): Target;

    abstract work(): void;
}

export class Harvester extends BaseRole<Source, Structure> {
    get source(): Source {
        return getSpawn().room.find(FIND_SOURCES)[0];
    }

    get target(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES,
                {filter: object => object.structureType === STRUCTURE_CONTAINER})
                .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort((a, b) => {
                    return this.creep.pos.getRangeTo(a) - this.creep.pos.getRangeTo(b);
                })[0]
            ?? getSpawn();
    }

    work(): void {
        const source1 = this.source;
        const structure = this.target;
        // console.log('workerHarvest', source, structure);
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.harvest(source1) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source1);
            }
        } else {
            if (this.creep.transfer(structure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(structure);
            }
        }
    }
}

export class Builder extends BaseRole<Source | StructureContainer | undefined, ConstructionSite | undefined> {
    get source(): Source | StructureContainer | undefined {
        let room = getSpawn().room;
        const containerArr = room.find(FIND_STRUCTURES, {
            filter: object =>
                object.structureType === STRUCTURE_CONTAINER,
        });
        // 没有容器则找原始资源
        if (!containerArr) return room.find(FIND_SOURCES)[0];
        return containerArr.filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0];
    }

    get target(): ConstructionSite | undefined {
        // 寻找工地
        return getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)[0];
    }

    work(): void {
        // console.log('doBuild', creep, source, site);
        const creep = this.creep;
        const memory = creep.memory;
        if (!memory.state) {
            memory.state = MEMORY_STATE_HARVEST;
        }

        if (memory.state === MEMORY_STATE_BUILD && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            memory.state = MEMORY_STATE_HARVEST;
            console.log(`${creep.name}进入采集模式`);
        } else if (memory.state === MEMORY_STATE_HARVEST && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            memory.state = MEMORY_STATE_BUILD;
            console.log(`${creep.name}进入建造模式`);
        }

        if (memory.state === MEMORY_STATE_BUILD) {
            if (!this.target) {
                return;
            }
            if (creep.build(this.target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        } else if (memory.state === MEMORY_STATE_HARVEST) {
            if (!this.source) {
                return;
            }
            const result = this.source instanceof Source
                ? creep.harvest(this.source) : creep.withdraw(this.source, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.source);
            }
        }
    }
}

export class Upgrader extends BaseRole<StructureContainer | undefined, StructureController | undefined> {
    get source(): StructureContainer | undefined {
        const target = this.target;
        if (!target) return;
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) =>
                target.pos.getRangeTo(a) - target.pos.getRangeTo(b))
            [0];
    }

    get target(): StructureController | undefined {
        return getSpawn().room.controller;
    }

    work(): void {
        // console.log('workUpgrade', container, controller);

        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const target = this.target;
            if (!target) return
            if (this.creep.upgradeController(target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        } else {
            const source = this.source;
            if (!source) return
            if (this.creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        }
    }
}

export class Repairer extends BaseRole<StructureContainer, Structure> {
    get source(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0];
    }

    get target(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax
        }).sort((a, b) => a.hits - b.hits)[0];
    }

    work(): void {
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.repair(this.target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        } else {
            if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.source);
            }
        }
    }
}

export class Transfer extends BaseRole<StructureContainer, Structure> {
    get source(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) =>
                this.creep.pos.getRangeTo(a) - this.creep.pos.getRangeTo(b))
            [0];
    }

    get target(): Structure {
        const spawn = getSpawn();
        if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) return spawn;
        return spawn.room.find(FIND_MY_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_STORAGE
        }).filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            [0];
    }

    work(): void {
        // 先不加记忆
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        } else {
            if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.source);
            }
        }
    }

}

export const CONFIG_HARVESTER: SpawnConfig = {
    name: 'harvester',
    body: [MOVE, WORK, CARRY],
}
export const CONFIG_BUILDER: SpawnConfig = {
    name: 'builder',
    body: [MOVE, WORK, CARRY],
}
export const CONFIG_UPGRADER: SpawnConfig = {
    name: 'upgrader',
    body: [MOVE, WORK, CARRY, CARRY, CARRY],
}
export const CONFIG_REPAIRER: SpawnConfig = {
    name: 'repairer',
    body: [MOVE, WORK, CARRY],
}
export const CONFIG_TRANSFER: SpawnConfig = {
    name: 'transfer',
    body: [MOVE, WORK, CARRY,],
}

const MEMORY_STATE_HARVEST = "harvest";
const MEMORY_STATE_BUILD = "build";
const MEMORY_STATE_STORE = "store";

