import {BuildController, OverseaTransportController, RepairController} from "./controller";
import {LinkController, TowerController} from "./army";
import {EVENT_LOOP_END, globalInfo, loopEventBus} from "./utils";
import {loop2} from "./controller/controller2";

export function loop() {
    globalInfo.canSpawn = true;
    // new SpawnAssistantController().run();
    loop2();
    // new HarvestController().run();
    // new ContainerTransferController().run();
    new BuildController().run();
    // new LinkStartController().run();
    // new LinkEndController().run();
    // new UpgradeController().run();
    new RepairController().run();
    // new TowerTransferController().run();
    new TowerController().run();
    // new StorageTransferController().run();
    // new SweepController().run();

    new OverseaTransportController().run();
    new LinkController().run();

    if (Game.time % 20 === 0) {
        lowFrequencyOperation();
    }

    loopEventBus.emit(EVENT_LOOP_END);
}

function lowFrequencyOperation() {
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log(`${name}已不存在，删除记忆`);
        }
    }
    if (Game.cpu.bucket >= 10_000) {
        const result = Game.cpu.generatePixel();
        console.log('=========================', '生产pixel', result, '=========================');
    }
}