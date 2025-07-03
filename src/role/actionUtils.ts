import {
    BuildAction,
    EnergyAction,
    HarvestAction,
    PickupAction,
    TransferAction,
    UpgradeAction,
    WithdrawAction
} from "./actions";
import {CanGetEnergy, CanPutEnergy, CanWork} from "../types";

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
