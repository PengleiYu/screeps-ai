import {MemoryRole} from "./role2";
import {CanGetEnergy, CanPutEnergy, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown, closestSource} from "./findUtils";

export class HarvestRole extends MemoryRole {

    findCanGetEnergy(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSource(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanWork | CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos));
    }
}