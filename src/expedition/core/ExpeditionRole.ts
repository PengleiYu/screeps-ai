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
        const currentRoom = this.creep.room.name;
        
        // 震荡检测
        if (this.detectRoomOscillation(currentRoom)) {
            this.handleRoomOscillation();
            return;
        }
        
        if (currentRoom === targetRoom) {
            // 到达目标房间，开始工作
            this.log(`到达目标房间 ${targetRoom}，开始工作`);
            this.memory.expeditionState = ExpeditionState.WORKING;
            this.onArrivedAtTarget();
            return;
        }

        // 继续前往目标房间
        this.moveToTargetRoom();
    }

    // 检测房间震荡
    private detectRoomOscillation(currentRoom: string): boolean {
        const memory = this.memory;
        
        // 如果房间发生了变化
        if (memory.lastRoomName && memory.lastRoomName !== currentRoom) {
            memory.roomSwitchCount = (memory.roomSwitchCount || 0) + 1;
            memory.lastSwitchTick = Game.time;
            
            // 如果在短时间内频繁切换房间，判定为震荡
            if (memory.roomSwitchCount > 6 && Game.time - (memory.lastSwitchTick || 0) < 20) {
                return true;
            }
        }
        
        memory.lastRoomName = currentRoom;
        
        // 重置计数器（如果时间间隔较长）
        if (Game.time - (memory.lastSwitchTick || 0) > 50) {
            memory.roomSwitchCount = 0;
        }
        
        return false;
    }

    // 处理房间震荡
    private handleRoomOscillation(): void {
        this.log(`🚨 检测到房间震荡，暂停移动5tick并重置路径`);
        
        // 清除creep的移动缓存
        delete (this.creep.memory as any)._move;
        
        // 重置震荡检测
        this.memory.roomSwitchCount = 0;
        this.memory.lastSwitchTick = Game.time;
        
        // 暂停几tick，让情况稳定
        if ((Game.time % 10) < 5) {
            return; // 暂停移动
        }
        
        // 尝试用直接路径（忽略waypoints）
        const targetRoom = this.memory.targetRoomName;
        const finalTargetPos = new RoomPosition(25, 25, targetRoom);
        
        this.log(`🔄 使用直接路径重新尝试移动到 ${targetRoom}`);
        this.creep.moveTo(finalTargetPos, {
            reusePath: 1, // 强制重新计算路径
            ignoreCreeps: true, // 忽略其他creep
            maxRooms: 16 // 允许跨越更多房间
        });
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
        const currentRoom = this.creep.room.name;
        
        // 获取任务的waypoints信息
        const waypoints = this.getWaypointsFromMissionData();
        const nextRoom = ExpeditionPathManager.getNextRoomInPath(currentRoom, targetRoom, waypoints);
        
        if (!nextRoom) {
            this.log(`⚠️ 无法找到前往 ${targetRoom} 的下一个房间`);
            this.log(`当前位置: ${currentRoom}, 目标: ${targetRoom}, waypoints: ${waypoints?.join(' -> ') || '无'}`);
            return;
        }

        // 检查是否已经在目标房间边缘但需要移动到另一个房间
        if (currentRoom === nextRoom) {
            this.log(`⚠️ 路径计算错误：当前房间等于下一个房间 (${currentRoom})`);
            return;
        }

        this.log(`🧭 移动路径: ${currentRoom} -> ${nextRoom} -> ... -> ${targetRoom}`);

        // 优化移动逻辑：优先考虑waypoints
        let targetPos: RoomPosition;
        
        if (waypoints && waypoints.length > 0) {
            // 如果有waypoints，先移动到最近的waypoint
            const unvisitedWaypoints = waypoints.filter(wp => 
                !this.hasPassedThroughRoom(wp, currentRoom, waypoints)
            );
            
            if (unvisitedWaypoints.length > 0) {
                // 移动到下一个waypoint
                targetPos = new RoomPosition(25, 25, unvisitedWaypoints[0]);
                this.log(`🎯 移动到waypoint: ${unvisitedWaypoints[0]}`);
            } else {
                // 所有waypoints都已通过，移动到最终目标
                targetPos = new RoomPosition(25, 25, targetRoom);
                this.log(`🏁 所有waypoints已通过，前往最终目标: ${targetRoom}`);
            }
        } else {
            // 没有waypoints，直接移动到目标
            targetPos = new RoomPosition(25, 25, targetRoom);
        }

        const moveResult = this.creep.moveTo(targetPos, {
            visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed', opacity: 0.8 },
            reusePath: 10, // 增加路径重用时间，减少重新计算
            serializeMemory: false // 不序列化到内存
        });
        
        if (moveResult === ERR_NO_PATH) {
            this.log(`❌ 无法找到到达 ${targetRoom} 的路径，尝试分段移动`);
            this.fallbackMoveToNextRoom(nextRoom);
        } else if (moveResult !== OK && moveResult !== ERR_TIRED) {
            this.log(`⚠️ 移动失败: ${moveResult}, 位置: (${this.creep.pos.x},${this.creep.pos.y})`);
        }
    }


    // 备用方案：分段移动到下一个房间
    private fallbackMoveToNextRoom(nextRoom: string): void {
        const currentRoom = this.creep.room.name;
        const exitDirection = this.creep.room.findExitTo(nextRoom);
        
        if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
            this.log(`❌ 无法找到从 ${currentRoom} 前往 ${nextRoom} 的出口`);
            return;
        }

        // 找到距离较远的出口位置，避免在边界震荡
        const exits = this.creep.room.find(exitDirection);
        if (exits.length === 0) {
            this.log(`❌ 找不到前往 ${nextRoom} 的出口点`);
            return;
        }

        // 选择一个安全的出口位置（避免边角）
        const safeExits = exits.filter(pos => 
            pos.x > 1 && pos.x < 48 && pos.y > 1 && pos.y < 48
        );
        const targetExit = safeExits.length > 0 ? safeExits[0] : exits[0];

        this.log(`🚪 备用方案：移动到出口位置 (${targetExit.x},${targetExit.y})`);
        const moveResult = this.creep.moveTo(targetExit, {
            reusePath: 3,
            ignoreCreeps: true // 忽略其他creep，避免被阻挡
        });

        if (moveResult !== OK && moveResult !== ERR_TIRED) {
            this.log(`❌ 备用移动也失败: ${moveResult}`);
        }
    }

    // 判断是否已经通过某个waypoint房间
    private hasPassedThroughRoom(waypointRoom: string, currentRoom: string, waypoints: string[]): boolean {
        const waypointIndex = waypoints.indexOf(waypointRoom);
        const currentIndex = waypoints.indexOf(currentRoom);
        
        // 如果当前房间就是waypoint，认为正在通过
        if (currentRoom === waypointRoom) {
            return false; // 还没完全通过
        }
        
        // 如果当前房间在waypoint之后，说明已经通过了
        if (currentIndex > waypointIndex) {
            return true;
        }
        
        // 简单的距离判断：如果已经远离waypoint，可能已经通过
        // 这里使用简单的房间名比较，可以改进为实际距离计算
        return false;
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