import {
    getClosestDroppedEnergy, getClosestEnergyStorable,
    getClosestEnergyWithdrawn, getClosestEnergyWithdrawn2, getClosetTombstone,
    getEnergyContainerOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn,
    ResourceWithdrawn,
    SpawnStruct
} from "./utils";

export abstract class BaseRole<Source, Target> {

    constructor(protected creep: Creep, protected source: Source | null, protected target: Target | null) {
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

    protected work2() {
        this.creep.memory.working = true;
        this.changeWorkState();
        const workState = this.creep.memory.workState;
        switch (workState) {
            case MEMORY_STATE_COLLECTING:
                this.doCollecting();
                break;
            case MEMORY_STATE_WORKING:
                this.doWorking();
                break;
            default:
                console.log('未知workState', workState);
                break;
        }
    }

    protected changeWorkState() {
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
    }

    protected doCollecting() {
    }

    protected doWorking() {
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

export class SpawnAssistant extends BaseRole<Source | ResourceWithdrawn, SpawnStruct> {
    work() {
        super.work();
        // todo 整体改掉
        this.work2();
    }

    protected doCollecting() {
        if (!this.source) return;
        if (this.source instanceof Source) {
            if (this.creep.harvest(this.source) === ERR_NOT_IN_RANGE) this.visualizeMoveTo(this.source);
        } else {
            if (this.creep.withdraw(this.source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.visualizeMoveTo(this.source);
        }
    }

    protected doWorking() {
        if (!this.target) return;
        if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.visualizeMoveTo(this.target);
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
            // todo 临时改动
            const source = getClosestEnergyWithdrawn2(this.creep.pos) ?? this.source;
            if (source) {
                if (this.creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.visualizeMoveTo(source);
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
                // 没到房间，仅移动
                if (this.creep.room.name !== this.source.roomName) {
                    this.visualizeMoveTo(this.source);
                } else {
                    // 已到房间，找最近的存储
                    const ruin = getClosestEnergyWithdrawn(this.creep.pos);
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

export class Sweeper extends BaseRole<RoomPosition, Structure> {
    protected get canKeepEnergy(): boolean {
        return false;
    }

    work() {
        super.work();

        const memory = this.creep.memory;
        if (!memory.workState) {
            memory.workState = MEMORY_STATE_COLLECTING;
        }

        // if (memory.workState === MEMORY_STATE_WORKING && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        //     memory.workState = MEMORY_STATE_COLLECTING;
        // } else if (memory.workState === MEMORY_STATE_COLLECTING && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        //     memory.workState = MEMORY_STATE_WORKING;
        // }

        if (memory.workState === MEMORY_STATE_COLLECTING) {
            if (this.source) {
                // 没到房间，仅移动
                if (this.creep.room.name !== this.source.roomName) {
                    this.visualizeMoveTo(this.source);
                } else {
                    // 已到房间，找最近的存储
                    const energy = getClosestDroppedEnergy(this.creep);
                    if (energy) {
                        if (this.creep.pickup(energy) === ERR_NOT_IN_RANGE) {
                            this.visualizeMoveTo(energy);
                        }
                    } else {
                        const tombstone = getClosetTombstone(this.creep.pos);
                        if (tombstone) {
                            if (this.creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                                this.visualizeMoveTo(tombstone);
                            }
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