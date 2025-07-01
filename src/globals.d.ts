import {CreepState} from "./role/role2";

declare global {
    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;
        lifeState?: CreepState;
        logging?: boolean;
        lastSourceId?: Id<Source>;
        lastWorkId?: Id<Structure<StructureConstant>>;//工作目标都是建筑
    }
}
