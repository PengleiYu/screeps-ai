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