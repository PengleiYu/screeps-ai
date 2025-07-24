export class SpawnPlaceHelper {

    public placeSpawnConstructionSite(room: Room | null): void {
        if (!room || !room.controller) return;

        // 找到所有能量矿
        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) {
            console.log('房间没有能量矿，无法规划Spawn位置');
            return;
        }

        // 寻找最佳Spawn位置：能量矿附近且能到达控制器
        const bestPosition = this.findOptimalSpawnPosition(room, sources, room.controller);

        if (bestPosition) {
            const result = room.createConstructionSite(bestPosition, STRUCTURE_SPAWN);
            if (result === OK) {
                console.log(`成功放置Spawn建设点在能量矿附近 (${bestPosition.x}, ${bestPosition.y})`);
            } else {
                console.log(`放置Spawn建设点失败: ${result}`);
            }
        } else {
            console.log('未找到合适的Spawn建设位置');
        }
    }

    // 寻找最优Spawn位置：平衡能量矿距离和控制器距离
    private findOptimalSpawnPosition(room: Room, sources: Source[], controller: StructureController): RoomPosition | null {
        const candidates: { pos: RoomPosition; score: number }[] = [];

        // 遍历所有能量矿周围的位置
        for (const source of sources) {
            const sourcePos = source.pos;

            // 检查能量矿周围合理范围（5-10格）的位置
            for (let distance = 5; distance <= 10; distance++) {
                for (let dx = -distance; dx <= distance; dx++) {
                    for (let dy = -distance; dy <= distance; dy++) {
                        // 跳过距离不符合的位置
                        if (Math.abs(dx) + Math.abs(dy) !== distance) continue;

                        const x = sourcePos.x + dx;
                        const y = sourcePos.y + dy;

                        // 检查坐标是否在房间范围内
                        if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                        const pos = new RoomPosition(x, y, room.name);

                        // 检查位置是否可用
                        if (!this.isValidSpawnPosition(room, pos)) continue;

                        // 计算位置评分
                        const score = this.calculateSpawnPositionScore(pos, sources, controller);
                        candidates.push({pos, score});
                    }
                }
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // 按评分排序，选择最佳位置
        candidates.sort((a, b) => b.score - a.score);

        console.log(`找到${candidates.length}个候选Spawn位置，最佳位置评分: ${candidates[0].score.toFixed(2)}`);
        return candidates[0].pos;
    }

    // 检查位置是否适合建造Spawn
    private isValidSpawnPosition(room: Room, pos: RoomPosition): boolean {
        // 检查地形是否可建造
        const terrain = room.getTerrain().get(pos.x, pos.y);
        if (terrain === TERRAIN_MASK_WALL) return false;

        // 检查是否有其他建筑或建设点
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (structures.length > 0 || sites.length > 0) return false;

        // 基本边缘安全检查 - 至少距离边缘2格
        const edgeDistance = Math.min(pos.x, pos.y, 49 - pos.x, 49 - pos.y);
        if (edgeDistance < 2) return false;

        // 基本地形质量检查 - 周围1格内不能全是沼泽或墙壁
        let plainCount = 0;
        let wallCount = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                    const localTerrain = room.getTerrain().get(x, y);
                    if (localTerrain === 0) { // 平地
                        plainCount++;
                    } else if (localTerrain === TERRAIN_MASK_WALL) { // 墙壁
                        wallCount++;
                    }
                }
            }
        }

        // 周围至少要有3个平地位置（包括自己）
        if (plainCount < 3) return false;

        // 完全避免紧邻墙壁 - 周围1格内不能有任何墙壁
        return wallCount <= 0;
    }

    // 计算Spawn位置评分（分数越高越好）
    private calculateSpawnPositionScore(pos: RoomPosition, sources: Source[], controller: StructureController): number {
        let score = 0;

        // 1. 到最近能量矿的实际路径距离（权重70%）- 距离适中分数最高
        let minSourcePathDistance = Infinity;
        let minSourceLinearDistance = Infinity;

        for (const source of sources) {
            // 计算实际路径距离
            const pathResult = PathFinder.search(pos, {pos: source.pos, range: 1}, {
                roomCallback: (roomName) => {
                    const room = Game.rooms[roomName];
                    if (!room) return false;
                    return this.createCostMatrix(room);
                },
                maxRooms: 1 // 限制在当前房间内
            });

            if (!pathResult.incomplete) {
                const pathDistance = pathResult.path.length;
                minSourcePathDistance = Math.min(minSourcePathDistance, pathDistance);
            }

            // 备用：直线距离（如果路径查找失败）
            const linearDistance = pos.getRangeTo(source);
            minSourceLinearDistance = Math.min(minSourceLinearDistance, linearDistance);
        }

        // 优先使用路径距离，如果不可达则使用直线距离并严重扣分
        let actualDistance = minSourcePathDistance;
        let pathPenalty = 1; // 无惩罚

        if (minSourcePathDistance === Infinity) {
            // 路径不可达，使用直线距离并严重扣分
            actualDistance = minSourceLinearDistance;
            pathPenalty = 0.3; // 严重扣分
            console.log(`位置(${pos.x},${pos.y})到能量矿路径不可达，直线距离${minSourceLinearDistance}`);
        }

        // 5-10格路径距离最优，11-15格次优
        let sourceScore: number;
        if (actualDistance >= 5 && actualDistance <= 10) {
            sourceScore = 10; // 最优距离
        } else if (actualDistance >= 11 && actualDistance <= 15) {
            sourceScore = 8; // 次优距离
        } else if (actualDistance < 5) {
            sourceScore = Math.max(0, actualDistance); // 太近扣分
        } else {
            sourceScore = Math.max(0, 20 - actualDistance); // 太远扣分
        }

        sourceScore *= pathPenalty; // 应用路径惩罚
        score += sourceScore * 0.7;

        // 2. 到控制器的实际路径距离（权重20%）
        const controllerPathResult = PathFinder.search(pos, {pos: controller.pos, range: 3}, {
            maxRooms: 1,
            roomCallback: (roomName) => {
                const room = Game.rooms[roomName];
                if (!room) return false;
                return this.createCostMatrix(room);
            }
        });

        const controllerDistance = controllerPathResult.incomplete ?
            pos.getRangeTo(controller) * 1.5 : // 路径不可达时惩罚
            controllerPathResult.path.length;

        const controllerScore = Math.max(0, 20 - controllerDistance);
        score += controllerScore * 0.2;

        // 3. 到多个能量矿的平均路径距离（权重10%）
        let totalPathDistance = 0;
        let reachableSourceCount = 0;

        for (const source of sources) {
            const pathResult = PathFinder.search(pos, {pos: source.pos, range: 1}, {maxRooms: 1});
            if (!pathResult.incomplete) {
                totalPathDistance += pathResult.path.length;
                reachableSourceCount++;
            }
        }

        if (reachableSourceCount > 0) {
            const avgPathDistance = totalPathDistance / reachableSourceCount;
            const avgScore = Math.max(0, 18 - avgPathDistance);
            score += avgScore * 0.05; // 降低权重给其他因素让路
        }

        // 4. 房间中心位置偏好（权重10%）- 靠近中心更安全稳定
        const roomCenter = new RoomPosition(25, 25, pos.roomName);
        const distanceToCenter = pos.getRangeTo(roomCenter);
        const centerScore = Math.max(0, 20 - distanceToCenter); // 距离中心越近分数越高
        score += centerScore * 0.1;

        // 5. 边缘安全性（权重10%）- 避免贴边和角落
        const edgeDistance = Math.min(pos.x, pos.y, 49 - pos.x, 49 - pos.y);
        let edgeScore: number;
        if (edgeDistance >= 5) {
            edgeScore = 10; // 距离边缘5格以上，很安全
        } else if (edgeDistance >= 3) {
            edgeScore = 7; // 距离边缘3-4格，比较安全
        } else if (edgeDistance >= 2) {
            edgeScore = 4; // 距离边缘2格，勉强可接受
        } else {
            edgeScore = 0; // 距离边缘1格或贴边，不安全
        }
        score += edgeScore * 0.1;

        // 6. 周围地形质量（权重5%）- 避免被沼泽和墙壁包围
        const terrainQuality = this.evaluateLocalTerrain(pos);
        score += terrainQuality * 0.05;

        return score;
    }

    private createCostMatrix(room: Room) {
        const costs = new PathFinder.CostMatrix();
        // 将墙壁设为不可通行
        const terrain = room.getTerrain();
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    costs.set(x, y, 255);
                }
            }
        }
        // 将现有建筑设为不可通行（除了道路）
        room.find(FIND_STRUCTURES).forEach(structure => {
            if (structure.structureType !== STRUCTURE_ROAD &&
                structure.structureType !== STRUCTURE_CONTAINER &&
                structure.structureType !== STRUCTURE_RAMPART) {
                let pos = structure.pos;
                costs.set(pos.x, pos.y, 255);
            }
        });
        return costs;
    }

// 评估位置周围的地形质量
    private evaluateLocalTerrain(pos: RoomPosition): number {
        const room = Game.rooms[pos.roomName];
        if (!room) return 0;

        const terrain = room.getTerrain();
        let score = 0;
        let totalPositions = 0;

        // 检查周围2格范围的地形
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const x = pos.x + dx;
                const y = pos.y + dy;

                // 确保在房间范围内
                if (x < 0 || x > 49 || y < 0 || y > 49) continue;

                const terrainType = terrain.get(x, y);
                totalPositions++;

                // 根据地形类型给分
                if (terrainType === 0) {
                    score += 3; // 平地最好
                } else if (terrainType === TERRAIN_MASK_SWAMP) {
                    score += 1; // 沼泽可接受但不理想
                } else if (terrainType === TERRAIN_MASK_WALL) {
                    score -= 1; // 墙壁不好，还要扣分
                }
            }
        }

        // 计算平均地形质量（可能为负到3分）
        const avgTerrainQuality = totalPositions > 0 ? score / totalPositions : 0;

        // 转换为0-10分制，确保不为负
        const normalizedScore = Math.max(0, (avgTerrainQuality + 1) / 4); // 将-1到3的范围映射到0-1
        return normalizedScore * 10;
    }

}