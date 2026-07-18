/**
 * 心情一句话解析：把用户随手输入的一句话映射到 Mood。
 *
 * 匹配规则：按关键词表顺序做优先级匹配（表靠前的维度优先，组内靠前的词优先），
 * 命中即返回；空串/无命中兜底 relaxed。
 *
 * 线上 AI 分析预留：上线后实现 remoteMoodAnalyzer（走自家服务端代理 LLM，
 * Key 不下发前端），UI 通过 MoodAnalyzer 接口注入，可无缝切换实现。
 */
import type { Mood } from '../types';

/** 关键词映射表：数组顺序即匹配优先级。 */
const MOOD_KEYWORDS: [Mood, string[]][] = [
  [
    'tired',
    [
      '累', '疲惫', '加班', '困', '没劲', // 原始词
      '累瘫', '累觉不爱', '社畜', '搬砖', '熬夜', '通宵', '没睡好', '困死',
      '精疲力尽', '筋疲力尽', '乏力', '虚脱', '没电', '回血', // 想回血=身体被掏空
      '健身完', '宿醉', '感冒', '生理期', '考试周',
    ],
  ],
  [
    'happy',
    [
      '开心', '高兴', '庆祝', '爽', '棒', // 原始词
      '元气满满', '发工资', '周五', '放假', '中奖', '脱单', '升职', '加薪', '上岸',
      '美滋滋', '小确幸', '哈哈', '嘻嘻',
      '想吃点好的', // 直白食物倾向：犒劳自己的好心情
      '绝了',
    ],
  ],
  [
    'stressed',
    [
      '压力', '焦虑', '烦', '崩溃', '忙', // 原始词
      '周一', 'deadline', '赶工', '汇报', '甲方', '被催', '内耗', '内卷', '卷死',
      '失眠', '心慌', '头大', '秃头', '面试', '述职', '挤地铁', '堵车', '房贷', '考试',
    ],
  ],
  [
    'blue',
    [
      '丧', '难过', 'emo', '低落', '委屈', // 原始词
      '破防', '失恋', '分手', '想哭', '伤心', '孤独', '寂寞', '没人陪', '被鸽',
      '蓝瘦', '香菇', '忧郁', '郁闷',
      '没胃口', // 低落到吃不下，归 blue
    ],
  ],
  [
    'relaxed',
    [
      '闲', '无聊', '躺平', '周末', '放松', // 原始词
      '摆烂', '摸鱼', '划水', '发呆', '葛优躺', '懒得动', '随便', '慢悠悠',
      '下午茶', '晒太阳', '追剧', '无所事事', '睡到自然醒', '养老', '休假',
    ],
  ],
  [
    'adventurous',
    [
      '尝鲜', '新奇', '想试', '猎奇', '特别', // 原始词
      '想吃辣', // 直白食物倾向：明确想吃点刺激的，归尝鲜
      '来点猛的', '刺激', '网红店', '打卡', '新开的', '没吃过', '换换口味',
      '整点不一样的', '挑战', '馋', '拔草',
    ],
  ],
];

export interface MoodParseResult {
  mood: Mood;
  matchedKeyword: string | null;
}

export function parseMoodText(text: string): MoodParseResult {
  const t = text.trim().toLowerCase();
  if (!t) return { mood: 'relaxed', matchedKeyword: null };

  for (const [mood, keywords] of MOOD_KEYWORDS) {
    for (const kw of keywords) {
      if (t.includes(kw)) {
        return { mood, matchedKeyword: kw };
      }
    }
  }
  return { mood: 'relaxed', matchedKeyword: null };
}

/** 心情分析器接口：UI 依赖它而非具体实现，便于切换本地词表 / 线上 AI。 */
export interface MoodAnalyzer {
  analyze(text: string): Promise<MoodParseResult>;
}

/** 本地实现：内部走 parseMoodText 关键词表。 */
export const localMoodAnalyzer: MoodAnalyzer = {
  analyze(text: string) {
    return Promise.resolve(parseMoodText(text));
  },
};
