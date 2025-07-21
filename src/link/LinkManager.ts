export interface LinkRegistry {
    sourceLinks: StructureLink[];
    controllerLink?: StructureLink;
    storageLink?: StructureLink;
    centralLinks: StructureLink[];
}

export enum LinkType {
    SOURCE = 'source',
    CONTROLLER = 'controller', 
    STORAGE = 'storage',
    CENTRAL = 'central'
}

export interface LinkInfo {
    link: StructureLink;
    type: LinkType;
    sourceId?: string;
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
            return { sourceLinks: [], centralLinks: [] };
        }

        const registry = this.categorizeLinks(room);
        this.cache.set(roomName, { registry, timestamp: Game.time });
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

    static getLinksInfo(roomName: string): LinkInfo[] {
        const registry = this.getLinkRegistry(roomName);
        const linkInfos: LinkInfo[] = [];

        registry.sourceLinks.forEach(link => {
            linkInfos.push({
                link,
                type: LinkType.SOURCE
            });
        });

        if (registry.controllerLink) {
            linkInfos.push({
                link: registry.controllerLink,
                type: LinkType.CONTROLLER
            });
        }

        if (registry.storageLink) {
            linkInfos.push({
                link: registry.storageLink,
                type: LinkType.STORAGE
            });
        }

        registry.centralLinks.forEach(link => {
            linkInfos.push({
                link,
                type: LinkType.CENTRAL
            });
        });

        return linkInfos;
    }

    static clearCache(): void {
        this.cache.clear();
    }
}