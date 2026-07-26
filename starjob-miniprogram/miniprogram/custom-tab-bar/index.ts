const TAB_ITEMS = [
  { pagePath: "/pages/galaxy/index", text: "首页" },
  { pagePath: "/pages/jobs/index", text: "岗位" },
  { pagePath: "/pages/bottle/index", text: "星瓶" },
  { pagePath: "/pages/resumes/index", text: "简历" },
  { pagePath: "/pages/profile/index", text: "我的" },
];

Component({
  data: {
    selectedPath: "/pages/galaxy/index",
    tabs: TAB_ITEMS,
  },

  lifetimes: {
    attached() {
      this.syncSelectedPath();
    },
  },

  pageLifetimes: {
    show() {
      this.syncSelectedPath();
    },
  },

  methods: {
    syncSelectedPath() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (!currentPage) return;
      this.setData({ selectedPath: `/${currentPage.route}` });
    },

    onTabTap(event: WechatMiniprogram.TouchEvent) {
      const pagePath = String(event.currentTarget.dataset.path || "");
      if (!pagePath || pagePath === this.data.selectedPath) return;
      this.setData({ selectedPath: pagePath });
      wx.switchTab({ url: pagePath });
    },
  },
});
