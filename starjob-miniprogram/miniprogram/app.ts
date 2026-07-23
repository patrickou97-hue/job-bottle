import { restoreSession } from "./services/session";

App<StarJobAppOptions>({
  globalData: {
    session: null,
  },
  onLaunch() {
    this.globalData.session = restoreSession();
  },
});
