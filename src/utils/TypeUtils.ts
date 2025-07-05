export class TypeUtils {
    private static readonly VALID_MINERALS = new Set<MineralConstant>([
        RESOURCE_UTRIUM,
        RESOURCE_LEMERGIUM,
        RESOURCE_KEANIUM,
        RESOURCE_ZYNTHIUM,
        RESOURCE_OXYGEN,
        RESOURCE_HYDROGEN,
        RESOURCE_CATALYST,
    ]);

    static isMineralConstant(str: string): str is MineralConstant {
        return (this.VALID_MINERALS as Set<string>).has(str);
    }
}