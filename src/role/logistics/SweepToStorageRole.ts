import {CanGetSource, isCanPickup, isCanWithdraw} from "../../types";
import {closestRuinRemnantTomb} from "../utils/findUtils";
import {EnergyAction, PickupAction, WithdrawAllAction} from "../base/actionTypes";
import {BaseStorageTransferRole} from "./BaseStorageTransferRole";

/**
 * 专门捡残骸、残渣
 */
export class SweepToStorageRole extends BaseStorageTransferRole {
    protected findCanGetSource(): CanGetSource | null {
        return closestRuinRemnantTomb(this.creep.pos);
    }

    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        if (isCanPickup(canGet)) return new PickupAction(this.creep, canGet);
        if (isCanWithdraw(canGet)) return new WithdrawAllAction(this.creep, canGet);
        return EnergyAction.invalidInstance;
    }
}