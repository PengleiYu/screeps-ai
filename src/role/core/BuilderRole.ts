import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "./EnergyRole";
import {closestHighPriorityConstructionSite, closestSourceAndCanWithdrawNoSpawn} from "../utils/findUtils";

export class BuilderRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestHighPriorityConstructionSite(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}