module.exports = function (grunt) {
    var screepsConfig = require('./.screeps.json')

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