type PlanetTarget = {
  route: string;
  tab: boolean;
};

Page({
  data: {
    menuTop: 0,
    menuHeight: 32,
    menuLeft: 260,
    sceneActive: true,
    activePlanet: "jobs",
  },

  onLoad() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    this.setData({
      menuTop: menuButton.top,
      menuHeight: menuButton.height,
      menuLeft: menuButton.left,
    });
  },

  onShow() {
    this.getTabBar?.()?.setData({ selectedPath: "/pages/galaxy/index" });
    this.setData({ sceneActive: true });
  },

  onHide() {
    this.setData({ sceneActive: false });
  },

  onPlanetPress(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "jobs");
    this.setData({ activePlanet: id });
  },

  onPlanetTap(event: WechatMiniprogram.TouchEvent) {
    const target: PlanetTarget = {
      route: String(event.currentTarget.dataset.route || ""),
      tab: event.currentTarget.dataset.tab === true,
    };
    if (!target.route) return;

    if (target.tab) {
      wx.switchTab({ url: target.route });
      return;
    }
    wx.navigateTo({ url: target.route });
  },
});
