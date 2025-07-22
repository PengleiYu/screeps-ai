// 远征路径规划和管理

export interface ExpeditionPath {
    rooms: string[];
    totalDistance: number;
    estimatedTicks: number;
    safetyLevel: number;
    cachedTick: number;
    waypoints?: string[];  // 指定的中继点
}

export class ExpeditionPathManager {
    private static readonly CACHE_TTL = 1000; // 缓存1000 tick

    private static get pathCache(): { [cacheKey: string]: ExpeditionPath } {
        if (!Memory.expeditionPathCache) {
            Memory.expeditionPathCache = {};
        }
        return Memory.expeditionPathCache;
    }

    private static set pathCache(cache: { [cacheKey: string]: ExpeditionPath }) {
        Memory.expeditionPathCache = cache;
    }

    static findPathToRoom(fromRoom: string, toRoom: string, waypoints?: string[]): ExpeditionPath | null {
        const waypointKey = waypoints ? waypoints.join('-') : '';
        const cacheKey = `${fromRoom}->${toRoom}${waypointKey ? `[${waypointKey}]` : ''}`;
        const cached = this.pathCache[cacheKey];
        
        // 检查缓存有效性
        if (cached && Game.time - cached.cachedTick < this.CACHE_TTL) {
            return cached;
        }

        let allRooms: string[] = [];
        let totalDistance = 0;
        
        if (waypoints && waypoints.length > 0) {
            // 使用waypoints分段计算路径
            const pathSegments = [fromRoom, ...waypoints, toRoom];
            allRooms.push(fromRoom); // 先添加起始房间
            
            for (let i = 0; i < pathSegments.length - 1; i++) {
                const startRoom = pathSegments[i];
                const endRoom = pathSegments[i + 1];
                
                const segmentRoute = Game.map.findRoute(startRoom, endRoom);
                if (segmentRoute === ERR_NO_PATH || !Array.isArray(segmentRoute)) {
                    console.log(`无法找到从 ${startRoom} 到 ${endRoom} 的路径`);
                    return null;
                }
                
                // Game.map.findRoute() 返回的路径不包含起始房间，只包含中间房间和目标房间
                // 添加路径中的所有房间（不包含起始房间，避免重复）
                const routeRooms = segmentRoute.map(step => step.room);
                allRooms.push(...routeRooms);
                totalDistance += segmentRoute.length;
                
                console.log(`路径段${i + 1}: ${startRoom} -> ${endRoom}, 经过房间: ${routeRooms.join(' -> ')}`);
            }
        } else {
            // 直接路径计算
            const route = Game.map.findRoute(fromRoom, toRoom);
            if (route === ERR_NO_PATH || !Array.isArray(route)) {
                return null;
            }
            
            allRooms = [fromRoom, ...route.map(step => step.room)];
            totalDistance = route.length;
        }

        const estimatedTicks = this.calculateTravelTime(totalDistance); // 智能估计移动时间
        
        // 评估路径安全性
        const safetyLevel = this.evaluatePathSafety(allRooms);

        const path: ExpeditionPath = {
            rooms: allRooms,
            totalDistance,
            estimatedTicks,
            safetyLevel,
            cachedTick: Game.time,
            waypoints
        };

        const cache = this.pathCache;
        cache[cacheKey] = path;
        this.pathCache = cache;
        return path;
    }

    // 计算移动时间（基于高速Claimer配置）
    private static calculateTravelTime(roomDistance: number): number {
        // 假设平均每房间50格，使用高速Claimer配置
        const averageDistancePerRoom = 50;
        const totalDistance = roomDistance * averageDistancePerRoom;
        
        // 使用高速Claimer配置 (1 CLAIM + 5 MOVE = 1.0格/tick)
        // 考虑实际地形和路径曲折，增加15%缓冲
        const highSpeedWithBuffer = 1.15;
        
        return Math.ceil(totalDistance * highSpeedWithBuffer);
    }

    // 获取不同身体配置的预估移动时间
    static estimateTravelTimeForBodyType(roomDistance: number, bodyType: 'claimer' | 'upgrader' | 'builder'): string {
        const averageDistancePerRoom = 50;
        const totalDistance = roomDistance * averageDistancePerRoom;
        
        let speeds: { [key: string]: number } = {};
        
        switch (bodyType) {
            case 'claimer':
                speeds = {
                    '高速(5MOVE)': 1.0,  // 1 CLAIM + 5 MOVE = 平路1.0格/tick
                    '中速(3MOVE)': 0.6,  // 1 CLAIM + 3 MOVE = 平路0.6格/tick  
                    '基本(1MOVE)': 0.2   // 1 CLAIM + 1 MOVE = 平路0.2格/tick
                };
                break;
            case 'upgrader':
                speeds = {
                    '高速(6MOVE)': 1.0,
                    '中速(4MOVE)': 0.67,
                    '基本(3MOVE)': 0.6,
                    '最低(2MOVE)': 0.5
                };
                break;
            case 'builder':
                speeds = {
                    '高速(7MOVE)': 1.0,
                    '中速(5MOVE)': 0.8,
                    '基本(4MOVE)': 0.75,
                    '最低(3MOVE)': 0.6
                };
                break;
        }
        
        let result = `${bodyType}移动时间估算:\n`;
        for (const [config, speed] of Object.entries(speeds)) {
            const travelTime = Math.ceil(totalDistance / speed);
            const workTime = Math.max(0, 1500 - travelTime); // 剩余工作时间
            result += `  ${config}: ${travelTime}tick到达, 工作${workTime}tick\n`;
        }
        
        return result;
    }

    // 验证Claimer是否能够完成远征任务
    static validateClaimerMission(roomDistance: number): { canComplete: boolean; travelTime: number; workTime: number; recommendation: string } {
        const averageDistancePerRoom = 50;
        const totalDistance = roomDistance * averageDistancePerRoom;
        const claimerLifetime = 600;
        
        // 使用高速Claimer配置计算 (1 CLAIM + 5 MOVE)
        const highSpeedTravelTime = Math.ceil(totalDistance / 1.0 * 1.15); // 15%缓冲
        const highSpeedWorkTime = claimerLifetime - highSpeedTravelTime;
        
        // 判断是否可行 (需要至少50tick工作时间)
        const canComplete = highSpeedWorkTime >= 50;
        
        let recommendation = '';
        if (!canComplete) {
            const maxDistance = Math.floor((claimerLifetime - 50) / (averageDistancePerRoom * 1.15));
            recommendation = `建议选择距离不超过${maxDistance}房间的目标`;
        } else if (highSpeedWorkTime < 150) {
            recommendation = '距离较远，建议使用高能量房间确保能生产高速Claimer';
        } else {
            recommendation = '距离合适，Claimer可以顺利完成任务';
        }
        
        return {
            canComplete,
            travelTime: highSpeedTravelTime,
            workTime: highSpeedWorkTime,
            recommendation
        };
    }

    // 验证路径的完整性和正确性
    static validatePath(path: ExpeditionPath): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!path.rooms || path.rooms.length === 0) {
            errors.push('路径房间列表为空');
            return { isValid: false, errors };
        }
        
        // 检查房间名称格式
        for (const roomName of path.rooms) {
            if (!/^[EW]\d+[NS]\d+$/.test(roomName)) {
                errors.push(`无效的房间名称格式: ${roomName}`);
            }
        }
        
        // 检查相邻房间是否真的相邻
        for (let i = 0; i < path.rooms.length - 1; i++) {
            const current = path.rooms[i];
            const next = path.rooms[i + 1];
            
            if (!this.areRoomsAdjacent(current, next)) {
                errors.push(`房间 ${current} 和 ${next} 不相邻`);
            }
        }
        
        // 检查是否有重复的房间（除了起始和结束房间）
        const roomCounts = new Map<string, number>();
        for (const room of path.rooms) {
            roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
        }
        
        for (const [room, count] of roomCounts.entries()) {
            if (count > 1 && room !== path.rooms[0] && room !== path.rooms[path.rooms.length - 1]) {
                errors.push(`房间 ${room} 在路径中重复出现 ${count} 次`);
            }
        }
        
        return { isValid: errors.length === 0, errors };
    }

    // 检查两个房间是否相邻
    private static areRoomsAdjacent(room1: string, room2: string): boolean {
        if (room1 === room2) return false;
        
        const parseRoom = (roomName: string) => {
            const match = roomName.match(/^([EW])(\d+)([NS])(\d+)$/);
            if (!match) return null;
            return {
                x: (match[1] === 'W' ? -1 : 1) * parseInt(match[2]),
                y: (match[3] === 'S' ? -1 : 1) * parseInt(match[4])
            };
        };
        
        const pos1 = parseRoom(room1);
        const pos2 = parseRoom(room2);
        
        if (!pos1 || !pos2) return false;
        
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    // 比较不同路径选项的安全性
    static comparePathOptions(fromRoom: string, toRoom: string, waypointOptions: string[][]): void {
        console.log(`=== 路径选项比较: ${fromRoom} -> ${toRoom} ===`);
        
        // 直接路径
        const directPath = this.findPathToRoom(fromRoom, toRoom);
        if (directPath) {
            console.log(`📍 直接路径:`);
            console.log(`  房间序列: ${directPath.rooms.join(' -> ')}`);
            console.log(`  距离: ${directPath.totalDistance} 房间`);
            console.log(`  预估时间: ${directPath.estimatedTicks} tick`);
            console.log(`  安全等级: ${directPath.safetyLevel}/100`);
        }
        
        // 各种waypoint路径
        waypointOptions.forEach((waypoints, index) => {
            const path = this.findPathToRoom(fromRoom, toRoom, waypoints);
            if (path) {
                console.log(`🛤️ 路径选项${index + 1} (经由 ${waypoints.join(' -> ')}):`);
                console.log(`  房间序列: ${path.rooms.join(' -> ')}`);
                console.log(`  距离: ${path.totalDistance} 房间`);
                console.log(`  预估时间: ${path.estimatedTicks} tick`);
                console.log(`  安全等级: ${path.safetyLevel}/100`);
            } else {
                console.log(`❌ 路径选项${index + 1} 无效`);
            }
        });
    }

    private static evaluatePathSafety(rooms: string[]): number {
        // TODO: 实现更智能的安全性评估
        // 可以根据以下因素评估：
        // - 是否经过已知的敌对玩家房间
        // - 房间是否有防御设施
        // - 历史攻击记录
        // - 房间控制者信息等
        
        return 80; // 默认返回较高安全等级
    }

    static getNextRoomInPath(currentRoom: string, targetRoom: string, waypoints?: string[]): string | null {
        const path = this.findPathToRoom(currentRoom, targetRoom, waypoints);
        if (!path) return null;

        const currentIndex = path.rooms.indexOf(currentRoom);
        if (currentIndex === -1 || currentIndex >= path.rooms.length - 1) {
            return null;
        }

        return path.rooms[currentIndex + 1];
    }

    static clearCache(): void {
        this.pathCache = {};
        console.log('ExpeditionPathManager: 路径缓存已清理');
    }

    // 清理过期缓存
    static cleanExpiredCache(): void {
        const cache = this.pathCache;
        let cleanedCount = 0;
        
        for (const cacheKey in cache) {
            const path = cache[cacheKey];
            if (Game.time - path.cachedTick >= this.CACHE_TTL) {
                delete cache[cacheKey];
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.pathCache = cache;
            console.log(`ExpeditionPathManager: 清理了 ${cleanedCount} 个过期缓存条目`);
        }
    }

    static printPathInfo(fromRoom: string, toRoom: string, waypoints?: string[]): void {
        const path = this.findPathToRoom(fromRoom, toRoom, waypoints);
        if (path) {
            console.log(`路径 ${fromRoom} -> ${toRoom}:`);
            if (waypoints && waypoints.length > 0) {
                console.log(`  指定中继点: ${waypoints.join(' -> ')}`);
            }
            console.log(`  房间序列: ${path.rooms.join(' -> ')}`);
            console.log(`  总距离: ${path.totalDistance} 房间`);
            console.log(`  保守预估时间: ${path.estimatedTicks} tick`);
            console.log(`  安全等级: ${path.safetyLevel}/100`);
            
            // 验证路径
            const validation = this.validatePath(path);
            if (validation.isValid) {
                console.log(`  ✅ 路径验证: 通过`);
            } else {
                console.log(`  ❌ 路径验证: 失败`);
                for (const error of validation.errors) {
                    console.log(`    - ${error}`);
                }
            }
            
            console.log(`\n移动时间分析:`);
            console.log(this.estimateTravelTimeForBodyType(path.totalDistance, 'claimer'));
            console.log(this.estimateTravelTimeForBodyType(path.totalDistance, 'upgrader'));
            console.log(this.estimateTravelTimeForBodyType(path.totalDistance, 'builder'));
        } else {
            const waypointStr = waypoints && waypoints.length > 0 ? ` (经由 ${waypoints.join(' -> ')})` : '';
            console.log(`无法找到从 ${fromRoom} 到 ${toRoom} 的路径${waypointStr}`);
        }
    }
}