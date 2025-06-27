import {getEnergyContainerOfSpawn, getEnergyStorageOfSpawn, getSpawn} from "./utils";

export abstract class BaseRole<Source, Target> {

    constructor(protected creep: Creep, protected source: Source | undefined, protected target: Target | undefined) {
    }

    visualizeMoveTo(target: RoomPosition | { pos: RoomPosition },) {
        this.creep.moveTo(target, {
            visualizePathStyle: {
                lineStyle: 'dashed',
            }
        });
    }

    protected get canKeepEnergy(): boolean {
        return true;
    }

    // 需要一个状态机：working-clean-park
    haveRest() {
        const memory = this.creep.memory;
        if (memory.working) {
            console.log(`${memory.role}:${this.creep.name} 开始休息`);
        }
        memory.working = false;
        const done = this.canKeepEnergy || this.putBackEnergyDone();
        if (done) this.park();
    }

    work(): void {
        this.creep.memory.working = true;
    }

    private putBackEnergyDone(): boolean {
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return true;

        const storage =
            getEnergyStorageOfSpawn(false, this.creep)
            ?? getEnergyContainerOfSpawn(false, this.creep);
        if (!storage) return true;

        if (this.creep.transfer(storage, RESOURCE_ENERGY) !== ERR_NOT_IN_RANGE) return true;

        this.visualizeMoveTo(storage);
        return false;
    }

    private park() {
        const parkingLot = this.findParkingLot();
        if (!this.creep.pos.isNearTo(parkingLot)) {
            console.log(this.creep.name, 'park')
            this.visualizeMoveTo(parkingLot);
        }
    }

    private findParkingLot() {
        return this.creep.pos.findClosestByRange(FIND_FLAGS, {
            filter: it => it.name === 'Parking'
        }) ?? getSpawn();
    }
}

export class Harvester extends BaseRole<Source, Structure> {

    work(): void {
        super.work();
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (this.source) {
                if (this.creep.harvest(this.source) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.source);
                }
            }
        } else {
            if (this.target) {
                if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        }
    }
}

export class Builder extends BaseRole<Ruin | StructureStorage | StructureContainer | Source, ConstructionSite> {

    protected get canKeepEnergy(): boolean {
        return false;
    }

    work(): void {
        super.work();
        const creep = this.creep;
        const memory = creep.memory;
        if (!memory.workState) {
            memory.workState = MEMORY_STATE_COLLECTING;
        }

        if (memory.workState === MEMORY_STATE_WORKING && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_COLLECTING;
        } else if (memory.workState === MEMORY_STATE_COLLECTING && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_WORKING;
        }

        if (memory.workState === MEMORY_STATE_WORKING) {
            if (this.target) {
                if (creep.build(this.target) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        } else if (memory.workState === MEMORY_STATE_COLLECTING) {
            if (this.source) {
                const result = this.source instanceof Source
                    ? creep.harvest(this.source) : creep.withdraw(this.source, RESOURCE_ENERGY);
                if (result === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.source);
                }
            }
        }
    }
}

export class Upgrader extends BaseRole<Ruin | StructureStorage | StructureContainer, StructureController> {
    work(): void {
        super.work();
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.target) {
                if (this.creep.upgradeController(this.target) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        } else {
            if (this.source) {
                if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.source);
                }
            }
        }
    }
}

export class Repairer extends BaseRole<Ruin | StructureStorage | StructureContainer, Structure> {
    work(): void {
        super.work();
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.target) {
                if (this.creep.repair(this.target) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        } else {
            if (this.source) {
                if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.source);
                }
            }
        }
    }
}

export class Transfer extends BaseRole<Structure | Ruin, Structure> {
    work(): void {
        super.work();
        // 先不加记忆
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.target) {
                if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        } else {
            if (this.source) {
                if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.source);
                }
            }
        }
    }
}

export class OverseaTransporter extends BaseRole<RoomPosition, Structure> {
    work() {
        super.work();

        const memory = this.creep.memory;
        if (!memory.workState) {
            memory.workState = MEMORY_STATE_COLLECTING;
        }

        if (memory.workState === MEMORY_STATE_WORKING && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_COLLECTING;
        } else if (memory.workState === MEMORY_STATE_COLLECTING && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            memory.workState = MEMORY_STATE_WORKING;
        }

        if (memory.workState === MEMORY_STATE_COLLECTING) {
            if (this.source) {
                if (!this.creep.pos.isNearTo(this.source)) {
                    this.visualizeMoveTo(this.source);
                } else {
                    const ruin = this.source.findClosestByPath(FIND_RUINS, {
                        filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                    });
                    if (ruin) {
                        if (this.creep.withdraw(ruin, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            this.visualizeMoveTo(ruin);
                        }
                    }
                }
            }
        } else if (memory.workState === MEMORY_STATE_WORKING) {
            if (this.target) {
                const code = this.creep.transfer(this.target, RESOURCE_ENERGY);
                if (code === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(this.target);
                }
            }
        }
    }
}

// todo 改为枚举
const MEMORY_STATE_COLLECTING = "harvest";
const MEMORY_STATE_WORKING = "build";