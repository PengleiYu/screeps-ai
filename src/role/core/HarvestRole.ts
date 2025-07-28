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
        let pos = this.creep.pos;
        // 先找附近link
        let link = pos.findInRange(FIND_MY_STRUCTURES, 3, {
            filter: it => it.structureType === STRUCTURE_LINK && it.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        if (link != null) return link;
        // 再找附近container
        let container = pos.findInRange(FIND_STRUCTURES, 3, {
            filter: it => it.structureType == STRUCTURE_CONTAINER && it.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        if (container != null) return container;
        // 兜底，最近所有可放资源的地方
        return closestCanPutDown(pos, RESOURCE_ENERGY);
    }

    protected interceptLifeCycle(): boolean {
        return this.findSource() === EnergyAction.invalidInstance;
    }
}