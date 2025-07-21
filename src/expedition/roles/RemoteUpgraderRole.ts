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

        // 检查是否已达到RCL2
        if (controller.level >= 2) {
            this.log('控制器已达到RCL2，升级阶段完成');
            return;
        }

        // 执行工作循环：收集能量 -> 升级控制器
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            this.collectEnergy();
        } else {
            this.upgradeController(controller);
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

    // 获取最佳身体配置
    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyAvailable;
        
        const bodies = [
            // 高级配置：4 WORK + 2 CARRY + 6 MOVE = 900 能量
            { energy: 900, parts: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] },
            // 中级配置：3 WORK + 2 CARRY + 5 MOVE = 750 能量
            { energy: 750, parts: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] },
            // 基本配置：2 WORK + 1 CARRY + 3 MOVE = 500 能量
            { energy: 500, parts: [WORK, WORK, CARRY, MOVE, MOVE, MOVE] },
            // 最低配置：1 WORK + 1 CARRY + 2 MOVE = 300 能量
            { energy: 300, parts: [WORK, CARRY, MOVE, MOVE] }
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                return bodyConfig.parts;
            }
        }

        return [];
    }
}