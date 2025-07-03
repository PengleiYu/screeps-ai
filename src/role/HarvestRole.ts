import {WorkMemoryRole} from "./role2";
import {CanGetEnergy, CanPutEnergy, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown, closestSource} from "./findUtils";

export class HarvestRole extends WorkMemoryRole {
    constructor(creep: Creep, source?: Source) {
        super(creep);
        if (source) this.setMemorySource(source);
    }

    findCanGetEnergy(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSource(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanWork | CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos));
    }
}