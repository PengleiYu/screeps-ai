import {
    BuildAction,
    EnergyAction,
    HarvestAction,
    PickupAction,
    TransferEnergyAction, TransferMineralAction,
    UpgradeAction,
    WithdrawEnergyAction
} from "./actionTypes";
import {CanGetSource, CanPutSource, CanWork} from "../types";

export function actionOfGetSource(creep: Creep, source: CanGetSource | null): EnergyAction<CanGetSource> {
    if (source instanceof Source || source instanceof Mineral) return new HarvestAction(creep, source);
    if (source instanceof Resource) return new PickupAction(creep, source);
    if (source instanceof Structure) return new WithdrawEnergyAction(creep, source);
    return EnergyAction.invalidInstance;
}

export function actionOfPutEnergy(creep: Creep, store: CanPutSource | null): EnergyAction<CanPutSource> {
    if (store) return new TransferEnergyAction(creep, store);
    return EnergyAction.invalidInstance;
}

export function actionOfPutMineral(creep: Creep, store: CanPutSource | null, mineralType: MineralConstant): EnergyAction<CanPutSource> {
    if (store) return new TransferMineralAction(creep, store, mineralType);
    return EnergyAction.invalidInstance;
}

export function actionOfWork(creep: Creep, work: CanWork | null): EnergyAction<CanWork> {
    if (work instanceof StructureController) return new UpgradeAction(creep, work);
    if (work instanceof ConstructionSite) return new BuildAction(creep, work);
    return EnergyAction.invalidInstance;
}

export function actionOfWork2(creep: Creep, work: CanWork | CanPutSource | null): EnergyAction<CanPutSource | CanWork> {
    if (!work) return EnergyAction.invalidInstance;
    if (work instanceof StructureController) return new UpgradeAction(creep, work);
    if (work instanceof ConstructionSite) return new BuildAction(creep, work);
    return new TransferEnergyAction(creep, work);
}