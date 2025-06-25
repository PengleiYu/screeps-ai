export interface SpawnConfig {
    body: BodyPartConstant[];
    name: string;
}

export function getSpawn() {
    return Game.spawns['Spawn1'];
}

export function trySpawnCreep(config: SpawnConfig) {
    const spawn = getSpawn();
    if (spawn.spawning) {
        return;
    }
    console.log('开始孵化', config.name)
    let spawnResult = spawn.spawnCreep(config.body, config.name,);
    if (spawnResult != OK) {
        console.log(config.name, "孵化失败", spawnResult);
    }
}

export function checkCreepExist(config: SpawnConfig, spawnIfNotExist: boolean = true): Creep | undefined {
    const creep = Game.creeps[config.name];
    if (creep) return creep;
    if (spawnIfNotExist) trySpawnCreep(config);
}