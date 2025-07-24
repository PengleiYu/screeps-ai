import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "./EnergyRole";
import {closestHighPriorityConstructionSite} from "../utils/findUtils";
import {closestEnergyProviderForWork} from "../utils/closestEnergyProviderForWork";
import profiler from "screeps-profiler";

export class BuilderRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestHighPriorityConstructionSite(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyProviderForWork(this.creep.pos, this.freeEnergyCapacity() / 2);
    }
}

// 注册性能监测
if (typeof profiler !== 'undefined') {
    profiler.registerClass(BuilderRole, 'BuilderRole');
}