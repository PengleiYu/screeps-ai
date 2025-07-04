import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown, closestEnergy} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class HarvestRole extends EnergyRole {
    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestEnergy(this.creep.pos));
    }

    protected findCanGetSource2(): CanGetSource | null {
        return closestEnergy(this.creep.pos);
    }

    findCanWork(): EnergyAction<CanWork | CanPutSource> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos, this.getSourceType()));
    }

    protected findCanWork2(): CanWork | CanPutSource | null {
        return closestCanPutDown(this.creep.pos, this.getSourceType());
    }
}