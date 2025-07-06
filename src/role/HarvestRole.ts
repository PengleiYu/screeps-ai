import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestCanPutDown, closestEnergy} from "./findUtils";
import {EnergyRole} from "./EnergyRole";
import {EnergyAction} from "./actions";

export class HarvestRole extends EnergyRole {
    protected findCanGetSource(): CanGetSource | null {
        return closestEnergy(this.creep.pos);
    }

    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanPutDown(this.creep.pos, RESOURCE_ENERGY);
    }

    protected interceptLifeCycle(): boolean {
        return this.findSource() === EnergyAction.invalidInstance;
    }
}