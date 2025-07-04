import {MemoryRole} from "./role2";
import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown, closestEnergy} from "./findUtils";

export class HarvestRole extends MemoryRole {

    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestEnergy(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanWork | CanPutSource> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos, this.getSourceType()));
    }
}