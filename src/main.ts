import {
    BuildController,
    ContainerTransferController,
    HarvestController, LinkEndController, LinkStartController, OverseaTransportController,
    RepairController, SpawnAssistantController,
    StorageTransferController, SweepController,
    TowerTransferController,
    UpgradeController
} from "./controller";
import {LinkController, TowerController} from "./army";
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
    new ContainerTransferController().run();
    new BuildController().run();
    new LinkStartController().run();
    new LinkEndController().run();
    new UpgradeController().run();
    new RepairController().run();
    new TowerTransferController().run();
    new TowerController().run();
    new ContainerTransferController().run();
    new StorageTransferController().run();
    new SweepController().run();

    new OverseaTransportController().run();
    new LinkController().run();

    if (Game.time % 20 === 0) {
        for (let name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log(`${name}已不存在，删除记忆`);
            }
        }
    }
}