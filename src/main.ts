import {
    BuildController,
    WorkerController,
    HarvestController,
    RepairController,
    TransferController,
    UpgradeController, TowerTransferController
} from "./controller";
import {ArmyController} from "./army";

declare global {

    interface CreepMemory {
        working: boolean;
        workState: string;
    }
}

export function loop() {
    WorkerController.spawnIfNotExist = true;
    new HarvestController().run();
    new TransferController().run();
    new BuildController().run();
    new UpgradeController().run();
    new RepairController().run();
    new TowerTransferController().run();
    new ArmyController().run();
}