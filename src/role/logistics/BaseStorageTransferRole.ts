import {MemoryRole} from "../base/baseRoles";
import {CanPutSource, CanWork} from "../../types";
import {EnergyAction, TransferAllAction} from "../base/actionTypes";
import {closestNotFullStorage} from "../utils/findUtils";

/**
 * 只往storage里搬，任何种类都支持
 */
export abstract class BaseStorageTransferRole extends MemoryRole {

    protected canWork2Action(canWork: CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        if (!canWork) return EnergyAction.invalidInstance;
        return new TransferAllAction(this.creep, canWork);
    }

    protected findCanWork(): CanPutSource | null {
        return closestNotFullStorage(this.creep.pos);
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

    protected interceptLifeCycle(): boolean {
        return EnergyAction.invalidInstance === this.findSource();
    }
}