import {CanGetSource, CanPutSource, CanWithdraw, CanWork} from "../types";
import {EnergyAction, TransferAllAction, WithdrawAllAction} from "./actions";
import {MemoryRole} from "./role2";
import {closestEnergyMineralContainer, closestStorage} from "./findUtils";

/**
 * 只往storage里搬，任何种类都支持
 */
export class StorageTransferRole extends MemoryRole {
    protected canWork2Action(canWork: CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        if (!canWork) return EnergyAction.invalidInstance;
        return new TransferAllAction(this.creep, canWork);
    }

    protected canGetSource2Action(canGet: CanWithdraw | null): EnergyAction<CanGetSource> {
        if (!canGet) return EnergyAction.invalidInstance;
        return new WithdrawAllAction(this.creep, canGet);
    }

    protected findCanWork(): CanPutSource | null {
        return closestStorage(this.creep.pos);
    }

    protected findCanGetSource(): CanWithdraw | null {
        return closestEnergyMineralContainer(this.creep.pos);
    }

    /**
     * 只支持搬运到storage，没有清理放回阶段
     */
    protected findEnergyPutDown(): EnergyAction<CanPutSource> {
        return EnergyAction.invalidInstance;
    }

    protected isStoreFull(): boolean {
        return this.creep.store.getFreeCapacity() === 0;
    }

    protected isStoreEmpty(): boolean {
        return this.creep.store.getUsedCapacity() === 0;
    }
}