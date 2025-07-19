import {CanGetSource, CanWithdraw} from "../types";
import {EnergyAction, WithdrawAllAction} from "./actionTypes";
import {closestEnergyMineralStructure} from "./findUtils";
import {BaseStorageTransferRole} from "./BaseStorageTransferRole";

export class ContainerToStorageRole extends BaseStorageTransferRole {
    // todo 应该由父类实现，提供所有类型的转换，因为不同类型没有使用歧义
    protected canGetSource2Action(canGet: CanWithdraw | null): EnergyAction<CanGetSource> {
        if (!canGet) return EnergyAction.invalidInstance;
        return new WithdrawAllAction(this.creep, canGet);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyMineralStructure(this.creep.pos);
    }
}