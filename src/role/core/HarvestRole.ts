import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {closestCanPutDown, closestEnergy} from "../utils/findUtils";
import {EnergyRole} from "./EnergyRole";
import {EnergyAction} from "../base/actionTypes";

export class HarvestRole extends EnergyRole {
    protected onBeginWorkFlow() {
        this.log("harvestRole", "清除work记忆")
        this.setMemoryWork(null);
    }

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