import {
    BuildController,
    WorkerController,
    HarvestController,
    RepairController,
    UpgradeController, TowerTransferController, ContainerTransferController, SpawnTransferController
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
    new SpawnTransferController().run();
    new ContainerTransferController().run();
    new BuildController().run();
    new UpgradeController().run();
    new RepairController().run();
    new TowerTransferController().run();
    new ArmyController().run();
    new ContainerTransferController().run();

    for (const key of Object.keys(Memory.creeps)) {
        if (!Game.creeps[key]) {
            console.log(`${key}已不存在，删除`);
            delete Memory.creeps[key];
        }
    }
}