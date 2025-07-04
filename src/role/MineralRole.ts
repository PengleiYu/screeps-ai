import {MemoryRole} from "./role2";
import {assertIsDefined} from "../utils";
import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutMineral} from "./actionUtils";

export abstract class MineralRole extends MemoryRole {
    protected canWork2Action(canWork: CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        return actionOfPutMineral(this.creep, canWork, this.getSourceType());
    }

    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, canGet);
    }

    protected getSourceType(): MineralConstant {
        const sourceType = this.creep.memory.sourceType;
        assertIsDefined(sourceType);
        return sourceType;
    }
}