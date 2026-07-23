type StarJobSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  userId: string;
};

type StarJobAppOptions = {
  globalData: {
    session: StarJobSession | null;
  };
};
