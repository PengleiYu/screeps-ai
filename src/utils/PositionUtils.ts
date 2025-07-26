function parseRoomCoordinate(roomName: string) {
    let match = roomName.match(/^([WE])(\d+)([NS])(\d+)$/)!!;
    return {
        x_dir: match[1],  // 'W' or 'E'
        x_num: parseInt(match[2]),
        y_dir: match[3],  // 'N' or 'S'
        y_num: parseInt(match[4])
    };
}

function getRoomVector(fromRoom: string, toRoom: string) {
    let from = parseRoomCoordinate(fromRoom);
    let to = parseRoomCoordinate(toRoom);

    // 计算世界坐标
    let fromX = from.x_dir === 'W' ? -from.x_num - 1 : from.x_num;
    let fromY = from.y_dir === 'N' ? -from.y_num - 1 : from.y_num;

    let toX = to.x_dir === 'W' ? -to.x_num - 1 : to.x_num;
    let toY = to.y_dir === 'N' ? -to.y_num - 1 : to.y_num;

    // 计算方向差值
    let dx = toX - fromX;
    let dy = toY - fromY;

    return {dx, dy};
}

export function getRoomDirection(fromRoom: string, toRoom: string): DirectionConstant | null {
    if (!fromRoom || !toRoom) return null;
    let {dx, dy} = getRoomVector(fromRoom, toRoom);

    // 相邻房间的方向映射
    if (dx === 1 && dy === 0) return RIGHT;      // 东
    if (dx === -1 && dy === 0) return LEFT;     // 西
    if (dx === 0 && dy === 1) return BOTTOM;    // 南
    if (dx === 0 && dy === -1) return TOP;      // 北

    // 对角方向
    if (dx === 1 && dy === 1) return BOTTOM_RIGHT;   // 东南
    if (dx === 1 && dy === -1) return TOP_RIGHT;     // 东北
    if (dx === -1 && dy === 1) return BOTTOM_LEFT;   // 西南
    if (dx === -1 && dy === -1) return TOP_LEFT;     // 西北

    return null; // 非相邻房间
}

export function getExitDirectionInEdge(pos: RoomPosition): DirectionConstant | null {
    // 处理角落位置（斜对角方向）
    if (pos.x === 0 && pos.y === 0) return TOP_LEFT;       // 西北角
    if (pos.x === 49 && pos.y === 0) return TOP_RIGHT;     // 东北角
    if (pos.x === 0 && pos.y === 49) return BOTTOM_LEFT;   // 西南角
    if (pos.x === 49 && pos.y === 49) return BOTTOM_RIGHT; // 东南角

    // 处理边缘位置（正交方向）
    if (pos.x === 0) return LEFT;     // 西边缘
    if (pos.x === 49) return RIGHT;   // 东边缘
    if (pos.y === 0) return TOP;      // 北边缘
    if (pos.y === 49) return BOTTOM;  // 南边缘

    return null; // 不在边缘
}

export function getOppositeDirection(direction: DirectionConstant): DirectionConstant {
    // 利用对称性：相反方向相差4
    // 使用模运算处理环形数组
    // 从1开始，而不是0
    return (direction - 1 + 4) % 8 + 1 as DirectionConstant;
}

export function findBestExitPosition(creep: Creep, targetRoom: string): RoomPosition | null {
    let exitDirection = creep.room.findExitTo(targetRoom);
    if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
        return null;
    }
    let exits = creep.room.find(exitDirection);
    return creep.pos.findClosestByPath(exits);
}

export function getDirectionName(direction: DirectionConstant): string | null {
    switch (direction) {
        case TOP:
            return '北';
        case TOP_RIGHT:
            return '东北';
        case RIGHT:
            return '东';
        case BOTTOM_RIGHT:
            return '东南';
        case BOTTOM:
            return '南';
        case BOTTOM_LEFT:
            return '西南';
        case LEFT:
            return '西';
        case TOP_LEFT:
            return '西北';
        default:
            return null;
    }
}

export function getRoomCenter(room: Room): RoomPosition {
    return new RoomPosition(25, 25, room.name);
}

export function getRoomCenterWalkablePos(room: Room): RoomPosition {
    // 检查中央位置是否可用
    const centerX = 25, centerY = 25;
    if (isPositionWalkable(room, centerX, centerY)) {
        return new RoomPosition(25, 25, room.name);
    }

    // 从中央位置开始螺旋搜索最近的可通行位置
    for (let radius = 1; radius <= 24; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // 只检查当前半径边界上的位置（螺旋外圈）
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                const x = centerX + dx;
                const y = centerY + dy;

                // 检查位置是否在房间范围内
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                if (isPositionWalkable(room, x, y)) {
                    return new RoomPosition(x, y, room.name);
                }
            }
        }
    }

    // 如果找不到可用位置，返回中央位置作为后备
    return new RoomPosition(centerX, centerY, room.name);
}


// 辅助函数：检查位置是否可通行
function isPositionWalkable(room: Room, x: number, y: number): boolean {
    // 检查地形是否可通行
    const terrain = room.getTerrain().get(x, y);
    if (terrain === TERRAIN_MASK_WALL) {
        return false;
    }

    // 检查是否有阻挡的建筑物
    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    const hasBlockingStructure = structures.some(structure =>
        structure.structureType !== STRUCTURE_ROAD &&
        structure.structureType !== STRUCTURE_CONTAINER &&
        structure.structureType !== STRUCTURE_RAMPART
    );
    if (hasBlockingStructure) return false;

    return !!room.lookForAt(LOOK_CREEPS, x, y)[0]
}
