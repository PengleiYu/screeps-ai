import {EnergyProviderForWork} from "../../types";
import {curry} from "../../utils/curryUtils";

interface ScoreObj {
    target: EnergyProviderForWork,
    score: number,
}

// 简化的配置接口
interface EnergySearchConfig {
    findConstant: FindConstant;
    filter: (obj: any, minEnergy: number) => boolean;
}

// ⚠️ 配置映射：如果EnergyProviderForWork新增类型，请在这里添加对应的查找配置
// 这个数组的完整性需要手动维护，但提供了集中管理的便利
const ENERGY_PROVIDER_SEARCH_CONFIGS: EnergySearchConfig[] = [
    {
        findConstant: FIND_STRUCTURES,
        filter: (s: AnyStructure, minEnergy: number) =>
            (s instanceof StructureContainer || s instanceof StructureStorage || s instanceof StructureLink) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
    },
    {
        findConstant: FIND_TOMBSTONES,
        filter: (t: Tombstone, minEnergy: number) => t.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
    },
    {
        findConstant: FIND_RUINS,
        filter: (r: Ruin, minEnergy: number) => r.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
    },
    {
        findConstant: FIND_DROPPED_RESOURCES,
        filter: (r: Resource, minEnergy: number) => r.resourceType === RESOURCE_ENERGY && r.amount >= minEnergy
    },
    {
        findConstant: FIND_SOURCES,
        filter: (s: Source, minEnergy: number) => s.energy >= minEnergy
    }
];
// 按FindConstant分组以减少重复查找
let _findConstantGroupsCache: Map<FindConstant, EnergySearchConfig[]> | null = null;

function getFindConstantGroups(): Map<FindConstant, EnergySearchConfig[]> {
    if (!_findConstantGroupsCache) {
        const map = new Map<FindConstant, EnergySearchConfig[]>();
        ENERGY_PROVIDER_SEARCH_CONFIGS.forEach(config => {
            if (!map.has(config.findConstant)) map.set(config.findConstant, []);
            map.get(config.findConstant)!.push(config);
        });
        _findConstantGroupsCache = map;
    }
    return _findConstantGroupsCache;
}

export function closestEnergyProviderForWork(pos: RoomPosition, minEnergy: number = 1): EnergyProviderForWork | null {
    // 先在附近快速搜索
    const defaultRange = 15;
    const nearbyResult = searchInRange(pos, minEnergy, defaultRange);
    if (nearbyResult) return nearbyResult;

    console.log(`⚠️ ${pos} ${defaultRange}格内未找到能量源(minEnergy:${minEnergy})，使用全房间搜索`);

    const candidates: EnergyProviderForWork[] = [];
    // 对每个FindConstant执行一次查找
    getFindConstantGroups().forEach((configs, findConstant) => {
        const result = pos.findClosestByPath(findConstant, {
            filter: (obj) => {
                return configs.some(config => config.filter(obj, minEnergy));
            }
        });
        if (result) candidates.push(result as EnergyProviderForWork);
    });

    let result = pos.findClosestByPath(candidates);

    if (result) {
        const energy = getEnergyAmount(result);
        const distance = pos.getRangeTo(result.pos);
        console.log(`🔍 ${pos} 全房间搜索找到: `, result, ` 能量:${energy} 距离:${distance}`);
    } else {
        console.log(`❌ ${pos} 房间内未找到任何符合条件的能量源(minEnergy:${minEnergy})`);
    }

    return result;
}

// 全量扫描，大range性能会较差
function searchInRange(pos: RoomPosition, minEnergy: number = 0, range: number): EnergyProviderForWork | null {
    const candidates: Array<ScoreObj> = [];
    let calculateScore = curry(calculateEnergyProviderScore)(pos)(minEnergy);

    // 对每个FindConstant执行一次查找
    getFindConstantGroups().forEach((configs, findConstant) => {
        pos.findInRange(findConstant, range, {
            filter: (obj) => {
                return configs.some(config => config.filter(obj, minEnergy));
            }
        })
            .forEach(it => {
                let score = calculateScore(it as EnergyProviderForWork);
                if (score != null) {
                    candidates.push({target: it as EnergyProviderForWork, score: score});
                }
            })
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].target;
}

// 获取能量数量的辅助函数
function getEnergyAmount(provider: EnergyProviderForWork): number {
    if (provider instanceof Resource) return provider.amount;
    if (provider instanceof Source) return provider.energy;
    if (provider instanceof StructureContainer || provider instanceof StructureStorage || provider instanceof StructureLink || provider instanceof Tombstone || provider instanceof Ruin) {
        return provider.store.getUsedCapacity(RESOURCE_ENERGY);
    }
    // 编译时检查：如果新增类型但未处理，这里会报错
    return provider;
}

// 获取类型权重的辅助函数，存活时间短的优先
function getTypeWeight(provider: EnergyProviderForWork): number {
    if (provider instanceof Resource) return 10;          // Resource
    if (provider instanceof Tombstone) return 8;         // Tombstone
    if (provider instanceof Ruin) return 8;              // Ruin
    if (provider instanceof StructureContainer) return 6; // Container其次
    if (provider instanceof StructureLink) return 4;     // Link
    if (provider instanceof StructureStorage) return 4; // Storage
    if (provider instanceof Source) return 2;            // Source； 挖矿最慢，放最后

    // 编译时检查：如果新增类型但未处理，这里会报错
    return provider;
}

/**
 * 计算能量提供者的综合评分
 * @param pos 目标位置
 * @param minEnergy 能量下限
 * @param provider 能量提供者
 * @returns 综合评分，分数越高越优先
 */
function calculateEnergyProviderScore(pos: RoomPosition, minEnergy: number, provider: EnergyProviderForWork): number | null {
    let energyAmount = getEnergyAmount(provider);
    if (energyAmount < minEnergy) {
        return null;
    }
    const typeWeight = getTypeWeight(provider);
    const energyScore = Math.min(energyAmount / 100, 10); // 压低能量分数：防止远距离的storage分数过大
    const distancePenalty = Math.max(1, provider.pos.getRangeTo(pos)); // 距离惩罚：每格距离扣2分

    // 综合评分公式：类型权重 + 能量分数 - 距离惩罚
    return typeWeight * energyScore / distancePenalty;
}