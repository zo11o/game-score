import type { AvatarStyleId } from './types';

// DiceBear 头像风格配置
export const AVATAR_STYLES: Record<AvatarStyleId, { name: string; description: string }> = {
  identicon: {
    name: '像素头像',
    description: '经典的像素风格头像',
  },
  bottts: {
    name: '机器人',
    description: '可爱的机器人头像',
  },
  avataaars: {
    name: '卡通人物',
    description: '卡通风格人物头像',
  },
  lorelei: {
    name: '艺术肖像',
    description: '抽象艺术风格头像',
  },
  shapes: {
    name: '几何图形',
    description: '简约几何图形头像',
  },
  initials: {
    name: '首字母',
    description: '首字母头像',
  },
};

// 所有可用的头像风格 ID
export const AVATAR_STYLE_IDS = Object.keys(AVATAR_STYLES) as AvatarStyleId[];

/**
 * 生成 DiceBear 头像 URL
 * @param seed - 头像种子（通常是邮箱或用户ID）
 * @param style - 头像风格
 */
export function generateAvatarUrl(seed: string, style: AvatarStyleId = 'identicon'): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}`;
}
