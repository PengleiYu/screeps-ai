import {EnergyAction, HarvestAction, TransferAction, WithdrawAction} from "./actions";
import {CanPutDown, CanWithdraw} from "../types";
import {
    closestCanPutDown,
    closestCanSpawn,
    closestSourceAndCanWithdrawNoSpawn,
    closestSource
} from "./findUtils";

// 最近可获取资源的地方，孵化建筑除外
export function sourceAndCanWithdrawAction(creep: Creep): EnergyAction<Source | CanWithdraw> | null {
    const where = closestSourceAndCanWithdrawNoSpawn(creep.pos);
    if (!where) return null;
    if (where instanceof Source) return new HarvestAction(creep, where);
    return new WithdrawAction(creep, where);
}

// 最近的孵化建筑
export function canSpawnAction(creep: Creep): EnergyAction<CanPutDown> | null {
    const result = closestCanSpawn(creep.pos);
    if (result) return new TransferAction(creep, result);
    return null;
}

// 最近的能量点
export function sourceAction(creep: Creep): EnergyAction<Source> | null {
    const source = closestSource(creep.pos);
    if (source) return new HarvestAction(creep, source);
    return null;
}

// 最近的可放置能量的地方
export function closestCanPutDownAction(creep: Creep): EnergyAction<CanPutDown> | null {
    const haveStore = closestCanPutDown(creep);
    if (haveStore) return new TransferAction(creep, haveStore);
    return null;
}