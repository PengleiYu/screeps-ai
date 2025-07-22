// 远征角色基类 - 不继承现有单房间架构

import {ExpeditionMemory, ExpeditionState, MissionPhase, ExpeditionMissionData} from './ExpeditionStates';
import {ExpeditionPathManager} from './ExpeditionPathManager';
import {ExpeditionController} from '../ExpeditionController';
import {
    findBestExitPosition, getDirectionName,
    getExitDirectionInEdge,
    getOppositeDirection,
    getRoomDirection
} from "../../utils/PositionUtils";

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
        const currentRoom = this.creep.room.name;
        const missionData = this.getMissionData();

        if (!missionData) {
            this.log(`❌ 无法获取任务数据`);
            return;
        }

        const targetRoom = missionData.targetRoomName;

        if (currentRoom === targetRoom) {
            const exitDirection = getExitDirectionInEdge(this.creep.pos);
            if (exitDirection) {
                const oppositeDirection = getOppositeDirection(exitDirection);
                const currentPos = `(${this.creep.pos.x},${this.creep.pos.y})`;
                this.log(`🎯 到达目标房间但在边缘位置${currentPos}，向${getDirectionName(oppositeDirection)}脱离边缘`);
                this.creep.move(oppositeDirection);
                return;
            }
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
        const missionData = this.getMissionData();

        if (!missionData) {
            this.log(`❌ 无法获取任务数据，停止工作`);
            return;
        }

        const targetRoom = missionData.targetRoomName;

        // 确保还在目标房间
        if (this.creep.room.name !== targetRoom) {
            this.log(`不在目标房间，重新前往 ${targetRoom}`);
            this.memory.expeditionState = ExpeditionState.TRAVELING;
            return;
        }

        // 执行具体工作
        this.doWork();
    }

    // 移动到目标房间
    private moveToTargetRoom(): void {
        const currentRoom = this.creep.room.name;

        // 获取任务的完整信息
        const missionData = this.getMissionData();

        if (!missionData) {
            this.log(`❌ 无法获取任务数据`);
            return;
        }

        const {targetRoomName: targetRoom, waypoints, homeRoomName: homeRoom} = missionData;

        // 使用固定的homeRoom作为路径起点来计算完整路径并缓存
        const fullPath = ExpeditionPathManager.findPathToRoom(homeRoom, targetRoom, waypoints);
        if (!fullPath) {
            this.log(`❌ 无法计算从 ${homeRoom} 到 ${targetRoom} 的路径`);
            return;
        }

        // 根据当前位置在完整路径中找下一个房间
        const currentIndex = fullPath.rooms.indexOf(currentRoom);
        if (currentIndex === -1) {
            this.log(`❌ 当前房间 ${currentRoom} 不在预计路径中，路径: ${fullPath.rooms.join(' -> ')}`);
            return;
        }

        if (currentIndex >= fullPath.rooms.length - 1) {
            this.log(`✅ 已到达路径终点`);
            return;
        }

        const nextRoom = fullPath.rooms[currentIndex + 1];
        this.log(`🧭 移动路径进度: [${currentIndex + 1}/${fullPath.rooms.length}] ${currentRoom} -> ${nextRoom} -> ... -> ${targetRoom}`);

        // 直接移动到路径计算好的下一个房间
        const moveResult = this.moveToRoom(this.creep, nextRoom)
        if (moveResult === ERR_NO_PATH) {
            this.log("NO PATH!")
            // this.log(`❌ 无法找到到达 ${nextRoom} 的路径，尝试分段移动`);
            // this.fallbackMoveToNextRoom(nextRoom);
        } else if (moveResult !== OK && moveResult !== ERR_TIRED) {
            this.log(`⚠️ 移动失败: ${moveResult}, 位置: (${this.creep.pos.x},${this.creep.pos.y})`);
        }
    }

    moveToRoom(creep: Creep, roomName: string) {
        let exitDirection = getExitDirectionInEdge(this.creep.pos);
        if (exitDirection) { // 说明在边缘
            let roomDirection = getRoomDirection(this.creep.room.name, roomName);
            if (!roomDirection) {// 非相邻房间
                this.log(`❌ 房间不相邻: ${this.creep.room.name} -> ${roomName}，无法直接移动`);
                return ERR_NO_PATH;
            }

            const currentPos = `(${this.creep.pos.x},${this.creep.pos.y})`;
            if (roomDirection === exitDirection) { // 目标方位和移动方向相同，离开房间
                this.log(`🚶 边缘位置${currentPos} 向${getDirectionName(exitDirection)}离开 ${this.creep.room.name} -> ${roomName}`);
                return creep.move(exitDirection);
            } else {// 目标方位和移动方向不同，先离开边沿位置，进入房间内部再做计划
                let oppositeDirection = getOppositeDirection(exitDirection);
                this.log(`🔄 边缘位置${currentPos} 方向不对，向${getDirectionName(oppositeDirection)}进入房间内部重新规划 (正确方向: ${getDirectionName(roomDirection)})`);
                return creep.move(oppositeDirection);
            }
        }

        // 去往目标房间的最近离开位置
        let exitPosition = findBestExitPosition(creep, roomName);
        if (!exitPosition) {
            this.log(`❌ 无法找到 ${this.creep.room.name} 前往 ${roomName} 的出口位置`);
            return ERR_NO_PATH;
        }

        const currentPos = `${this.creep.room.name}(${this.creep.pos.x},${this.creep.pos.y})`;
        const targetPos = `${exitPosition.roomName}(${exitPosition.x},${exitPosition.y})`;
        this.log(`🎯 室内移动: ${currentPos} -> ${targetPos} [目标房间: ${roomName}]`);

        return this.creep.moveTo(exitPosition, {
            visualizePathStyle: {stroke: '#ff0000', lineStyle: 'dashed', opacity: 0.8},
        });
    }

    // 从任务数据中获取完整任务信息
    private getMissionData(): ExpeditionMissionData | null {
        const targetRoom = this.memory.targetRoomName;
        const missionData = ExpeditionController.getMissionData();
        return missionData[targetRoom] || null;
    }


    // 生命周期管理
    protected onNearDeath(): void {
        this.log(`生命周期即将结束，已存活 ${Game.time - this.memory.expeditionStartTick} tick`);
        // 子类可以重写此方法处理死前逻辑
    }

    protected onArrivedAtTarget(): void {
        const missionData = this.getMissionData();
        const targetRoom = missionData?.targetRoomName;
        this.log(`到达目标房间 ${targetRoom || 'unknown'}`);
        // 子类可以重写此方法处理到达逻辑
    }

    // 抽象方法 - 子类必须实现具体工作逻辑
    protected abstract doWork(): void;

    // 工具方法
    protected log(message: string): void {
        console.log(`[${this.creep.name}] ${message}`);
    }

    protected getTargetRoom(): Room | null {
        const missionData = this.getMissionData();
        const targetRoom = missionData?.targetRoomName;
        return targetRoom ? (Game.rooms[targetRoom] || null) : null;
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

        return spawn.spawnCreep(body, name, {memory});
    }
}