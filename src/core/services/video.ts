/**
 * 视频教程服务。
 * Demo 阶段：生成 B 站 / 抖音搜索直达链接，无需 API Key。
 * 生产环境：可替换为开放平台搜索 API。
 */

export interface VideoGuide {
  platform: 'bilibili' | 'douyin';
  title: string;
  url: string;
}

export function getVideoGuides(keyword: string): VideoGuide[] {
  const q = encodeURIComponent(keyword);
  return [
    {
      platform: 'bilibili',
      title: `B站搜索「${keyword}」`,
      url: `https://search.bilibili.com/all?keyword=${q}`,
    },
    {
      platform: 'douyin',
      title: `抖音搜索「${keyword}」`,
      url: `https://www.douyin.com/search/${q}`,
    },
  ];
}
