module.exports = function (grunt) {
    let config = require('./.screeps.json')
    let screepsConfig = {
        token: grunt.option('token') || config.token,
        branch: grunt.option('branch') || config.branch,
        ptr: grunt.option('ptr') || config.ptr
    }

    // 配置各个任务数据
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        exec: {
            tsupBuild: {
                command: 'tsup ./src/main.ts --out-dir ./dist'
            }
        },
        watch: {
            scripts: {
                files: ['**/*.ts'],
                tasks: ['exec:tsc'],
                options: {
                    spawn: false,
                }
            }
        },
        screeps: {
            options: {
                token: screepsConfig.token,
                branch: screepsConfig.branch,
                ptr: screepsConfig.ptr,
                //server: 'season'
            },
            dist: {
                src: ['dist/*.js']
            }
        },
    });
    // 启用插件
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-screeps');
    // 配置默认任务，用于命令行直接执行grunt
    grunt.registerTask('default', ['exec:tsupBuild', 'screeps']);
}