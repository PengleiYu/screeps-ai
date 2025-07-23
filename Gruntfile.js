module.exports = function (grunt) {
    // CI环境下不需要.screeps.json配置
    let config = {};
    try {
        config = require('../.screeps.json');
    } catch (e) {
        console.log('No .screeps.json found (normal for CI environment):', e.message);
        // 如果需要详细调试信息，可以打印完整堆栈
        // console.error(e.stack);
    }
    
    let screepsConfig = {
        token: grunt.option('token') || (config.token || ''),
        branch: grunt.option('branch') || (config.branch || 'default'),
        ptr: grunt.option('ptr') || (config.ptr || false)
    }

    // 配置各个任务数据
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        exec: {
            tsupBuild: {
                command: 'tsup ./src/main.ts --out-dir ./dist',
                options: {
                    failOnError: true,  // 子进程失败时grunt也失败
                    callback: function(error, stdout, stderr) {
                        if (error) {
                            grunt.log.error('Build failed with error:', error);
                            grunt.fail.fatal('TypeScript compilation failed');
                        }
                        if (stderr) {
                            grunt.log.error('Build stderr:', stderr);
                        }
                        grunt.log.ok('Build completed successfully');
                    }
                }
            },
            tsc: {
                command: 'npx tsc --noEmit',  // 只做类型检查，不生成文件
                options: {
                    failOnError: true
                }
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
    grunt.registerTask('default', ['exec:tsc', 'exec:tsupBuild', 'screeps']);
    grunt.registerTask('push', ['exec:tsc', 'exec:tsupBuild', 'screeps']);
    // 单独的构建任务（带类型检查）
    grunt.registerTask('build', ['exec:tsc', 'exec:tsupBuild']);
}