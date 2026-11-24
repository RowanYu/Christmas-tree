# 圣诞树手势互动

这是一个可独立部署的圣诞树手势互动页面，使用原生 JavaScript、Canvas 和 MediaPipe Hands。默认不会访问摄像头；点击页面中的“开启摄像头”后才会请求权限。

## 本地运行

需要 Python 3。在本目录打开终端并运行：

```powershell
python -m http.server 4173
```

浏览器访问 <http://localhost:4173/>。摄像头通常要求安全上下文：使用 `localhost` 或 HTTPS，不要直接双击打开 `index.html`。首次点击“开启摄像头”时，在浏览器提示中允许摄像头。

## 手势与相册

- 张开手掌：粒子树散开。
- 握拳：关闭照片并让粒子恢复成树形。
- 拇指与食指或中指捏合：稳定捏合后随机展示示例或相册照片；保持捏合时照片保持，松开或手离开画面后关闭照片并散开粒子。
- 左右挥手：立即散开并按屏幕移动方向旋转；挥手候选轨迹会抑制冲突的捏合照片触发。
- “回忆相册”支持选择多张 JPG、PNG、WEBP 或 GIF 图片、查看缩略图、打开与删除。用户照片保存在当前浏览器站点的 IndexedDB 中，清除站点数据会删除这些照片。

手势模型在本地运行，无需 CDN。摄像头访问仍需要浏览器授权。阈值会受光线、遮挡、手掌角度及摄像头帧率影响。

## 发布内容与来源

本仓库根目录只包含此交互应用及其运行所需资源：`index.html`、`app.js`、`scene.js`、`gestures.js`、`style.css`、`photos/` 和 `upstream/mediapipe/`。`upstream/mediapipe/` 中的 MediaPipe Hands JavaScript、WASM、模型与数据文件镜像自公开仓库 <https://github.com/nobody-r/christmas-tree> 的提交 `09bd9f81088ec7116b2d8e059f09681eec34ea20`，用于本页本地手势识别。

此部署副本没有包含源站构建页面、源站 JS/CSS bundle、音乐或源站原页面资源；应用自身使用的示例照片是 `photos/` 下的三张 SVG 插画。用户添加的私人照片只存于其浏览器 IndexedDB，不在仓库中。

原站公开仓库提供的是构建后的部署 bundle，不含可恢复的 React/TypeScript 开发源码。MediaPipe 文件依其上游许可和来源说明使用；再分发前请核对相应上游许可。

## 文件说明

- `index.html`、`style.css`：应用页面与样式。
- `app.js`、`scene.js`、`gestures.js`：相册、手势状态与粒子场景逻辑。
- `photos/`：随项目提供的 SVG 示例照片。
- `upstream/mediapipe/`：本地手势识别库、WASM 和模型资源。
- `.nojekyll`：让 GitHub Pages 原样发布点号开头的静态资源。
