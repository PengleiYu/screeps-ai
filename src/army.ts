import {getSpawn} from "./utils";

export class ArmyController {
    run() {
        const hostileCreep = getSpawn().room.find(FIND_HOSTILE_CREEPS)[0];
        if (!hostileCreep) return;
        const towerArr = getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        });
        for (const tower of towerArr) {
            tower.attack(hostileCreep);
        }
    }
}