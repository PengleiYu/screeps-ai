import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "./EnergyRole";
import {closestConstructionSite, closestSourceAndCanWithdrawNoSpawn} from "../utils/findUtils";

export class BuilderRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestConstructionSite(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}