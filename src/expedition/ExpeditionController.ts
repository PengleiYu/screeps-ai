// 远征控制器 - 协调三阶段远征任务的核心调度器

import {ExpeditionMissionData, MissionPhase} from './core/ExpeditionStates';
import {RemoteClaimerRole, ROLE_REMOTE_CLAIMER} from './roles/RemoteClaimerRole';
import {RemoteUpgraderRole, ROLE_REMOTE_UPGRADER} from './roles/RemoteUpgraderRole';
import {RemoteBuilderRole, ROLE_REMOTE_BUILDER} from './roles/RemoteBuilderRole';
import {ExpeditionPathManager, MIN_EXPEDITION_WORK_TICK_CNT} from './core/ExpeditionPathManager';
import {RemoteScouterRole, ROLE_REMOTE_SCOUTER} from "./roles/RemoteScouterRole";
import {RemoteInvaderRole, ROLE_REMOTE_INVADER} from "./roles/RemoteInvaderRole";
import {SpawnPlaceHelper} from "./utils/SpawnPlaceHelper";

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
            console.log(`   剩余工作: ${claimerValidation.workTime} tick (需要至少${MIN_EXPEDITION_WORK_TICK_CNT}tick)`);
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
            currentPhase: MissionPhase.SCOUTING,
            phaseStartTick: Game.time,
            activeCreeps: {
                [MissionPhase.SCOUTING]: [],
                [MissionPhase.INVADING]: [],
                [MissionPhase.CLAIMING]: [],
                [MissionPhase.UPGRADING]: [],
                [MissionPhase.BUILDING]: []
            }
        };
        this.missionData = missions;
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
        let mission = this.missionData[targetRoom];
        return mission.currentPhase === MissionPhase.COMPLETED;
    }

    private static isSpawnExist(targetRoom: string) {
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
        let room: Room | undefined = Game.rooms[targetRoom];

        let needsUpdate = false;

        switch (mission.currentPhase) {
            case MissionPhase.SCOUTING:
                if (room != null && room.controller) {
                    console.log(`✅ 阶段-1完成: ${targetRoom} 已侦查`);
                    mission.currentPhase = MissionPhase.INVADING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;
            case MissionPhase.INVADING:
                if (room == null) break;
                // 检查是否还有Invader威胁
                const hasInvaderCreeps = room.find(FIND_HOSTILE_CREEPS, {
                    filter: creep => creep.owner.username === 'Invader'
                }).length > 0;

                const hasInvaderCore = room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: structure => structure.structureType === STRUCTURE_INVADER_CORE
                }).length > 0;

                if (!hasInvaderCreeps && !hasInvaderCore) {
                    console.log(`✅ 阶段0完成: ${targetRoom} Invader威胁已清除`);
                    mission.currentPhase = MissionPhase.CLAIMING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;
            case MissionPhase.CLAIMING:
                if (room == null) break;
                // 检查房间是否已被占领
                if (room.controller && room.controller.my) {
                    console.log(`✅ 阶段1完成: ${targetRoom} 已被占领`);
                    mission.currentPhase = MissionPhase.UPGRADING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;

            case MissionPhase.UPGRADING:
                if (room == null) break;
                // 检查是否达到RCL2
                if (room.controller && room.controller.my && room.controller.level >= 2) {
                    console.log(`✅ 阶段2完成: ${targetRoom} 已升级到RCL2`);
                    mission.currentPhase = MissionPhase.BUILDING;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                }
                break;

            case MissionPhase.BUILDING:
                if (room == null) break;
                // 在manageMission中已检查Spawn建设完成
                if (this.isSpawnExist(targetRoom)) {
                    mission.currentPhase = MissionPhase.COMPLETED;
                    mission.phaseStartTick = Game.time;
                    needsUpdate = true;
                    break;
                }
                console.log(room, '没有spawn工地，需要寻找位置新建');
                const spawnSite = room.find(FIND_MY_CONSTRUCTION_SITES, {
                    filter: site => site.structureType === STRUCTURE_SPAWN
                });
                if (spawnSite == null) {
                    new SpawnPlaceHelper().placeSpawnConstructionSite(room);
                }
                break;
            case MissionPhase.COMPLETED:
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
        if (!availableSpawn) return;

        switch (mission.currentPhase) {
            case MissionPhase.SCOUTING:
                this.spawnScouterIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.INVADING:
                this.spawnInvaderIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.CLAIMING:
                this.spawnClaimerIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.UPGRADING:
                this.spawnUpgraderIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.BUILDING:
                this.spawnBuilderIfNeeded(targetRoom, availableSpawn);
                break;
            case MissionPhase.COMPLETED:
                break;
        }
    }

    // 派遣侦查侦查者
    private static spawnScouterIfNeeded(targetRoom: string, spawn: StructureSpawn) {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeScouters = mission.activeCreeps[MissionPhase.SCOUTING];

        // 只需要一个侦查者
        if (activeScouters.length === 0) {
            const result = RemoteScouterRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `${ROLE_REMOTE_SCOUTER}_${Game.time}`;
                activeScouters.push(name);
                this.missionData = missions;
                console.log(`🏃 派遣侦查者 ${name} 前往 ${targetRoom}`);
            }
        }
    }

    // 派遣入侵者
    private static spawnInvaderIfNeeded(targetRoom: string, spawn: StructureSpawn) {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeInvaders = mission.activeCreeps[MissionPhase.INVADING];

        // 只需要一个占领者
        if (activeInvaders.length < 4) {
            const result = RemoteInvaderRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `${ROLE_REMOTE_INVADER}_${Game.time}`;
                activeInvaders.push(name);
                this.missionData = missions;
                console.log(`🏃 派遣入侵者 ${name} 前往 ${targetRoom}`);
            }
        }
    }

    // 派遣占领者
    private static spawnClaimerIfNeeded(targetRoom: string, spawn: StructureSpawn): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeClaimers = mission.activeCreeps[MissionPhase.CLAIMING];

        let reservationTicks = Game.rooms[targetRoom]?.controller?.reservation?.ticksToEnd ?? 0;
        const maxCnt = reservationTicks > 100 ? 3 : 1;

        // 只需要一个占领者
        if (activeClaimers.length < maxCnt) {
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

        // 检查是否已达到RCL2，如果是则停止生产新升级者
        const targetRoomObj = Game.rooms[targetRoom];
        let level = targetRoomObj?.controller?.level ?? 0;
        if (level >= 2) {
            console.log(`${targetRoom} 已达到RCL2，停止生产新升级者 (现有${activeUpgraders.length}个将自然死亡)`);
            return;
        }

        // 动态计算最优升级者数量（考虑与建造者的采集位竞争）
        const expeditionDistance = ExpeditionPathManager.findPathToRoom(mission.homeRoomName, targetRoom, mission.waypoints)?.totalDistance || 1;
        const optimalBody = RemoteUpgraderRole.getOptimalBody(spawn);

        // 计算共享采集能力分配
        const sharedCapacity = this.calculateSharedHarvestCapacity(targetRoom, mission, spawn);

        // 升级者不是100%时间采集，需要考虑工作效率
        const upgraderWorkEfficiency = 0.7; // 假设70%时间用于采集，30%时间用于升级和移动
        const adjustedMaxUpgraders = Math.floor(sharedCapacity.maxUpgraders / (1 - upgraderWorkEfficiency)); // 采集位置 / 采集时间比例

        const optimalCount = Math.min(
            RemoteUpgraderRole.calculateOptimalUpgraderCount(targetRoomObj, optimalBody, expeditionDistance),
            adjustedMaxUpgraders
        );

        console.log(`${targetRoom} 升级者状态: 当前${activeUpgraders.length}个, 最优${optimalCount}个 (采集位${sharedCapacity.maxUpgraders}个->调整后${adjustedMaxUpgraders}个)`);

        if (activeUpgraders.length < optimalCount) {
            const result = RemoteUpgraderRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `remoteUpgrader_${Game.time}`;
                activeUpgraders.push(name);
                this.missionData = missions;
                console.log(`⚡ 派遣升级者 ${name} 前往 ${targetRoom} (${activeUpgraders.length}/${optimalCount})`);
            }
        }
    }

    // 派遣建造者
    private static spawnBuilderIfNeeded(targetRoom: string, spawn: StructureSpawn): void {
        const missions = this.missionData;
        const mission = missions[targetRoom];
        const activeBuilders = mission.activeCreeps[MissionPhase.BUILDING];

        // 动态计算最优建造者数量（考虑与升级者的采集位竞争）
        const targetRoomObj = Game.rooms[targetRoom];
        const expeditionDistance = ExpeditionPathManager.findPathToRoom(mission.homeRoomName, targetRoom, mission.waypoints)?.totalDistance || 1;
        const optimalBody = RemoteBuilderRole.getOptimalBody(spawn);

        // 计算基础建造需求
        const baseBuilderCount = RemoteBuilderRole.calculateOptimalBuilderCount(targetRoomObj, optimalBody, expeditionDistance);

        // 如果不需要建造者，直接返回
        if (baseBuilderCount === 0) {
            if (activeBuilders.length > 0) {
                console.log(`${targetRoom} 无建造需求，现有${activeBuilders.length}个建造者将自然死亡`);
            }
            return;
        }

        // 计算共享采集能力分配
        const sharedCapacity = this.calculateSharedHarvestCapacity(targetRoom, mission, spawn);

        // 建造者不是100%时间采集，需要考虑工作效率
        const builderWorkEfficiency = 0.6; // 假设60%时间用于建造，40%时间用于采集和移动
        const adjustedMaxBuilders = Math.floor(sharedCapacity.maxBuilders / (1 - builderWorkEfficiency)); // 采集位置 / 采集时间比例

        const optimalCount = Math.min(baseBuilderCount, adjustedMaxBuilders);

        console.log(`${targetRoom} 建造者状态: 当前${activeBuilders.length}个, 最优${optimalCount}个 (采集位${sharedCapacity.maxBuilders}个->调整后${adjustedMaxBuilders}个)`);

        if (activeBuilders.length < optimalCount) {
            const result = RemoteBuilderRole.spawn(spawn, targetRoom);
            if (result === OK) {
                const name = `remoteBuilder_${Game.time}`;
                activeBuilders.push(name);
                this.missionData = missions;
                console.log(`🏗️ 派遣建造者 ${name} 前往 ${targetRoom} (${activeBuilders.length}/${optimalCount})`);
            }
        }
    }

    // 计算升级者和建造者的共享采集能力分配
    private static calculateSharedHarvestCapacity(targetRoom: string, mission: ExpeditionMissionData, spawn: StructureSpawn): {
        totalCapacity: number;
        maxUpgraders: number;
        maxBuilders: number;
        currentUpgraders: number;
        currentBuilders: number;
    } {
        const targetRoomObj = Game.rooms[targetRoom];
        if (!targetRoomObj) {
            return {totalCapacity: 0, maxUpgraders: 0, maxBuilders: 0, currentUpgraders: 0, currentBuilders: 0};
        }

        // 计算总的采集能力
        const sources = targetRoomObj.find(FIND_SOURCES);
        let totalHarvestCapacity = 0;

        for (const source of sources) {
            // 复用建造者的逻辑计算可用位置
            const accessiblePositions = this.getAccessiblePositionsAroundSource(targetRoomObj, source);
            const maxCreepsAtSource = accessiblePositions.length;

            // 计算能量矿的产出速度
            const sourceRegenRate = source.energyCapacity / 300; // 300tick恢复周期

            // 假设使用标准的WORK部件数量（升级者和建造者body类似）
            const upgraderBody = RemoteUpgraderRole.getOptimalBody(spawn);
            const upgraderWorkParts = upgraderBody.filter(part => part === WORK).length;
            const harvestPowerPerCreep = upgraderWorkParts * 2;

            const maxCreepsAtThisSource = Math.min(
                Math.ceil(sourceRegenRate / harvestPowerPerCreep),
                maxCreepsAtSource
            );

            totalHarvestCapacity += maxCreepsAtThisSource;
        }

        // 获取当前活跃的creep数量
        const currentUpgraders = mission.activeCreeps[MissionPhase.UPGRADING].length;
        const currentBuilders = mission.activeCreeps[MissionPhase.BUILDING].length;

        // 计算分配策略
        const allocation = this.allocateHarvestCapacity(
            totalHarvestCapacity,
            currentUpgraders,
            currentBuilders,
            mission.currentPhase
        );

        console.log(`${targetRoom} 采集能力分配: 总容量${totalHarvestCapacity}, 升级者${allocation.maxUpgraders}个, 建造者${allocation.maxBuilders}个`);

        return {
            totalCapacity: totalHarvestCapacity,
            maxUpgraders: allocation.maxUpgraders,
            maxBuilders: allocation.maxBuilders,
            currentUpgraders,
            currentBuilders
        };
    }

    // 分配采集能力的策略
    private static allocateHarvestCapacity(
        totalCapacity: number,
        currentUpgraders: number,
        currentBuilders: number,
        currentPhase: MissionPhase
    ): { maxUpgraders: number; maxBuilders: number } {
        if (totalCapacity === 0) {
            return {maxUpgraders: 0, maxBuilders: 0};
        }

        // 根据当前阶段调整优先级
        switch (currentPhase) {
            case MissionPhase.UPGRADING:
                // 升级阶段优先保证升级者，给建造者预留少量位置
                const reservedForBuilders = Math.min(2, Math.floor(totalCapacity * 0.3)); // 最多30%给建造者
                const maxUpgraders = totalCapacity - reservedForBuilders;
                return {
                    maxUpgraders: Math.max(1, maxUpgraders),
                    maxBuilders: reservedForBuilders
                };

            case MissionPhase.BUILDING:
                // 建造阶段需要平衡，但升级者仍有一定优先级（因为可能需要继续升级）
                const currentTotal = currentUpgraders + currentBuilders;
                if (currentTotal === 0) {
                    // 没有任何creep时，平均分配
                    const halfCapacity = Math.floor(totalCapacity / 2);
                    return {
                        maxUpgraders: halfCapacity,
                        maxBuilders: totalCapacity - halfCapacity
                    };
                } else {
                    // 有现有creep时，尽量维持当前比例，但给建造者更多空间
                    const upgraderRatio = Math.min(0.6, currentUpgraders / currentTotal); // 升级者最多60%
                    const maxUpgradersInBuilding = Math.floor(totalCapacity * upgraderRatio);
                    return {
                        maxUpgraders: maxUpgradersInBuilding,
                        maxBuilders: totalCapacity - maxUpgradersInBuilding
                    };
                }

            default:
                // 其他阶段平均分配
                const half = Math.floor(totalCapacity / 2);
                return {
                    maxUpgraders: half,
                    maxBuilders: totalCapacity - half
                };
        }
    }

    // 获取能量矿周围的可访问位置（复用建造者的逻辑）
    private static getAccessiblePositionsAroundSource(room: Room, source: Source): RoomPosition[] {
        const positions: RoomPosition[] = [];

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue; // 跳过能量矿自身位置

                const x = source.pos.x + dx;
                const y = source.pos.y + dy;

                // 检查位置是否在房间范围内
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                const pos = new RoomPosition(x, y, room.name);

                // 检查地形是否可通行
                const terrain = room.getTerrain().get(x, y);
                if (terrain === TERRAIN_MASK_WALL) continue;

                // 检查是否有阻挡的建筑物
                const structures = pos.lookFor(LOOK_STRUCTURES);
                const hasBlockingStructure = structures.some(structure =>
                    structure.structureType !== STRUCTURE_ROAD &&
                    structure.structureType !== STRUCTURE_CONTAINER &&
                    structure.structureType !== STRUCTURE_RAMPART
                );

                if (!hasBlockingStructure) {
                    positions.push(pos);
                }
            }
        }

        return positions;
    }

    // 运行所有远征creep
    private static runExpeditionCreeps(): void {
        for (const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];

            switch (creep.memory.role) {
                case ROLE_REMOTE_SCOUTER:
                    new RemoteScouterRole(creep).run();
                    break;
                case ROLE_REMOTE_INVADER:
                    new RemoteInvaderRole(creep).run();
                    break;
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
                    console.log(`  ${phase}: ${creeps.length}个, ${creeps.join(', ')}`);
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

    // 停止指定房间的远征任务
    static stopExpedition(targetRoom: string, killCreeps: boolean = true): boolean {
        const missions = this.missionData;
        const mission = missions[targetRoom];

        if (!mission) {
            console.log(`❌ 远征任务 ${targetRoom} 不存在`);
            return false;
        }

        console.log(`🛑 停止远征任务: ${mission.homeRoomName} -> ${targetRoom}`);

        // 杀死所有相关的远征creep
        if (killCreeps) {
            this.killExpeditionCreeps(mission);
        } else {
            console.log(`⚠️ 远征creep将继续存活，但不会有新的任务指派`);
        }

        // 删除任务数据
        delete missions[targetRoom];
        this.missionData = missions;

        // 清理相关路径缓存
        ExpeditionPathManager.clearPathCache(mission.homeRoomName, targetRoom, mission.waypoints);

        console.log(`✅ 远征任务 ${targetRoom} 已停止`);
        return true;
    }

    // 停止所有远征任务
    static stopAllExpeditions(killCreeps: boolean = true): number {
        const missions = this.missionData;
        const missionCount = Object.keys(missions).length;

        if (missionCount === 0) {
            console.log(`ℹ️ 当前没有活跃的远征任务`);
            return 0;
        }

        console.log(`🛑 停止所有远征任务 (共${missionCount}个)`);

        const targetRooms = Object.keys(missions);
        for (const targetRoom of targetRooms) {
            const mission = missions[targetRoom];

            if (killCreeps) {
                this.killExpeditionCreeps(mission);
            }

            // 清理路径缓存
            ExpeditionPathManager.clearPathCache(mission.homeRoomName, targetRoom, mission.waypoints);
        }

        // 清空所有任务数据
        this.missionData = {};

        console.log(`✅ 已停止所有远征任务 (${missionCount}个)`);
        if (!killCreeps) {
            console.log(`⚠️ 现有远征creep将继续存活，但不会有新的任务指派`);
        }

        return missionCount;
    }

    // 杀死指定任务的所有远征creep
    private static killExpeditionCreeps(mission: ExpeditionMissionData): void {
        let killedCount = 0;

        // 杀死所有阶段的creep
        for (const phase in mission.activeCreeps) {
            const creepNames = mission.activeCreeps[phase];
            for (const creepName of creepNames) {
                const creep = Game.creeps[creepName];
                if (creep) {
                    const result = creep.suicide();
                    if (result === OK) {
                        killedCount++;
                        console.log(`💀 杀死远征creep: ${creepName} (${phase})`);
                    } else {
                        console.log(`⚠️ 无法杀死creep ${creepName}: ${result}`);
                    }
                }
            }
        }

        if (killedCount > 0) {
            console.log(`💀 共杀死 ${killedCount} 个远征creep`);
        } else {
            console.log(`ℹ️ 没有需要杀死的远征creep`);
        }
    }

    // 列出所有活跃的远征任务（简化版本）
    static listExpeditions(): void {
        const missions = this.missionData;
        const missionCount = Object.keys(missions).length;

        console.log(`=== 活跃远征任务列表 (${missionCount}个) ===`);

        if (missionCount === 0) {
            console.log(`当前没有活跃的远征任务`);
            return;
        }

        for (const targetRoom in missions) {
            const mission = missions[targetRoom];
            const totalCreeps = Object.values(mission.activeCreeps).reduce((sum, creeps) => sum + creeps.length, 0);
            const waypointStr = mission.waypoints && mission.waypoints.length > 0 ? ` (经由 ${mission.waypoints.join('->')})` : '';

            console.log(`📍 ${mission.homeRoomName} -> ${targetRoom}${waypointStr}`);
            console.log(`   阶段: ${mission.currentPhase} | Creep数量: ${totalCreeps} | 开始时间: ${mission.phaseStartTick}`);
        }
    }
}