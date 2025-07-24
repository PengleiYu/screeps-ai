import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "./EnergyRole";
import {closestHighPriorityConstructionSite} from "../utils/findUtils";
import {closestEnergyProviderForWork} from "../utils/closestEnergyProviderForWork";

export class BuilderRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestHighPriorityConstructionSite(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyProviderForWork(this.creep.pos, this.freeEnergyCapacity() / 2);
    }
}