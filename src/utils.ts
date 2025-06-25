export interface SpawnConfig {
    body: BodyPartConstant[];
    name: string;
}

export function getSpawn() {
    return Game.spawns['Spawn1'];
}

export function trySpawnCreep(roleName: string, roleBody: BodyPartConstant[]) {
    const spawn = getSpawn();
    if (spawn.spawning) {
        return;
    }
    console.log('开始孵化', roleName)
    let spawnResult = spawn.spawnCreep(roleBody, roleName,);
    if (spawnResult != OK) {
        console.log(roleName, "孵化失败", spawnResult);
    }
}

export function checkCreepExist(config: SpawnConfig, spawnIfNotExist: boolean = true): Creep | undefined {
    const creep = Game.creeps[config.name];
    if (creep) return creep;
    if (spawnIfNotExist) {
        const roleName = config.name;
        const roleBody = config.body;
        trySpawnCreep(roleName, roleBody);
    }
}