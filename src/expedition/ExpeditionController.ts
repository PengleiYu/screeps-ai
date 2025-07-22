// 远征控制器 - 协调三阶段远征任务的核心调度器

import { MissionPhase, ExpeditionMissionData } from './core/ExpeditionStates';
import { RemoteClaimerRole, ROLE_REMOTE_CLAIMER } from './roles/RemoteClaimerRole';
import { RemoteUpgraderRole, ROLE_REMOTE_UPGRADER } from './roles/RemoteUpgraderRole';
import { RemoteBuilderRole, ROLE_REMOTE_BUILDER } from './roles/RemoteBuilderRole';
import { ExpeditionPathManager } from './core/ExpeditionPathManager';

export class ExpeditionController {
    private static get missionData(): { [targetRoom: string]: ExpeditionMissionData } {
        if (!Memory.expeditions) {
            Memory.expeditions = {};
        }
        return Memory.expeditions;
    }

    private static set missionData(data: { [targetRoom: string]: ExpeditionMissionData }) {
        Memory.expeditions = data;
    }
    
    static run(): void {
        // 检查所有远征任务
        for (const targetRoom in this.missionData) {
            this.manageMission(targetRoom);
        }
        
        // 运行所有远征creep
        this.runExpeditionCreeps();
        
        // 定期清理过期路径缓存 (每100tick一次)
        if (Game.time % 100 === 0) {
            ExpeditionPathManager.cleanExpiredCache();
        }
    }

    // 启动新的远征任务
    static startExpedition(targetRoom: string, homeRoom: string, waypoints?: string[]): boolean {
        if (this.missionData[targetRoom]) {
            console.log(`远征任务 ${targetRoom} 已存在`);
            return false;
        }

        // 验证房间存在
        const room = Game.rooms[homeRoom];
        if (!room) {
            console.log(`无法访问起始房间 ${homeRoom}`);
            return false;
        }

        // 验证路径
        const path = ExpeditionPathManager.findPathToRoom(homeRoom, targetRoom, waypoints);
        if (!path) {
            console.log(`无法找到从 ${homeRoom} 前往 ${targetRoom} 的路径`);
            if (waypoints && waypoints.length > 0) {
                console.log(`尝试移除中继点后重新计算路径...`);
                const directPath = ExpeditionPathManager.findPathToRoom(homeRoom, targetRoom);
                if (directPath) {
                    console.log(`⚠️ 警告：中继点路径失败，已切换到直接路径（可能不安全）`);
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        // 验证Claimer寿命是否足够
        const finalPath = path || ExpeditionPathManager.findPathToRoom(homeRoom, targetRoom);
        if (!finalPath) {
            console.log(`❌ 无法获取有效路径进行距离验证`);
            return false;
        }

        // 使用专门的Claimer任务验证
        const claimerValidation = ExpeditionPathManager.validateClaimerMission(finalPath.totalDistance);
        
        if (!claimerValidation.canComplete) {
            console.log(`❌ 距离过远！Claimer无法完成占领任务:`);
            console.log(`   路径距离: ${finalPath.totalDistance} 房间`);
            console.log(`   预估旅行: ${claimerValidation.travelTime} tick`);
            console.log(`   剩余工作: ${claimerValidation.workTime} tick (需要至少50tick)`);
            console.log(`💡 ${claimerValidation.recommendation}`);
            return false;
        }

        console.log(`✅ Claimer任务可行性验证通过:`);
        console.log(`   路径距离: ${finalPath.totalDistance} 房间`);
        console.log(`   预估旅行: ${claimerValidation.travelTime} tick`);
        console.log(`   剩余工作: ${claimerValidation.workTime} tick`);
        console.log(`💡 ${claimerValidation.recommendation}`);

        const waypointStr = waypoints && waypoints.length > 0 ? ` (经由 ${waypoints.join(' -> ')})` : '';
        console.log(`🏴‍☠️ 开始远征任务: ${homeRoom} -> ${targetRoom}${waypointStr}`);
        ExpeditionPathManager.printPathInfo(homeRoom, targetRoom, waypoints);

        // 初始化任务数据
        const missions = this.missionData;
        missions[targetRoom] = {
            targetRoomName: targetRoom,
            homeRoomName: homeRoom,
            waypoints: waypoints,
            currentPhase: MissionPhase.CLAIMING,
            phaseStartTick: Game.time,
            activeCreeps: {
                [MissionPhase.CLAIMING]: [],
                [MissionPhase.UPGRADING]: [],
                [MissionPhase.BUILDING]: []
            }
        };
        this.missionData = missions;

        // 立即派遣第一个占领者
        const availableSpawn = this.getAvailableSpawnInRoom(homeRoom);
        if (availableSpawn) {
            this.spawnClaimerIfNeeded(targetRoom, availableSpawn);
        }
        
        return true;
    }

    // 管理单个远征任务
    private static manageMission(targetRoom: string): void {
        const mission = this.missionData[targetRoom];
        if (!mission) return;

        // 检查任务是否完成
        if (this.isExpeditionComplete(targetRoom)) {
            console.log(`🎉 远征任务 ${targetRoom} 完成！房间已建成Spawn`);
            const missions = this.missionData;
            delete missions[targetRoom];
            this.missionData = missions;
            return;
        }

        // 检查是否需要推进到下一阶段
        this.checkPhaseProgression(targetRoom);

        // 确保每个阶段都有足够的creep
        this.maintainCreepPopulation(targetRoom);
    }

    // 检查远征是否完成
    private static isExpeditionComplete(targetRoom: string): boolean {
        const room = Game.rooms[targetRoom];
        if (!room) return false;

        // 检查是否有己方Spawn
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        return !!spawn;
    }

    // 检查阶段推进
    private static checkPhaseProgression(targetRoom: string): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const room = Game.rooms[targetRoom];
        
        if (!room) return;

        let needsUpdate = false;

        switch (mission.currentPhase) {
            case MissionPhase.CLAIMING:
                // 检查房间是否已被占领
                if (room.controller && room.controller.my) {
                    console.log(`✅ 阶段1完成: ${targetRoom} 已被占领`);
                    mission.currentPhase = MissionPhase.UPGRADING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;

            case MissionPhase.UPGRADING:
                // 检查是否达到RCL2
                if (room.controller && room.controller.my && room.controller.level >= 2) {
                    console.log(`✅ 阶段2完成: ${targetRoom} 已升级到RCL2`);
                    mission.currentPhase = MissionPhase.BUILDING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;

            case MissionPhase.BUILDING:
                // 在manageMission中已检查Spawn建设完成
                break;
        }

        if (needsUpdate) {
            this.missionData = missions;
        }
    }

    // 维持creep人口
    private static maintainCreepPopulation(targetRoom: string): void {
        const mission = this.missionData[targetRoom];
        
        // 优先使用起始房间的Spawn，其次使用任意可用Spawn
        let availableSpawn = this.getAvailableSpawnInRoom(mission.homeRoomName);
        if (!availableSpawn) {
            availableSpawn = this.getAvailableSpawn();
        }
        if (!availableSpawn) return;

        switch (mission.currentPhase) {
            case MissionPhase.CLAIMING:
                this.spawnClaimerIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.UPGRADING:
                this.spawnUpgraderIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.BUILDING:
                this.spawnBuilderIfNeeded(targetRoom, availableSpawn);
                break;
        }
    }

    // 派遣占领者
    private static spawnClaimerIfNeeded(targetRoom: string, spawn: StructureSpawn): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeClaimers = mission.activeCreeps[MissionPhase.CLAIMING];

        // 只需要一个占领者
        if (activeClaimers.length === 0) {
            const result = RemoteClaimerRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `remoteClaimer_${Game.time}`;
                activeClaimers.push(name);
                this.missionData = missions;
                console.log(`🏃 派遣占领者 ${name} 前往 ${targetRoom}`);
            }
        }
    }

    // 派遣升级者
    private static spawnUpgraderIfNeeded(targetRoom: string, spawn: StructureSpawn): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeUpgraders = mission.activeCreeps[MissionPhase.UPGRADING];

        // 保持1-2个升级者
        if (activeUpgraders.length < 1) {
            const result = RemoteUpgraderRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `remoteUpgrader_${Game.time}`;
                activeUpgraders.push(name);
                this.missionData = missions;
                console.log(`⚡ 派遣升级者 ${name} 前往 ${targetRoom}`);
            }
        }
    }

    // 派遣建造者
    private static spawnBuilderIfNeeded(targetRoom: string, spawn: StructureSpawn): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeBuilders = mission.activeCreeps[MissionPhase.BUILDING];

        // 保持1-2个建造者
        if (activeBuilders.length < 1) {
            const result = RemoteBuilderRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `remoteBuilder_${Game.time}`;
                activeBuilders.push(name);
                this.missionData = missions;
                console.log(`🏗️ 派遣建造者 ${name} 前往 ${targetRoom}`);
            }
        }
    }

    // 运行所有远征creep
    private static runExpeditionCreeps(): void {
        for (const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            
            switch (creep.memory.role) {
                case ROLE_REMOTE_CLAIMER:
                    new RemoteClaimerRole(creep).run();
                    break;
                case ROLE_REMOTE_UPGRADER:
                    new RemoteUpgraderRole(creep).run();
                    break;
                case ROLE_REMOTE_BUILDER:
                    new RemoteBuilderRole(creep).run();
                    break;
            }
        }

        // 清理死亡creep的记录
        this.cleanupDeadCreeps();
    }

    // 清理死亡creep记录
    private static cleanupDeadCreeps(): void {
        const missions = this.missionData;
        let needsUpdate = false;
        
        for (const targetRoom in missions) {
            const mission = missions[targetRoom];
            
            for (const phase in mission.activeCreeps) {
                const originalLength = mission.activeCreeps[phase].length;
                mission.activeCreeps[phase] = mission.activeCreeps[phase].filter(
                    name => Game.creeps[name] !== undefined
                );
                if (mission.activeCreeps[phase].length !== originalLength) {
                    needsUpdate = true;
                }
            }
        }
        
        if (needsUpdate) {
            this.missionData = missions;
        }
    }

    // 获取可用的Spawn（优先从所有房间中选择）
    private static getAvailableSpawn(): StructureSpawn | null {
        return Object.values(Game.spawns).find(spawn => !spawn.spawning) || null;
    }

    // 获取指定房间中可用的Spawn
    private static getAvailableSpawnInRoom(roomName: string): StructureSpawn | null {
        const room = Game.rooms[roomName];
        if (!room) return null;
        
        const spawns = room.find(FIND_MY_SPAWNS);
        return spawns.find(spawn => !spawn.spawning) || null;
    }

    // 调试方法
    static printMissionStatus(): void {
        console.log('=== 远征任务状态 ===');
        
        for (const targetRoom in this.missionData) {
            const mission = this.missionData[targetRoom];
            console.log(`🏠 起始房间: ${mission.homeRoomName}`);
            console.log(`🎯 目标房间: ${targetRoom}`);
            if (mission.waypoints && mission.waypoints.length > 0) {
                console.log(`🛤️ 指定路径: ${mission.waypoints.join(' -> ')}`);
            }
            console.log(`📍 当前阶段: ${mission.currentPhase}`);
            console.log(`⏱️ 阶段开始: ${mission.phaseStartTick} (${Game.time - mission.phaseStartTick} tick前)`);
            
            for (const phase in mission.activeCreeps) {
                const creeps = mission.activeCreeps[phase];
                if (creeps.length > 0) {
                    console.log(`  ${phase}: ${creeps.join(', ')}`);
                }
            }
            console.log('---');
        }
        
        if (Object.keys(this.missionData).length === 0) {
            console.log('当前没有活跃的远征任务');
        }
    }

    static getMissionData(): { [targetRoom: string]: ExpeditionMissionData } {
        return this.missionData;
    }
}