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
        this.creep.memory.working = false;
        this.putBackEnergy()
        this.park();
    }

    work(): void {
        this.creep.memory.working = true;
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
        if (!this.creep.pos.inRangeTo(spawn, 2)) {
            console.log(this.creep.name, 'park')
            this.visualizeMoveTo(spawn);
        }
    }
}

export class Harvester extends BaseRole<Source, Structure> {

    work(): void {
        super.work();
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
        super.work();
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
        super.work();
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
        super.work();
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
        super.work();
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