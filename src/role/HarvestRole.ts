import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestCanPutDown, closestEnergy} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class HarvestRole extends EnergyRole {
    protected findCanGetSource(): CanGetSource | null {
        return closestEnergy(this.creep.pos);
    }

    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanPutDown(this.creep.pos, RESOURCE_ENERGY);
    }
}