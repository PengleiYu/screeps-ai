// 远程占领角色 - 阶段1：占领目标房间控制器

import {ExpeditionRole} from '../core/ExpeditionRole';
import {MissionPhase} from '../core/ExpeditionStates';

export const ROLE_REMOTE_INVADER = 'remoteInvader';

export class RemoteInvaderRole extends ExpeditionRole {

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


        let pos = this.creep.pos;
        let hostileCreep = pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (hostileCreep != null) {
            this.attackCreep(hostileCreep);
            return;
        }

        // controller被敌人占领了
        if (!controller.my && controller.owner != null) {
            this.attackController(controller);
            return;
        }

        console.log('入侵者', this.creep.name, "没有敌对目标");
    }

    private attackController(controller: StructureController) {
        if (this.creep.attackController(controller) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(controller);
        }
    }

    private attackCreep(hostileCreep: Creep) {
        if (this.creep.attack(hostileCreep) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(hostileCreep);
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
        const name = `${ROLE_REMOTE_INVADER}_${Game.time}`;
        const body = RemoteInvaderRole.getOptimalBody(spawn);

        if (body.length === 0) {
            return ERR_NOT_ENOUGH_ENERGY;
        }

        return ExpeditionRole.spawnExpeditionCreep(
            spawn,
            name,
            body,
            targetRoom,
            MissionPhase.INVADING,
            ROLE_REMOTE_INVADER
        );
    }

    // 获取最佳身体配置 - 优先移动能力
    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyCapacityAvailable;

        const bodies = [
            {energy: 260, parts: [ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, TOUGH, TOUGH]},
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                console.log(`远程入侵者使用配置: ${bodyConfig.parts.join(',')} (${bodyConfig.energy} 能量)`);
                return bodyConfig.parts;
            }
        }

        // 能量不足，无法创建入侵者
        return [];
    }
}