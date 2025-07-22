import {closestHurtStructure} from "./role/utils/findUtils";
import {LinkManager} from "./link/LinkManager";
import {getRoomCenter} from "./utils/PositionUtils";

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

        let roomCenter = getRoomCenter(this.room);

        const needHealCreep = roomCenter.findClosestByRange(FIND_MY_CREEPS, {
            filter: it => it.hits < it.hitsMax
        });
        if (needHealCreep) {
            for (const tower of towerArr) {
                tower.heal(needHealCreep);
            }
            return;
        }

        const needHealStructure = closestHurtStructure(roomCenter)
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