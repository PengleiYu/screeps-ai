import {getSpawn} from "./utils";

export class TowerController {
    run() {
        const hostileCreep = getSpawn().room.find(FIND_HOSTILE_CREEPS)[0];
        const towerArr = getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        });
        if (hostileCreep) {
            for (const tower of towerArr) {
                tower.attack(hostileCreep);
            }
            return
        }

        const needHealCreep = getSpawn().pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: it => it.hits < it.hitsMax
        });
        if (needHealCreep) {
            for (const tower of towerArr) {
                tower.heal(needHealCreep);
            }
            return;
        }

        const needHealStructure = getSpawn().pos.findClosestByRange(FIND_STRUCTURES, {
            filter: it => (it.structureType !== STRUCTURE_WALL && it.hits < it.hitsMax),
        });
        if (needHealStructure) {
            for (const tower of towerArr) {
                tower.repair(needHealStructure);
            }
        }
    }
}