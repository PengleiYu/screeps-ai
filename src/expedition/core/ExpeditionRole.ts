// 远征角色基类 - 不继承现有单房间架构

import { ExpeditionState, ExpeditionMemory, MissionPhase } from './ExpeditionStates';
import { ExpeditionPathManager } from './ExpeditionPathManager';

export abstract class ExpeditionRole {
    protected creep: Creep;
    protected memory: ExpeditionMemory;

    constructor(creep: Creep) {
        this.creep = creep;
        this.memory = creep.memory as ExpeditionMemory;
        
        // 初始化远征记忆
        if (!this.memory.expeditionState) {
            this.memory.expeditionState = ExpeditionState.TRAVELING;
            this.memory.expeditionStartTick = Game.time;
        }
    }

    // 主要执行入口
    public run(): void {
        // 检查生命周期
        if (this.creep.ticksToLive && this.creep.ticksToLive < 50) {
            this.onNearDeath();
        }

        switch (this.memory.expeditionState) {
            case ExpeditionState.TRAVELING:
                this.handleTraveling();
                break;
            case ExpeditionState.WORKING:
                this.handleWorking();
                break;
            default:
                console.log(`${this.creep.name}: 未知的远征状态 ${this.memory.expeditionState}`);
                break;
        }
    }

    // 处理前往目标房间
    private handleTraveling(): void {
        const targetRoom = this.memory.targetRoomName;
        
        if (this.creep.room.name === targetRoom) {
            // 到达目标房间，开始工作
            this.log(`到达目标房间 ${targetRoom}，开始工作`);
            this.memory.expeditionState = ExpeditionState.WORKING;
            this.onArrivedAtTarget();
            return;
        }

        // 继续前往目标房间
        this.moveToTargetRoom();
    }

    // 处理在目标房间工作
    private handleWorking(): void {
        // 确保还在目标房间
        if (this.creep.room.name !== this.memory.targetRoomName) {
            this.log(`不在目标房间，重新前往 ${this.memory.targetRoomName}`);
            this.memory.expeditionState = ExpeditionState.TRAVELING;
            return;
        }

        // 执行具体工作
        this.doWork();
    }

    // 移动到目标房间
    private moveToTargetRoom(): void {
        const targetRoom = this.memory.targetRoomName;
        
        // 获取任务的waypoints信息
        const waypoints = this.getWaypointsFromMissionData();
        const nextRoom = ExpeditionPathManager.getNextRoomInPath(this.creep.room.name, targetRoom, waypoints);
        
        if (!nextRoom) {
            this.log(`无法找到前往 ${targetRoom} 的路径`);
            return;
        }

        // 移动到下一个房间的出口
        const exitDirection = this.creep.room.findExitTo(nextRoom);
        if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
            this.log(`无法找到前往 ${nextRoom} 的出口`);
            return;
        }

        const exit = this.creep.pos.findClosestByPath(exitDirection);
        if (exit) {
            const moveResult = this.creep.moveTo(exit, {
                visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed', opacity: 0.8 }
            });
            
            if (moveResult !== OK) {
                this.log(`移动失败: ${moveResult}`);
            }
        }
    }

    // 从任务数据中获取waypoints
    private getWaypointsFromMissionData(): string[] | undefined {
        const targetRoom = this.memory.targetRoomName;
        const missionData = this.getExpeditionController().getMissionData();
        return missionData[targetRoom]?.waypoints;
    }

    // 获取ExpeditionController引用
    private getExpeditionController(): any {
        return (global as any).ExpeditionController;
    }

    // 生命周期管理
    protected onNearDeath(): void {
        this.log(`生命周期即将结束，已存活 ${Game.time - this.memory.expeditionStartTick} tick`);
        // 子类可以重写此方法处理死前逻辑
    }

    protected onArrivedAtTarget(): void {
        this.log(`到达目标房间 ${this.memory.targetRoomName}`);
        // 子类可以重写此方法处理到达逻辑
    }

    // 抽象方法 - 子类必须实现具体工作逻辑
    protected abstract doWork(): void;

    // 工具方法
    protected log(message: string): void {
        console.log(`[${this.creep.name}] ${message}`);
    }

    protected getTargetRoom(): Room | null {
        return Game.rooms[this.memory.targetRoomName] || null;
    }

    // 静态方法 - 创建远征creep的通用逻辑
    static spawnExpeditionCreep(
        spawn: StructureSpawn,
        name: string,
        body: BodyPartConstant[],
        targetRoom: string,
        phase: MissionPhase,
        role: string
    ): ScreepsReturnCode {
        const memory: ExpeditionMemory = {
            role: role,
            expeditionState: ExpeditionState.TRAVELING,
            targetRoomName: targetRoom,
            missionPhase: phase,
            expeditionStartTick: Game.time
        };

        return spawn.spawnCreep(body, name, { memory });
    }
}