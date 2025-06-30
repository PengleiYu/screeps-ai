import {Positionable} from "../utils";
import {ActionReturnCode, CanBuild, CanHarvest, CanPickup, CanPutDown, CanUpgrade, CanWithdraw} from "../types";
import {CreepContext} from "./base";

export abstract class EnergyAction<T extends Positionable> extends CreepContext {
    public constructor(creep: Creep, public target: T) {
        super(creep);
    }

    printSelf() {
        console.log('creep', this.creep, 'target', this.target);
    }

    protected abstract actionImpl(): ActionReturnCode;

    action() {
        if (this.actionImpl() === ERR_NOT_IN_RANGE) {
            this.visualizeMoveTo(this.target);
        }
    }

    // 默认可用
    isValid(): boolean {
        return true;
    }

    static invalidInstance = new class extends EnergyAction<any> {
        constructor() {
            // 忽略检查
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

export class WithdrawAction extends EnergyAction<CanWithdraw> {
    actionImpl(): ActionReturnCode {
        return this.creep.withdraw(this.target, RESOURCE_ENERGY);
    }
}

export class PickupAction extends EnergyAction<CanPickup> {
    actionImpl(): ActionReturnCode {
        return this.creep.pickup(this.target);
    }
}

export class TransferAction extends EnergyAction<CanPutDown> {
    actionImpl(): ActionReturnCode {
        return this.creep.transfer(this.target, RESOURCE_ENERGY);
    }
}

export class BuildAction extends EnergyAction<CanBuild> {
    actionImpl(): ActionReturnCode {
        return this.creep.build(this.target);
    }
}

export class UpgradeAction extends EnergyAction<CanUpgrade> {
    actionImpl(): ActionReturnCode {
        return this.creep.upgradeController(this.target);
    }
}

export class ParkingAction extends EnergyAction<Positionable> {
    actionImpl(): ActionReturnCode {
        return this.creep.moveTo(this.target);
    }

    isValid(): boolean {
        return !this.creep.pos.isNearTo(this.target);
    }
}