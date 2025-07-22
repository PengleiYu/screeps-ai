// 远程升级角色 - 阶段2：使用废墟资源升级控制器到RCL2

import { ExpeditionRole } from '../core/ExpeditionRole';
import { MissionPhase } from '../core/ExpeditionStates';

export const ROLE_REMOTE_UPGRADER = 'remoteUpgrader';

export class RemoteUpgraderRole extends ExpeditionRole {
    
    protected doWork(): void {
        const room = this.getTargetRoom();
        if (!room) {
            this.log('无法访问目标房间，等待房间可见');
            return;
        }

        const controller = room.controller;
        if (!controller || !controller.my) {
            this.log('控制器不存在或不属于己方，等待占领阶段完成');
            return;
        }

        // 执行批量工作循环：满载采集 -> 满载升级
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            // store满载，去升级直到耗尽
            this.upgradeController(controller);
        } else if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            // store空载，去采集直到满载
            this.collectEnergy();
        } else {
            // store部分满载，根据当前距离决定继续哪个工作
            const distanceToController = this.creep.pos.getRangeTo(controller);
            const nearestSource = this.creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: source => source.energy > 0
            });
            const distanceToSource = nearestSource ? this.creep.pos.getRangeTo(nearestSource) : 999;
            
            if (distanceToController <= distanceToSource) {
                // 距离控制器更近，继续升级
                this.upgradeController(controller);
            } else {
                // 距离能量源更近，继续采集
                this.collectEnergy();
            }
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
                    visualizePathStyle: { stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8 }
                });
            } else if (result !== OK) {
                this.log(`从废墟收集能量失败: ${result}`);
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
                    visualizePathStyle: { stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8 }
                });
            } else if (result !== OK) {
                this.log(`从墓碑收集能量失败: ${result}`);
            }
            return;
        }

        // 最后尝试从地上的能量资源收集
        const droppedEnergy = this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });

        if (droppedEnergy) {
            const result = this.creep.pickup(droppedEnergy);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(droppedEnergy, {
                    visualizePathStyle: { stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8 }
                });
            } else if (result !== OK) {
                this.log(`拾取地面能量失败: ${result}`);
            }
            return;
        }

        // 如果找不到能量源，寻找能量点采集
        const source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
            filter: source => source.energy > 0
        });

        if (source) {
            const result = this.creep.harvest(source);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(source, {
                    visualizePathStyle: { stroke: '#ffff00', lineStyle: 'solid', opacity: 0.8 }
                });
            } else if (result !== OK) {
                this.log(`采集能量失败: ${result}`);
            }
        } else {
            this.log('未找到任何能量源');
        }
    }

    private upgradeController(controller: StructureController): void {
        const result = this.creep.upgradeController(controller);
        
        switch (result) {
            case OK:
                this.log(`升级控制器成功，当前RCL: ${controller.level}, 进度: ${controller.progress}/${controller.progressTotal}`);
                break;
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#00ff00', lineStyle: 'solid', opacity: 0.8 }
                });
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                this.log('能量不足，重新收集能量');
                break;
            case ERR_INVALID_TARGET:
                this.log('无效的控制器目标');
                break;
            default:
                this.log(`升级控制器失败: ${result}`);
                break;
        }
    }

    protected onArrivedAtTarget(): void {
        super.onArrivedAtTarget();
        this.log('开始执行房间升级任务，目标RCL2');
    }

    protected onNearDeath(): void {
        super.onNearDeath();
        this.log('升级者即将死亡，需要派遣继任者');
    }

    // 创建远程升级者的静态方法
    static spawn(spawn: StructureSpawn, targetRoom: string): ScreepsReturnCode {
        const name = `remoteUpgrader_${Game.time}`;
        const body = RemoteUpgraderRole.getOptimalBody(spawn);
        
        if (body.length === 0) {
            return ERR_NOT_ENOUGH_ENERGY;
        }
        
        return ExpeditionRole.spawnExpeditionCreep(
            spawn,
            name,
            body,
            targetRoom,
            MissionPhase.UPGRADING,
            ROLE_REMOTE_UPGRADER
        );
    }

    // 计算目标房间最优升级者数量（考虑实际运营复杂度）
    static calculateOptimalUpgraderCount(room: Room | null, upgraderBodyParts: BodyPartConstant[], expeditionDistance?: number): number {
        if (!room) {
            console.log(`⚠️ 警告: 房间不存在，无法计算最优升级者数量，返回默认值1`);
            return 1; // 房间不可见时返回默认值
        }

        if (!room.controller?.my) {
            console.log(`⚠️ 警告: 房间 ${room.name} 控制器不属于己方，升级者计算不应在此时调用`);
            return 1; // 房间不属于己方时返回默认值
        }

        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) {
            return 1; // 没有能量矿时返回默认值
        }

        // 计算升级者的工作能力
        const workParts = upgraderBodyParts.filter(part => part === WORK).length;
        const harvestPowerPerCreep = workParts * 2; // 每个WORK部件每tick采集2能量

        let theoreticalOptimalUpgraders = 0;

        for (const source of sources) {
            // 分析能量矿周围的可用位置
            const accessiblePositions = this.getAccessiblePositionsAroundSource(room, source);
            const maxCreepsAtSource = accessiblePositions.length;

            // 计算能量矿的产出速度（能量/tick）
            const sourceRegenRate = source.energyCapacity / 300; // 300tick恢复周期

            // 计算需要多少升级者才能完全采集这个矿的能量
            const upgradersNeededForThisSource = Math.min(
                Math.ceil(sourceRegenRate / harvestPowerPerCreep), // 基于采集能力
                maxCreepsAtSource // 受位置限制
            );

            theoreticalOptimalUpgraders += upgradersNeededForThisSource;

            console.log(`能量矿 ${source.pos}: 可用位置${maxCreepsAtSource}, 产出${sourceRegenRate.toFixed(1)}/tick, 理论需要${upgradersNeededForThisSource}个升级者`);
        }

        // 应用实际运营修正因子
        const practicalCount = this.applyPracticalModifiers(theoreticalOptimalUpgraders, expeditionDistance || 1);

        console.log(`${room.name} 升级者计算: 理论${theoreticalOptimalUpgraders}个 -> 实际${practicalCount}个`);

        // 至少要有1个升级者
        return Math.max(1, practicalCount);
    }

    // 应用实际运营修正因子
    private static applyPracticalModifiers(theoreticalCount: number, expeditionDistance: number): number {
        // 1. 工作效率因子 (0.6-0.8)
        // 升级者需要在采集和升级之间切换，不是100%时间在采集
        const workEfficiencyFactor = 0.7; // 假设70%时间用于采集，30%用于升级和移动

        // 2. 远征距离因子 (基于距离的额外需求)
        // 距离越远，在途时间越长，需要更多升级者保证连续性
        const distanceFactor = Math.min(1 + (expeditionDistance - 1) * 0.1, 2.0); // 每房间增加10%，最多100%

        // 3. 生命周期重叠因子 (1.2-1.5)
        // 考虑升级者死亡和新升级者到达之间的空档期
        const lifecycleOverlapFactor = 1.3; // 30%的重叠缓冲

        // 4. 实际运营缓冲因子 (1.1-1.3)
        // 考虑路径阻塞、能量竞争、creep卡位等实际问题
        const operationalBufferFactor = 1.2; // 20%的运营缓冲

        // 应用所有修正因子
        const adjustedCount = theoreticalCount / workEfficiencyFactor * distanceFactor * lifecycleOverlapFactor * operationalBufferFactor;

        console.log(`修正因子应用: 工作效率${(1/workEfficiencyFactor).toFixed(2)}x, 距离${distanceFactor.toFixed(2)}x, 生命周期${lifecycleOverlapFactor.toFixed(2)}x, 运营缓冲${operationalBufferFactor.toFixed(2)}x`);

        return Math.ceil(adjustedCount);
    }

    // 获取能量矿周围的可访问位置
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
                
                // 检查是否有阻挡的建筑物（不包括道路、容器等可通行建筑）
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

    // 获取最佳身体配置 - 平衡移动和工作能力
    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyAvailable;
        
        const bodies = [
            // 超高速配置：3 WORK + 3 CARRY + 9 MOVE = 1050 能量 (1格/tick移动)
            { 
                energy: 1050, 
                parts: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
                speed: '1.0格/tick',
                travelTime: '17房间约850tick'
            },
            // 高速配置：2 WORK + 2 CARRY + 6 MOVE = 700 能量 (1格/tick移动)
            { 
                energy: 700, 
                parts: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
                speed: '1.0格/tick', 
                travelTime: '17房间约850tick'
            },
            // 中速配置：2 WORK + 2 CARRY + 4 MOVE = 600 能量 (0.67格/tick移动)
            { 
                energy: 600, 
                parts: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
                speed: '0.67格/tick',
                travelTime: '17房间约1200tick'
            },
            // 基本配置：1 WORK + 1 CARRY + 3 MOVE = 350 能量 (0.6格/tick移动)
            { 
                energy: 350, 
                parts: [WORK, CARRY, MOVE, MOVE, MOVE],
                speed: '0.6格/tick',
                travelTime: '17房间约1400tick'
            },
            // 最低配置：1 WORK + 1 CARRY + 2 MOVE = 300 能量 (0.5格/tick移动)
            { 
                energy: 300, 
                parts: [WORK, CARRY, MOVE, MOVE],
                speed: '0.5格/tick',
                travelTime: '17房间约1700tick'
            }
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                console.log(`远程升级者使用配置: ${bodyConfig.parts.join(',')} (${bodyConfig.energy} 能量)`);
                console.log(`  移动速度: ${bodyConfig.speed}, 预计到达时间: ${bodyConfig.travelTime}`);
                return bodyConfig.parts;
            }
        }

        return [];
    }
}