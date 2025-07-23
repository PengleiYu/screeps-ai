import {ExpeditionRole} from "../core/ExpeditionRole";
import {MissionPhase} from "../core/ExpeditionStates";

export const ROLE_REMOTE_SCOUTER = 'remoteScouter';

export class RemoteScouterRole extends ExpeditionRole {

    protected onArrivedAtTarget(): void {
        super.onArrivedAtTarget();
        this.log('开始执行房间侦查任务');
    }

    protected onNearDeath(): void {
        super.onNearDeath();
        this.log('侦查者即将死亡，需要派遣继任者');
    }

    protected doWork(): void {
        // 侦查者不需要工作，站着就行
        const target = new RoomPosition(25, 25, this.creep.room.name);
        if (!this.creep.pos.isNearTo(target)) {
            this.creep.moveTo(target);
        }
    }

    static spawn(spawn: StructureSpawn, targetRoom: string): ScreepsReturnCode {
        const name = `${ROLE_REMOTE_SCOUTER}_${Game.time}`;
        const body = RemoteScouterRole.getOptimalBody(spawn);

        if (body.length === 0) {
            return ERR_NOT_ENOUGH_ENERGY;
        }

        return ExpeditionRole.spawnExpeditionCreep(
            spawn,
            name,
            body,
            targetRoom,
            MissionPhase.SCOUTING,
            ROLE_REMOTE_SCOUTER,
        );
    }

    static getOptimalBody(spawn: StructureSpawn): BodyPartConstant[] {
        const room = spawn.room;
        const availableEnergy = room.energyCapacityAvailable;

        const bodies = [
            {energy: 50 * 4, parts: [MOVE, MOVE, MOVE, MOVE,]},
        ];

        for (const bodyConfig of bodies) {
            if (availableEnergy >= bodyConfig.energy) {
                console.log(`远程侦查者使用配置: ${bodyConfig.parts.join(',')} (${bodyConfig.energy} 能量)`);
                return bodyConfig.parts;
            }
        }

        // 能量不足，无法创建侦查者
        return [];
    }
}