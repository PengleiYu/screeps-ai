import {MemoryRole} from "./role2";
import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetSource, actionOfPutEnergy, actionOfWork2} from "./actionUtils";
import {closestCanPutDown} from "./findUtils";

export abstract class EnergyRole extends MemoryRole {

    protected findEnergyPutDown(): EnergyAction<CanPutSource> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos, RESOURCE_ENERGY));
    }

    protected isStoreFull(): boolean {
        return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
    }

    protected isStoreEmpty(): boolean {
        return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
    }

    protected canWork2Action(canWork: CanWork | CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        return actionOfWork2(this.creep, canWork);
    }

    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        return actionOfGetSource(this.creep, canGet);
    }
}