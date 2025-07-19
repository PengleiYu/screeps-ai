import {getClosestCmpFun, getSpawn} from "./utils";
import {closestHurtStructure} from "./role/utils/findUtils";

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

        const needHealStructure = closestHurtStructure(getSpawn().pos)
        if (needHealStructure) {
            for (const tower of towerArr) {
                tower.repair(needHealStructure);
            }
        }
    }
}

export class LinkController {
    run() {
        const controller = getSpawn().room.controller;
        if (!controller) return;

        const linkArr = getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_LINK
        }).sort(getClosestCmpFun(getSpawn()));
        if (linkArr.length < 2) {
            return;
        }

        const startLink = linkArr[linkArr.length - 1];
        const endLink = linkArr[0];

        if (startLink.store.getFreeCapacity(RESOURCE_ENERGY) > 50
            && endLink.store.getFreeCapacity(RESOURCE_ENERGY) !== 0) {
            return;
        }

        if (startLink.cooldown) {
            console.log(startLink, '冷却剩余', startLink.cooldown);
            return;
        }
        const result = startLink.transferEnergy(endLink);
        console.log('Link传输', startLink, '->', endLink, ' ', result);
    }
}