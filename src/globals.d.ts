import {CreepState} from "./role/base/baseRoles";
import {CanGetSource, CanPutSource, CanWork} from "./types";
import {LinkManager} from "./link/LinkManager";
import {ExpeditionController} from "./expedition/ExpeditionController";
import {ExpeditionPathManager, ExpeditionPath} from "./expedition/core/ExpeditionPathManager";
import {ExpeditionState, MissionPhase, ExpeditionMissionData} from "./expedition/core/ExpeditionStates";

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

        // 远征系统
        expeditionState?: ExpeditionState;
        targetRoomName?: string;
        missionPhase?: MissionPhase;
        expeditionStartTick?: number;

        // 震荡检测
        lastRoomName?: string;
        roomSwitchCount?: number;
        lastSwitchTick?: number;
    }

    interface Memory {
        expeditions?: { [targetRoom: string]: ExpeditionMissionData };
        expeditionPathCache?: { [cacheKey: string]: ExpeditionPath };
    }

    const global: typeof globalThis & {
        LinkManager: typeof import("./link/LinkManager").LinkManager;
        ExpeditionController: typeof import("./expedition/ExpeditionController").ExpeditionController;
        ExpeditionPathManager: typeof import("./expedition/core/ExpeditionPathManager").ExpeditionPathManager;
        BodyConfigManager: typeof import("./body/BodyConfigManager").BodyConfigManager;
    };
}
