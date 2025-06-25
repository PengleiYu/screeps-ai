import {getSpawn} from "./utils";

export abstract class BaseRole<Source, Target> {

    constructor(protected creep: Creep, protected source: Source, protected target: Target) {
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

    abstract work(): void;
}

export class Harvester extends BaseRole<Source, Structure> {

    work(): void {
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.creep.harvest(this.source) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.source);
            }
        } else {
            if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        }
    }
}

export class Builder extends BaseRole<Source | StructureContainer | undefined, ConstructionSite | undefined> {

    work(): void {
        // console.log('doBuild', creep, source, site);
        const creep = this.creep;
        const memory = creep.memory;
        if (!memory.workState) {
            memory.workState = MEMORY_STATE_HARVEST;
        }

        if (memory.workState === MEMORY_STATE_BUILD && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_HARVEST;
        } else if (memory.workState === MEMORY_STATE_HARVEST && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_BUILD;
        }

        if (memory.workState === MEMORY_STATE_BUILD) {
            if (!this.target) {
                return;
            }
            if (creep.build(this.target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        } else if (memory.workState === MEMORY_STATE_HARVEST) {
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
    work(): void {
        // console.log('workUpgrade', container, controller);

        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (!this.target) return
            if (this.creep.upgradeController(this.target) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.target);
            }
        } else {
            if (!this.source) return
            if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.visualizeMoveTo(this.source);
            }
        }
    }
}

export class Repairer extends BaseRole<StructureContainer, Structure> {
    work(): void {
        // console.log(`${this.creep.name} work`);
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

const MEMORY_STATE_HARVEST = "harvest";
const MEMORY_STATE_BUILD = "build";