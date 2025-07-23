// 远征任务状态定义

export enum ExpeditionState {
    TRAVELING = "traveling",    // 前往目标房间
    WORKING = "working"         // 在目标房间工作直到死亡
}

export enum MissionPhase {
    SCOUTING = "scouting",
    INVADING = "invading",       // 阶段0：入侵房间
    CLAIMING = "claiming",      // 阶段1：占领房间
    UPGRADING = "upgrading",    // 阶段2：升级到RCL2
    BUILDING = "building",      // 阶段3：建造Spawn
    COMPLETED = "completed"     // 任务完成，退出远征系统
}

export interface ExpeditionMemory extends CreepMemory {
    expeditionState: ExpeditionState;
    targetRoomName: string;
    missionPhase: MissionPhase;
    expeditionStartTick: number;

    // 震荡检测
    lastRoomName?: string;
    roomSwitchCount?: number;
    lastSwitchTick?: number;
}

export interface ExpeditionMissionData {
    targetRoomName: string;
    homeRoomName: string;           // 起始房间名称
    waypoints?: string[];           // 指定的安全中继点
    currentPhase: MissionPhase;
    phaseStartTick: number;
    activeCreeps: {
        [phase: string]: string[];  // 每个阶段的活跃creep名称列表
    };
}