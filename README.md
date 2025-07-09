在项目中配置`.screeps.json`文件，内容如下

``` json
{
  "token": "<申请的token>",
  "branch": "<分支名>",
  "ptr": false
}
```

执行`npm run build`即可推送代码

推送时修改参数
`npm run build -- --branch=default`