export interface LinkRegistry {
    sourceLinks: StructureLink[];
    controllerLink?: StructureLink;
    storageLink?: StructureLink;
    centralLinks: StructureLink[];
}

export class LinkManager {
    private static readonly CACHE_TTL = 10;
    private static cache: Map<string, { registry: LinkRegistry; timestamp: number }> = new Map();

    static getLinkRegistry(roomName: string): LinkRegistry {
        const cached = this.cache.get(roomName);
        if (cached && Game.time - cached.timestamp < this.CACHE_TTL) {
            return cached.registry;
        }

        const room = Game.rooms[roomName];
        if (!room) {
            return {sourceLinks: [], centralLinks: []};
        }

        const registry = this.categorizeLinks(room);
        this.cache.set(roomName, {registry, timestamp: Game.time});
        return registry;
    }

    private static categorizeLinks(room: Room): LinkRegistry {
        const links = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_LINK
        }) as StructureLink[];

        const registry: LinkRegistry = {
            sourceLinks: [],
            centralLinks: [],
            controllerLink: undefined,
            storageLink: undefined
        };

        if (links.length === 0) {
            return registry;
        }

        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        const storage = room.storage;

        for (const link of links) {
            const nearSource = sources.find(source =>
                link.pos.getRangeTo(source) <= 2
            );

            if (nearSource) {
                registry.sourceLinks.push(link);
                continue;
            }

            if (controller && link.pos.getRangeTo(controller) <= 3) {
                registry.controllerLink = link;
                continue;
            }

            if (storage && link.pos.getRangeTo(storage) <= 2) {
                registry.storageLink = link;
                continue;
            }

            registry.centralLinks.push(link);
        }

        return registry;
    }

    static transferEnergy(sourceLink: StructureLink, targetLink: StructureLink): ScreepsReturnCode {
        if (sourceLink.cooldown > 0) {
            return ERR_TIRED;
        }

        if (sourceLink.store[RESOURCE_ENERGY] < 400) {
            return ERR_NOT_ENOUGH_ENERGY;
        }

        if (targetLink.store.getFreeCapacity(RESOURCE_ENERGY) < 400) {
            return ERR_FULL;
        }

        return sourceLink.transferEnergy(targetLink);
    }

    static manageLinkNetwork(roomName: string): void {
        const registry = this.getLinkRegistry(roomName);

        for (const sourceLink of registry.sourceLinks) {
            if (registry.controllerLink) {
                const result = this.transferEnergy(sourceLink, registry.controllerLink);
                if (result === OK) {
                    console.log(`能量从源Link(${sourceLink.pos})传输到控制器Link(${registry.controllerLink.pos})`);
                    continue;
                }
            }

            if (registry.storageLink) {
                const result = this.transferEnergy(sourceLink, registry.storageLink);
                if (result === OK) {
                    console.log(`能量从源Link(${sourceLink.pos})传输到存储Link(${registry.storageLink.pos})`);
                    continue;
                }
            }

            if (registry.centralLinks.length > 0) {
                for (const centralLink of registry.centralLinks) {
                    const result = this.transferEnergy(sourceLink, centralLink);
                    if (result === OK) {
                        console.log(`能量从源Link(${sourceLink.pos})传输到中央Link(${centralLink.pos})`);
                        break;
                    }
                }
            }
        }
    }

    static clearCache(): void {
        this.cache.clear();
    }

    static printLinksInfo(roomName: string): void {
        const registry = this.getLinkRegistry(roomName);
        console.log(`========== 房间 ${roomName} Link信息 ==========`);

        if (registry.sourceLinks.length > 0) {
            console.log(`📍 源Link (${registry.sourceLinks.length}个):`);
            registry.sourceLinks.forEach((link, index) => {
                const energy = link.store[RESOURCE_ENERGY];
                const capacity = link.store.getCapacity(RESOURCE_ENERGY);
                const cooldown = link.cooldown > 0 ? ` (冷却:${link.cooldown})` : '';
                console.log(`  ${index + 1}. 位置(${link.pos.x},${link.pos.y}) 能量:${energy}/${capacity}${cooldown}`);
            });
        }

        if (registry.controllerLink) {
            const link = registry.controllerLink;
            const energy = link.store[RESOURCE_ENERGY];
            const capacity = link.store.getCapacity(RESOURCE_ENERGY);
            console.log(`🎯 控制器Link: 位置(${link.pos.x},${link.pos.y}) 能量:${energy}/${capacity}`);
        }

        if (registry.storageLink) {
            const link = registry.storageLink;
            const energy = link.store[RESOURCE_ENERGY];
            const capacity = link.store.getCapacity(RESOURCE_ENERGY);
            console.log(`📦 存储Link: 位置(${link.pos.x},${link.pos.y}) 能量:${energy}/${capacity}`);
        }

        if (registry.centralLinks.length > 0) {
            console.log(`🏢 中央Link (${registry.centralLinks.length}个):`);
            registry.centralLinks.forEach((link, index) => {
                const energy = link.store[RESOURCE_ENERGY];
                const capacity = link.store.getCapacity(RESOURCE_ENERGY);
                console.log(`  ${index + 1}. 位置(${link.pos.x},${link.pos.y}) 能量:${energy}/${capacity}`);
            });
        }

        if (registry.sourceLinks.length === 0 && !registry.controllerLink &&
            !registry.storageLink && registry.centralLinks.length === 0) {
            console.log('❌ 房间内没有找到任何Link建筑');
        }
        console.log('==========================================');
    }

    static printAllRoomsLinks(): void {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                this.printLinksInfo(roomName);
            }
        }
    }
}