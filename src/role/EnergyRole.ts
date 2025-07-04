import {MemoryRole} from "./role2";
import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfWork2} from "./actionUtils";

export abstract class EnergyRole extends MemoryRole {
    protected getSourceType(): RESOURCE_ENERGY {
        return RESOURCE_ENERGY;
    }

    protected canWork2Action(canWork: CanWork | CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        return actionOfWork2(this.creep, canWork);
    }

    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, canGet);
    }
}