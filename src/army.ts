import {getClosestCmpFun, getMainSpawn} from "./utils";
import {closestHurtStructure} from "./role/utils/findUtils";
import {LinkManager} from "./link/LinkManager";

export class TowerController {
    run() {
        const hostileCreep = getMainSpawn().room.find(FIND_HOSTILE_CREEPS)[0];
        const towerArr = getMainSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        });
        if (hostileCreep) {
            for (const tower of towerArr) {
                tower.attack(hostileCreep);
            }
            return
        }

        const needHealCreep = getMainSpawn().pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: it => it.hits < it.hitsMax
        });
        if (needHealCreep) {
            for (const tower of towerArr) {
                tower.heal(needHealCreep);
            }
            return;
        }

        const needHealStructure = closestHurtStructure(getMainSpawn().pos)
        if (needHealStructure) {
            for (const tower of towerArr) {
                tower.repair(needHealStructure);
            }
        }
    }
}

export class LinkController {
    run() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                LinkManager.manageLinkNetwork(roomName);
            }
        }
    }
}