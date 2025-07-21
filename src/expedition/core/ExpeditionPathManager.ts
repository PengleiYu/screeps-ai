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
    private static pathCache = new Map<string, ExpeditionPath>();
    private static readonly CACHE_TTL = 1000; // 缓存1000 tick

    static findPathToRoom(fromRoom: string, toRoom: string, waypoints?: string[]): ExpeditionPath | null {
        const waypointKey = waypoints ? waypoints.join('-') : '';
        const cacheKey = `${fromRoom}->${toRoom}${waypointKey ? `[${waypointKey}]` : ''}`;
        const cached = this.pathCache.get(cacheKey);
        
        // 检查缓存有效性
        if (cached && Game.time - cached.cachedTick < this.CACHE_TTL) {
            return cached;
        }

        let allRooms: string[] = [];
        let totalDistance = 0;
        
        if (waypoints && waypoints.length > 0) {
            // 使用waypoints分段计算路径
            const pathSegments = [fromRoom, ...waypoints, toRoom];
            
            for (let i = 0; i < pathSegments.length - 1; i++) {
                const segmentRoute = Game.map.findRoute(pathSegments[i], pathSegments[i + 1]);
                if (segmentRoute === ERR_NO_PATH || !Array.isArray(segmentRoute)) {
                    console.log(`无法找到从 ${pathSegments[i]} 到 ${pathSegments[i + 1]} 的路径`);
                    return null;
                }
                
                // 第一段包含起始房间，其他段不包含起始点避免重复
                if (i === 0) {
                    allRooms.push(...[pathSegments[i], ...segmentRoute.map(step => step.room)]);
                } else {
                    allRooms.push(...segmentRoute.map(step => step.room));
                }
                totalDistance += segmentRoute.length;
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

        const estimatedTicks = totalDistance * 50; // 保守估计每房间50 tick
        
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

        this.pathCache.set(cacheKey, path);
        return path;
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
        this.pathCache.clear();
        console.log('ExpeditionPathManager: 路径缓存已清理');
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
            console.log(`  预估时间: ${path.estimatedTicks} tick`);
            console.log(`  安全等级: ${path.safetyLevel}/100`);
        } else {
            const waypointStr = waypoints && waypoints.length > 0 ? ` (经由 ${waypoints.join(' -> ')})` : '';
            console.log(`无法找到从 ${fromRoom} 到 ${toRoom} 的路径${waypointStr}`);
        }
    }
}