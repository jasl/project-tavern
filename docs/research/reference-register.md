# 本地参考资料登记表

日期：2026-07-10
作用：记录被 `.gitignore` 排除、但会影响研究判断的本地资料

本表只记录溯源和项目内部使用边界。根许可证不能证明压缩包内每个第三方工具、翻译、图片或附加内容都具有相同许可；直接使用任何内容前仍需逐项确认。

## `references/degrees-of-lewdity`

| 字段 | 值 |
|---|---|
| 类型 | Git 源码 checkout |
| 上游 | `https://gitgud.io/Vrelnir/degrees-of-lewdity.git` |
| 取得日期 | 未记录；首次登记 2026-07-10 |
| revision | `3ecf56d7337e76a0bdf9f5284c483d7ecdd511d0` |
| tag | `0.5.10.12` |
| 根许可证 | CC BY-NC-SA 4.0，见本地 `LICENSE` |
| 当前用途 | 只读研究时间、事件、存档、构建和调试工具需求 |
| 禁止用途 | 不复制代码、文本、资源、schema、常量或独特数据结构；不进入构建、测试、fixture 或代码生成 |

研究记录：`degrees-of-lewdity-notes.md`。

## `references/DoL-0.5.10.12-Lyra-1.0.8a-besc-hikari-0628`

| 字段 | 值 |
|---|---|
| 类型 | 非 Git 的中文本地化发行目录，包含编译 HTML 与说明文件 |
| README 指向的上游 | `https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization` |
| README 宣传的下载页 | `https://eltirosto.github.io/Degrees-of-Lewdity-Chinese-Localization/download.html` 与 GitHub `releases/latest`；不能证明当前目录实际来自其中任一处 |
| 取得日期 | 未记录；首次登记 2026-07-10 |
| 实际取得来源 | 未知；若用户以后找到下载记录，应补充原始 release asset URL |
| 目录版本线索 | `DoL 0.5.10.12`、`Lyra 1.0.8a`，以目录名为准，未独立验证 |
| 根许可证 | CC BY-NC-SA 4.0，见本地 `LICENSE` |
| 额外条款 | 本地 `README.md` 与 `CREDITS.md` 含发布、汉化和贡献者说明，不能假定全部内容仅受根许可证约束 |
| 快照规模 | 42,177 个文件，242,998,557 bytes |
| 完整 manifest SHA-256 | `ee47cad904f231a58357a3ceb1d9b4d1b3ef9deb228657b7e774077a349b1c9f` |
| 编译 HTML SHA-256 | `31ee16ddc778ca1286de3b557d82a50cb1958024f43fd0b6a7613268b91e1bbe` |
| README SHA-256 | `ecb78a821a095874805b5324547baa224b2e146abcef1b31795af285dd120293` |
| CREDITS SHA-256 | `b9290bd217e8880cad594182d9fdf5d868a6ba0a82a437ae2ca8894205b20de2` |
| LICENSE SHA-256 | `224266396581e902e6828d34924537b3d2f094355e6dbc74ceedcaa4196dc361` |
| 当前用途 | 登记存在；当前工程研究不需要该发行包 |
| 禁止用途 | 不打开游戏内容用于提取文本/资源；不复制汉化、图片、编译产物或 Mod；不进入构建、测试或代码生成 |

完整 manifest 在该发行目录内用以下命令生成；路径保留 `./` 前缀，并使用 C locale 排序：

```sh
find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256
```

## 新增资料流程

把新资料放入 `references/` 后，在使用前补充：

1. 来源 URL 与取得日期；
2. Git revision、发行版本或关键文件摘要；
3. 根许可证与额外 README/CREDITS 条款；
4. 资料类型：源码、发行包、本地化、素材或工具；
5. 本项目允许的研究范围；
6. 明确禁止的复制、再分发和构建依赖。
