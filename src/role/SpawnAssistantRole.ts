import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class SpawnAssistantRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanSpawn(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}