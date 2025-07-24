import {closestHurtStructure} from "./role/utils/findUtils";

export class TowerController {
    constructor(private room: Room) {
    }

    run() {
        const hostileCreep = this.room.find(FIND_HOSTILE_CREEPS)[0];
        const towerArr = this.room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        });
        if (hostileCreep) {
            for (const tower of towerArr) {
                tower.attack(hostileCreep);
            }
            return
        }

        let posController = this.room.controller?.pos;
        if (posController == null) return;

        const needHealCreep = posController.findClosestByRange(FIND_MY_CREEPS, {
            filter: it => it.hits < it.hitsMax
        });
        if (needHealCreep) {
            for (const tower of towerArr) {
                tower.heal(needHealCreep);
            }
            return;
        }

        const needHealStructure = closestHurtStructure(posController)
        if (needHealStructure) {
            for (const tower of towerArr) {
                tower.repair(needHealStructure);
            }
        }
    }
}