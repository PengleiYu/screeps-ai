import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class SpawnAssistantRole extends EnergyRole {
    protected findCanWork2(): CanWork | CanPutSource | null {
        return closestCanSpawn(this.creep.pos);
    }

    protected findCanGetSource2(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }

    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanPutSource> {
        return actionOfPutEnergy(this.creep, closestCanSpawn(this.creep.pos));
    }
}