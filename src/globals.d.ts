import {CreepState} from "./role/role2";
import {CanGetSource, CanPutSource, CanWork} from "./types";

declare global {
    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;
        lifeState?: CreepState;
        logging?: boolean;
        lastSourceId?: Id<CanGetSource>;
        lastWorkId?: Id<CanWork | CanPutSource>;//工作目标都是建筑
        targetPosition?: string;
        isJustBorn?: boolean;
        birthTick?: number;
    }
}
