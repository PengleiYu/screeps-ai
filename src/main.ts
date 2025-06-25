import {
    BuildController,
    Controller,
    HarvestController,
    RepairController,
    TransferController,
    UpgradeController
} from "./controller";

declare global {

    interface CreepMemory {
        working: boolean;
        workState: string;
    }
}

export function loop() {
    Controller.spawnIfNotExist = true;
    new HarvestController().run();
    new TransferController().run();
    new BuildController().run();
    new UpgradeController().run();
    new RepairController().run();
}