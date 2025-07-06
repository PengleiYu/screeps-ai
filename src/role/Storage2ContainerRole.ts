import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyRole} from "./EnergyRole";
import {closestEnergyNotEmptyStorage, closestEnergyNotFullContainerNearController} from "./findUtils";

export class Storage2ContainerRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestEnergyNotFullContainerNearController(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyNotEmptyStorage(this.creep.pos);
    }
}