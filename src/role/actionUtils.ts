import {
    BuildAction,
    EnergyAction,
    HarvestAction,
    PickupAction,
    TransferAction,
    UpgradeAction,
    WithdrawAction
} from "./actions";
import {CanGetEnergy, CanHarvest, CanPickup, CanPutEnergy, CanWithdraw, CanWork} from "../types";
import {
    closestCanPutDown,
    closestCanSpawn,
    closestSourceAndCanWithdrawNoSpawn,
    closestSource
} from "./findUtils";

export function actionOfGetEnergy(creep: Creep, source: CanGetEnergy | null): EnergyAction<CanGetEnergy> {
    if (source instanceof Source) return new HarvestAction(creep, source);
    if (source instanceof Resource) return new PickupAction(creep, source);
    if (source instanceof Structure) return new WithdrawAction(creep, source);
    return EnergyAction.invalidInstance;
}

export function actionOfPutEnergy(creep: Creep, store: CanPutEnergy | null): EnergyAction<CanPutEnergy> {
    if (store) return new TransferAction(creep, store);
    return EnergyAction.invalidInstance;
}

export function actionOfWork(creep: Creep, work: CanWork | null): EnergyAction<CanWork> {
    if (work instanceof StructureController) return new UpgradeAction(creep, work);
    if (work instanceof ConstructionSite) return new BuildAction(creep, work);
    return EnergyAction.invalidInstance;
}

// 最近可获取资源的地方，孵化建筑除外
export function sourceAndCanWithdrawAction(creep: Creep): EnergyAction<Source | CanWithdraw> | null {
    const where = closestSourceAndCanWithdrawNoSpawn(creep.pos);
    if (!where) return null;
    if (where instanceof Source) return new HarvestAction(creep, where);
    return new WithdrawAction(creep, where);
}

// 最近的可放置能量的地方
export function closestCanPutDownAction(creep: Creep): EnergyAction<CanPutEnergy> | null {
    const haveStore = closestCanPutDown(creep.pos);
    if (haveStore) return new TransferAction(creep, haveStore);
    return null;
}