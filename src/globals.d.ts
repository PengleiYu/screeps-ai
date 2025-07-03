import {CreepState} from "./role/role2";
import {CanGetEnergy} from "./types";

declare global {
    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;
        lifeState?: CreepState;
        logging?: boolean;
        lastSourceId?: Id<CanGetEnergy>;
        lastWorkId?: Id<Structure<StructureConstant>>;//工作目标都是建筑
    }
}
