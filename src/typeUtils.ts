export function getStoreResourceTypes(o: StoreDefinition) {
    return Object.keys(o) as ResourceConstant[];
}
