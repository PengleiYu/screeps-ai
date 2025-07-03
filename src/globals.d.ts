import {CreepState} from "./role/role2";
import {CanGetEnergy, CanPutEnergy, CanWork} from "./types";

declare global {
    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;
        lifeState?: CreepState;
        logging?: boolean;
        lastSourceId?: Id<CanGetEnergy>;
        lastWorkId?: Id<CanWork | CanPutEnergy>;//工作目标都是建筑
        targetPosition?: string;
        isJustBorn?: boolean;
        birthTick?: number;
    }
}
