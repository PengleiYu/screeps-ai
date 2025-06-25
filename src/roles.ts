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

    abstract findSource(): Source;

    abstract findTarget(): Target;

    abstract work(): void;
}

export class Harvester extends BaseRole<Source, Structure> {
    findSource(): Source {
        return getSpawn().room.find(FIND_SOURCES)[0];
    }

    findTarget(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES,
                {filter: object => object.structureType === STRUCTURE_CONTAINER})
                .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort((a, b) => {
                    return this.creep.pos.getRangeTo(a) - this.creep.pos.getRangeTo(b);
                })[0]
            ?? getSpawn();
    }

    work(): void {
        const source = this.findSource();
        const target = this.findTarget();
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        } else {
            if (this.creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        }
    }
}

export class Builder extends BaseRole<Source | StructureContainer | undefined, ConstructionSite | undefined> {
    findSource(): Source | StructureContainer | undefined {
        let room = getSpawn().room;
        const containerArr = room.find(FIND_STRUCTURES, {
            filter: object =>
                object.structureType === STRUCTURE_CONTAINER,
        });
        // 没有容器则找原始资源
        if (!containerArr) return room.find(FIND_SOURCES)[0];
        return containerArr.filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0];
    }

    findTarget(): ConstructionSite | undefined {
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
            const target = this.findTarget();
            if (!target) {
                return;
            }
            if (creep.build(target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        } else if (memory.state === MEMORY_STATE_HARVEST) {
            const source = this.findSource();
            if (!source) {
                return;
            }
            const result = source instanceof Source
                ? creep.harvest(source) : creep.withdraw(source, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        }
    }
}

export class Upgrader extends BaseRole<StructureContainer | undefined, StructureController | undefined> {
    findSource(): StructureContainer | undefined {
        const target = this.findTarget();
        if (!target) return;
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) =>
                target.pos.getRangeTo(a) - target.pos.getRangeTo(b))
            [0];
    }

    findTarget(): StructureController | undefined {
        return getSpawn().room.controller;
    }

    work(): void {
        // console.log('workUpgrade', container, controller);

        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const target = this.findTarget();
            if (!target) return
            if (this.creep.upgradeController(target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        } else {
            const source = this.findSource();
            if (!source) return
            if (this.creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        }
    }
}

export class Repairer extends BaseRole<StructureContainer, Structure> {
    findSource(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0];
    }

    findTarget(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax
        }).sort((a, b) => a.hits - b.hits)[0];
    }

    work(): void {
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const target = this.findTarget();
            if (this.creep.repair(target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        } else {
            const source = this.findSource();
            if (this.creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
            }
        }
    }
}

export class Transfer extends BaseRole<StructureContainer, Structure> {
    override findSource(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) =>
                this.creep.pos.getRangeTo(a) - this.creep.pos.getRangeTo(b))
            [0];
    }

    override findTarget(): Structure {
        const spawn = getSpawn();
        if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) return spawn;
        return spawn.room.find(FIND_MY_STRUCTURES, {
            filter: object =>
                object.structureType === STRUCTURE_STORAGE || object.structureType === STRUCTURE_EXTENSION
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) =>
                this.creep.pos.getRangeTo(a) - this.creep.pos.getRangeTo(b))
            [0];
    }

    work(): void {
        // 先不加记忆
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const target = this.findTarget();
            if (this.creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(target);
            }
        } else {
            const source = this.findSource();
            if (this.creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(source);
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

