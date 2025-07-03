type Constructor<T = {}> = new (...args: any[]) => T;

class CreepWrapper {
    constructor(protected creep: Creep) {
        if (!this.creep) return;
        const memory = this.creep.memory;
        if (memory.isJustBorn) {
            memory.isJustBorn = false;
            memory.birthTick = Game.time;
        }
    }

    public isJustBorn(): boolean {
        const memory = this.creep.memory;
        return memory.isJustBorn || memory.birthTick === Game.time;
    }
}

/**
 * 简化creep操作
 */
function mixCreepFun<TBase extends Constructor<CreepWrapper>>(Base: TBase) {
    return class extends Base {
        protected visualizeMoveTo(target: RoomPosition | { pos: RoomPosition },) {
            this.creep.moveTo(target, {
                visualizePathStyle: {
                    lineStyle: 'dashed',
                }
            });
        }

        protected get logEnable(): boolean {
            return this.creep.memory.logging ?? false;
        }

        protected log(...data: any[]) {
            if (this.logEnable) console.log(this.creep.name, ...data);
        }

        protected isEnergyFull(): boolean {
            return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
        }

        protected isEnergyEmpty(): boolean {
            return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
        }

    }
}

export const CreepContext = mixCreepFun(CreepWrapper);
