// 远程建造角色 - 阶段3：建造Spawn等关键建筑

import {ExpeditionRole} from '../core/ExpeditionRole';
import {MissionPhase} from '../core/ExpeditionStates';

export const ROLE_REMOTE_BUILDER = 'remoteBuilder';

export class RemoteBuilderRole extends ExpeditionRole {

    protected doWork(): void {
        const room = this.getTargetRoom();
        if (!room) {
            this.log('无法访问目标房间，等待房间可见');
            return;
        }

        const controller = room.controller;
        if (!controller || !controller.my || controller.level < 2) {
            this.log('控制器不存在、不属于己方或未达到RCL2，等待升级阶段完成');
            return;
        }

        // 检查是否已有Spawn
        const existingSpawn = room.find(FIND_MY_SPAWNS)[0];
        if (existingSpawn) {
            this.log('Spawn已建成，建造阶段完成');
            return;
        }

        // 执行工作循环：收集能量 -> 建造建筑
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            this.collectEnergy();
        } else {
            this.doBuild();
        }
    }

    private collectEnergy(): void {
        // 优先从废墟收集能量
        const ruin = this.creep.pos.findClosestByPath(FIND_RUINS, {
            filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });

        if (ruin) {
            const result = this.creep.withdraw(ruin, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(ruin, {
                    visualizePathStyle: {stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8}
                });
            }
            return;
        }

        // 其次从墓碑收集能量
        const tombstone = this.creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: tomb => tomb.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });

        if (tombstone) {
            const result = this.creep.withdraw(tombstone, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(tombstone, {
                    visualizePathStyle: {stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8}
                });
            }
            return;
        }

        // 从地面资源收集
        const droppedEnergy = this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });

        if (droppedEnergy) {
            const result = this.creep.pickup(droppedEnergy);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(droppedEnergy, {
                    visualizePathStyle: {stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8}
                });
            }
            return;
        }

        // 最后从能量点采集
        const source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
            filter: source => source.energy > 0
        });

        if (source) {
            const result = this.creep.harvest(source);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8}
                });
            }
        }
    }

    private doBuild(): void {
        // 优先建造Spawn
        const spawnSite = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
            filter: site => site.structureType === STRUCTURE_SPAWN
        });

        if (spawnSite) {
            const result = this.creep.build(spawnSite);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(spawnSite, {
                    visualizePathStyle: {stroke: '#00ffff', lineStyle: 'solid', opacity: 0.8}
                });
            } else if (result === OK) {
                this.log(`建造Spawn中，进度: ${spawnSite.progress}/${spawnSite.progressTotal}`);
            }
            return;
        }

        // 如果没有Spawn建设点，尝试放置Spawn建设点
        this.placeSpawnConstructionSite();

        // 建造其他优先建筑（Extension等）
        const prioritySite = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
            filter: site => ([STRUCTURE_EXTENSION, STRUCTURE_CONTAINER] as StructureConstant[]).includes(site.structureType)
        });

        if (prioritySite) {
            const result = this.creep.build(prioritySite);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(prioritySite, {
                    visualizePathStyle: {stroke: '#00ffff', lineStyle: 'solid', opacity: 0.8}
                });
            }
            return;
        }

        // 建造任意建筑
        const anySite = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        if (anySite) {
            const result = this.creep.build(anySite);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(anySite, {
                    visualizePathStyle: {stroke: '#00ffff', lineStyle: 'solid', opacity: 0.8}
                });
            }
        } else {
            this.log('没有找到建设点，等待规划');
        }
    }

    private placeSpawnConstructionSite(): void {
        const room = this.getTargetRoom();
        if (!room || !room.controller) return;

        // 在控制器附近寻找合适的Spawn位置
        const controllerPos = room.controller.pos;
        
        // 遍历控制器周围3格范围内的位置
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const x = controllerPos.x + dx;
                const y = controllerPos.y + dy;
                
                // 检查坐标是否在房间范围内
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                
                const pos = new RoomPosition(x, y, room.name);
                
                // 检查地形是否可建造（不是墙壁）
                const terrain = room.getTerrain().get(x, y);
                if (terrain & TERRAIN_MASK_WALL) continue;
                
                // 检查位置是否有其他建筑或建设点
                const structures = pos.lookFor(LOOK_STRUCTURES);
                const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                if (structures.length > 0 || sites.length > 0) continue;
                
                // 尝试在此位置放置Spawn建设点
                const result = room.createConstructionSite(pos, STRUCTURE_SPAWN);
                if (result === OK) {
                    this.log(`成功放置Spawn建设点在 (${x}, ${y})`);
                    return;
                } else if (result === ERR_INVALID_TARGET) {
                    continue; // 位置不合适，继续寻找
                } else {
                    this.log(`放置Spawn建设点失败: ${result}`);
                    return;
                }
            }
        }
        
        this.log('未找到合适的Spawn建设位置');
    }

    protected onArrivedAtTarget(): void {
        super.onArrivedAtTarget();
        this.log('开始执行房间建造任务，优先建造Spawn');
    }

    protected onNearDeath(): void {
        super.onNearDeath();
        this.log('建造者即将死亡，需要派遣继任者');
    }

    // 创建远程建造者的静态方法
    static spawn(spawn: StructureSpawn, targetRoom: string): ScreepsReturnCode {
        const name = `remoteBuilder_${Game.time}`;
        const body = RemoteBuilderRole.getOptimalBody(spawn);

        if (body.length === 0) {
            return ERR_NOT_ENOUGH_ENERGY;
        }

        return ExpeditionRole.spawnExpeditionCreep(
            spawn,
            name,
            body,
            targetRoom,
            MissionPhase.BUILDING,
            ROLE_REMOTE_BUILDER
        );
    }

    // 获取最佳身体配置
    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyAvailable;

        const bodies = [
            // 高级配置：4 WORK + 4 CARRY + 4 MOVE = 800 能量
            {energy: 800, parts: [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]},
            // 中级配置：3 WORK + 3 CARRY + 3 MOVE = 600 能量
            {energy: 600, parts: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]},
            // 基本配置：2 WORK + 2 CARRY + 2 MOVE = 400 能量
            {energy: 400, parts: [WORK, WORK, CARRY, CARRY, MOVE, MOVE]},
            // 最低配置：1 WORK + 1 CARRY + 2 MOVE = 300 能量
            {energy: 300, parts: [WORK, CARRY, MOVE, MOVE]}
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                return bodyConfig.parts;
            }
        }

        return [];
    }
}