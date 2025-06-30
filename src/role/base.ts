type Constructor<T = {}> = new (...args: any[]) => T;

class CreepWrapper {
    constructor(protected creep: Creep) {
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

        protected isEnergyFull(): boolean {
            return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
        }

        protected isEnergyEmpty(): boolean {
            return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
        }

    }
}

export const CreepContext = mixCreepFun(CreepWrapper);
