// 远程占领角色 - 阶段1：占领目标房间控制器

import { ExpeditionRole } from '../core/ExpeditionRole';
import { MissionPhase } from '../core/ExpeditionStates';

export const ROLE_REMOTE_CLAIMER = 'remoteClaimer';

export class RemoteClaimerRole extends ExpeditionRole {
    
    protected doWork(): void {
        const room = this.getTargetRoom();
        if (!room) {
            this.log('无法访问目标房间，等待房间可见');
            return;
        }

        const controller = room.controller;
        if (!controller) {
            this.log('目标房间没有控制器');
            return;
        }

        // 检查是否已经被己方控制
        if (controller.my) {
            this.log('房间已被占领，继续维持控制');
            this.claimController(controller);
            return;
        }

        // 检查是否被其他玩家控制
        if (controller.owner) {
            this.log(`房间被 ${controller.owner.username} 控制，无法占领`);
            return;
        }

        // 检查是否被预订
        if (controller.reservation) {
            this.log(`房间被 ${controller.reservation.username} 预订，尝试占领`);
        }

        // 尝试占领控制器
        this.claimController(controller);
    }

    private claimController(controller: StructureController): void {
        const result = this.creep.claimController(controller);
        
        switch (result) {
            case OK:
                this.log('成功占领/维持控制器');
                break;
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#ffaa00', lineStyle: 'solid', opacity: 0.8 }
                });
                break;
            case ERR_INVALID_TARGET:
                this.log('无效的控制器目标');
                break;
            case ERR_FULL:
                this.log('控制器已满');
                break;
            case ERR_GCL_NOT_ENOUGH:
                this.log('GCL等级不足，无法占领更多房间');
                break;
            default:
                this.log(`占领控制器失败: ${result}`);
                break;
        }
    }

    protected onArrivedAtTarget(): void {
        super.onArrivedAtTarget();
        this.log('开始执行房间占领任务');
    }

    protected onNearDeath(): void {
        super.onNearDeath();
        this.log('占领者即将死亡，需要派遣继任者');
    }

    // 创建远程占领者的静态方法
    static spawn(spawn: StructureSpawn, targetRoom: string): ScreepsReturnCode {
        const name = `remoteClaimer_${Game.time}`;
        const body = RemoteClaimerRole.getOptimalBody(spawn);
        
        if (body.length === 0) {
            return ERR_NOT_ENOUGH_ENERGY;
        }
        
        return ExpeditionRole.spawnExpeditionCreep(
            spawn,
            name,
            body,
            targetRoom,
            MissionPhase.CLAIMING,
            ROLE_REMOTE_CLAIMER
        );
    }

    // 获取最佳身体配置 - 优先移动能力
    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyCapacityAvailable;
        
        const bodies = [
            // 高速配置：1 CLAIM + 5 MOVE = 850 能量 (平路1格/tick，沼泽2格/tick)
            { energy: 850, parts: [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE] },
            // 中速配置：1 CLAIM + 3 MOVE = 750 能量 (平路0.6格/tick，沼泽1.2格/tick) 
            { energy: 750, parts: [CLAIM, MOVE, MOVE, MOVE] },
            // 基本配置：1 CLAIM + 1 MOVE = 650 能量 (平路0.2格/tick，沼泽0.4格/tick)
            { energy: 650, parts: [CLAIM, MOVE] }
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                console.log(`远程占领者使用配置: ${bodyConfig.parts.join(',')} (${bodyConfig.energy} 能量)`);
                return bodyConfig.parts;
            }
        }
        
        // 能量不足，无法创建占领者
        return [];
    }
}