import {
    BuildController,
    ContainerTransferController,
    HarvestController, OverseaTransportController,
    RepairController, SpawnAssistantController,
    SpawnTransferController, StorageTransferController,
    TowerTransferController,
    UpgradeController
} from "./controller";
import {TowerController} from "./army";
import {globalInfo} from "./utils";

declare global {

    interface CreepMemory {
        role?: string,
        working?: boolean;
        workState?: string;
    }
}

export function loop() {
    globalInfo.canSpawn = true;
    new SpawnAssistantController().run();
    new HarvestController().run();
    new SpawnTransferController().run();
    new ContainerTransferController().run();
    new BuildController().run();
    new UpgradeController().run();
    new RepairController().run();
    new TowerTransferController().run();
    new TowerController().run();
    new ContainerTransferController().run();
    new StorageTransferController().run();
    new OverseaTransportController().run();

    for (const key of Object.keys(Memory.creeps)) {
        if (!Game.creeps[key]) {
            console.log(`${key}已不存在，删除`);
            delete Memory.creeps[key];
        }
    }
}