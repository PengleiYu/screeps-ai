import {ActionReturnCode} from "../types";

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

    public get isJustBorn(): boolean {
        const memory = this.creep.memory;
        return memory.isJustBorn || memory.birthTick === Game.time;
    }
}

/**
 * 简化creep操作
 */
function mixCreepFun<TBase extends Constructor<CreepWrapper>>(Base: TBase) {
    return class extends Base {
        protected visualizeMoveTo(target: RoomPosition | { pos: RoomPosition },): ActionReturnCode {
            return this.creep.moveTo(target, {
                visualizePathStyle: {
                    lineStyle: 'dashed',
                }
            });
        }

        protected get logEnable(): boolean {
            return this.creep.memory.logging ?? false;
        }

        protected log(...data: any[]) {
            this.colorLog(undefined, ...data);
        }

        protected err(...data: any[]) {
            this.colorLog('red', ...data);
        }

        protected warn(...data: any[]) {
            this.colorLog('orange', ...data);
        }

        protected colorLog(color?: string, ...data: any[]) {
            if (this.logEnable) {
                if (color) {
                    const msg = [this.creep.name, ...data].join(' ');
                    console.log(`<span style="color: ${color}; ">${msg}</span>`);
                } else {
                    console.log(this.creep.name, ...data);
                }
            }
        }

        protected isEnergyFull(resourceType: ResourceConstant): boolean {
            return this.creep.store.getFreeCapacity(resourceType) === 0;
        }

        protected isEnergyEmpty(resourceType: ResourceConstant): boolean {
            return this.creep.store.getUsedCapacity(resourceType) === 0;
        }

    }
}

export const CreepContext = mixCreepFun(CreepWrapper);
