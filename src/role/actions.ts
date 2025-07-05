import {Positionable} from "../utils";
import {ActionReturnCode, CanHarvest, CanPickup, CanPutSource, CanWithdraw} from "../types";
import {CreepContext} from "./base";
import {getStoreResourceTypes} from "../typeUtils";

export abstract class EnergyAction<T extends Positionable> extends CreepContext {
    public constructor(creep: Creep, public target: T) {
        super(creep);
    }

    printSelf() {
        console.log('creep', this.creep, 'target', this.target);
    }

    protected abstract actionImpl(): ActionReturnCode;

    action() {
        const actionResult = this.actionImpl();
        if (actionResult === OK) return;
        if (actionResult !== ERR_NOT_IN_RANGE) {
            this.warn('actionReturn code', actionResult);
            return;
        }

        const moveResult = this.visualizeMoveTo(this.target);
        if (moveResult !== OK) {
            this.warn('move fail', moveResult);
        }
    }

    // 默认可用
    isValid(): boolean {
        return true;
    }

    static invalidInstance = new class extends EnergyAction<any> {
        constructor() {
            // 忽略检查
            // todo 不能传null
            super(null as any, null);
        }

        actionImpl(): ActionReturnCode {
            return ERR_NOT_FOUND;
        }

        isValid(): boolean {
            return false;
        }
    }
}

export class HarvestAction extends EnergyAction<CanHarvest> {
    actionImpl(): ActionReturnCode {
        return this.creep.harvest(this.target);
    }
}

export class WithdrawEnergyAction extends EnergyAction<CanWithdraw> {
    actionImpl(): ActionReturnCode {
        return this.creep.withdraw(this.target, RESOURCE_ENERGY);
    }

    isValid(): boolean {
        return this.target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }
}

export class WithdrawAllAction extends EnergyAction<CanWithdraw> {
    protected actionImpl(): ActionReturnCode {
        const type = getStoreResourceTypes(this.target.store)[0];
        return this.creep.withdraw(this.target, type);
    }

    isValid(): boolean {
        return this.creep.store.getFreeCapacity() > 0
            && (this.target.store.getUsedCapacity() ?? 0) > 0;
    }
}

export class PickupAction extends EnergyAction<CanPickup> {
    actionImpl(): ActionReturnCode {
        return this.creep.pickup(this.target);
    }
}


export class TransferAllAction extends EnergyAction<CanPutSource> {
    protected actionImpl(): ActionReturnCode {
        for (const type of getStoreResourceTypes(this.creep.store)) {
            if ((this.target.store.getFreeCapacity(type) ?? 0) > 0) {
                return this.creep.transfer(this.target, type);
            }
        }
        return ERR_NOT_ENOUGH_RESOURCES;
    }

    isValid(): boolean {
        for (const key of getStoreResourceTypes(this.creep.store)) {
            if ((this.target.store.getFreeCapacity(key) ?? 0) > 0) {
                return true;
            }
        }
        return super.isValid();
    }
}

abstract class TransferAction extends EnergyAction<CanPutSource> {
    protected abstract get resourceType(): ResourceConstant

    actionImpl(): ActionReturnCode {
        this.log('actionImpl', this.target, this.resourceType);
        return this.creep.transfer(this.target, this.resourceType);
    }

    isValid(): boolean {
        return (this.target.store.getFreeCapacity(this.resourceType) ?? 0) > 0;
    }
}

export class TransferEnergyAction extends TransferAction {
    protected get resourceType(): ResourceConstant {
        return RESOURCE_ENERGY;
    }
}

export class TransferMineralAction<T extends MineralConstant> extends TransferAction {
    constructor(creep: Creep, target: CanPutSource, private mineralType: T) {
        super(creep, target);
    }

    protected get resourceType(): ResourceConstant {
        return this.mineralType;
    }
}

export class BuildAction extends EnergyAction<ConstructionSite> {
    actionImpl(): ActionReturnCode {
        return this.creep.build(this.target);
    }
}

export class UpgradeAction extends EnergyAction<StructureController> {
    actionImpl(): ActionReturnCode {
        return this.creep.upgradeController(this.target);
    }
}

export class MoveAction extends EnergyAction<Positionable> {
    actionImpl(): ActionReturnCode {
        return this.visualizeMoveTo(this.target);
    }

    isValid(): boolean {
        return !this.creep.pos.isNearTo(this.target);
    }
}