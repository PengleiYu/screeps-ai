import {CreepState} from "./role/base/baseRoles";
import {CanGetSource, CanPutSource, CanWork} from "./types";
import {LinkManager} from "./link/LinkManager";

declare global {
    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;

        // 状态机
        lifeState?: CreepState;

        // 工作需要的记忆
        lastSourceId?: Id<CanGetSource>;
        lastWorkId?: Id<CanWork | CanPutSource>;//工作目标都是建筑
        targetPosition?: string;
        sourceType?: MineralConstant;//目前不设置表示使用能量，后续看是否要改

        // 用于标识首次运行
        isJustBorn?: boolean;
        birthTick?: number;

        // debug
        logging?: boolean;
    }

    const global: typeof globalThis & {
        LinkManager: typeof import("./link/LinkManager").LinkManager;
    };
}
