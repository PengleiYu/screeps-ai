import {EVENT_LOOP_END, globalInfo, loopEventBus} from "./utils";
import {runRoom} from "./controller/controller";
import {LinkManager} from "./link/LinkManager";
import {ExpeditionController} from "./expedition/ExpeditionController";
import {ExpeditionPathManager} from "./expedition/core/ExpeditionPathManager";
import {BodyConfigManager} from "./body/BodyConfigManager";


global.LinkManager = LinkManager;
global.ExpeditionController = ExpeditionController;
global.ExpeditionPathManager = ExpeditionPathManager;
global.BodyConfigManager = BodyConfigManager;

export function loop() {
    globalInfo.canSpawn = true;
    Object.values(Game.rooms).forEach(runRoom);

    // 运行远征系统
    ExpeditionController.run();

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

console.log('新代码推送成功', Game.time);