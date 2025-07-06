import {CanGetSource, isCanPickup, isCanWithdraw} from "../types";
import {closestRuinRemnant} from "./findUtils";
import {EnergyAction, PickupAction, WithdrawAllAction} from "./actions";
import {BaseStorageTransferRole} from "./BaseStorageTransferRole";

/**
 * 专门捡残骸、残渣
 */
export class Sweep2StorageRole extends BaseStorageTransferRole {
    protected findCanGetSource(): CanGetSource | null {
        return closestRuinRemnant(this.creep.pos);
    }

    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        if (isCanPickup(canGet)) return new PickupAction(this.creep, canGet);
        if (isCanWithdraw(canGet)) return new WithdrawAllAction(this.creep, canGet);
        return EnergyAction.invalidInstance;
    }
}