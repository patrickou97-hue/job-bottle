import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "拾星 StarJob",
    short_name: "StarJob",
    description: "面向学生秋招投递的岗位信息管理与进度记录工具。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f1",
    theme_color: "#f4f4f1",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
