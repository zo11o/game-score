// 生成随机整数的通用函数（兼容浏览器和 Node.js）
function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// 形容词 - 约30个
const ADJECTIVES = [
  '勇敢的',
  '快乐的',
  '机智的',
  '沉稳的',
  '温柔的',
  '热情的',
  '聪明的',
  '活泼的',
  '淡定的',
  '顽皮的',
  '优雅的',
  '可爱的',
  '神秘的',
  '潇洒的',
  '俏皮的',
  '酷酷的',
  '开朗的',
  '幽默的',
  '淡泊的',
  '机智的',
  '恬静的',
  '豪爽的',
  '洒脱的',
  '睿智的',
  '机智的',
  '敏捷的',
  '细腻的',
  '朴实的',
  '真诚的',
  '豁达的',
];

// 名词 - 约50个
const NOUNS = [
  '熊猫',
  '水母',
  '狐狸',
  '大树',
  '月光',
  '星辰',
  '海豚',
  '企鹅',
  '考拉',
  '袋鼠',
  '松鼠',
  '猫咪',
  '小狗',
  '兔子',
  '小鹿',
  '天鹅',
  '蜻蜓',
  '蝴蝶',
  '海星',
  '珊瑚',
  '云朵',
  '彩虹',
  '闪电',
  '流星',
  '极光',
  '海浪',
  '山峰',
  '森林',
  '草原',
  '沙漠',
  '冰川',
  '火山',
  '温泉',
  '瀑布',
  '溪流',
  '竹林',
  '桃花',
  '樱花',
  '梅花',
  '荷花',
  '向日葵',
  '蒲公英',
  '风铃',
  '烟火',
  '画卷',
  '风筝',
  '气球',
  '泡泡',
  '音符',
  '画笔',
];

/**
 * 生成随机中文昵称
 * 格式：形容词 + 名词
 */
export function generateNickname(): string {
  const adjIndex = getRandomInt(ADJECTIVES.length);
  const nounIndex = getRandomInt(NOUNS.length);
  return ADJECTIVES[adjIndex] + NOUNS[nounIndex];
}
