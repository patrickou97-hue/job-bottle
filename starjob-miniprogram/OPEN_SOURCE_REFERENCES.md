# 小程序视觉参考

本文件记录主页星体视觉研究来源，方便后续维护时继续核对许可边界。

- NASA `NASA-3D-Resources`
  - https://github.com/nasa/NASA-3D-Resources
  - README 将仓库中的模型、纹理与图像描述为免费且无版权限制。
  - 本轮只参考真实行星的低高光、明暗交界、纬向色带和局部地貌层次，没有把仓库贴图复制进小程序包。
- three.js
  - https://github.com/mrdoob/three.js
  - MIT License。
  - 本轮只参考球体材质通常拆分为表面纹理、主光、暗面和低强度环境光的分层思路；小程序继续使用原生 WXML/WXSS，没有引入 three.js 或 WebGL 运行时。

小程序主页保持低负载：不下载远程纹理，不引入 3D 引擎，不使用高强度 bloom。星体由原生渐变、色带、地貌斑块和明暗面组成，并遵守减少动态效果设置。
