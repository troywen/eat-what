import { describe, expect, it } from 'vitest';
import { parseMoodText } from '../moodParse';

describe('parseMoodText 心情一句话解析', () => {
  it('tired 关键词命中', () => {
    expect(parseMoodText('今天加班到九点')).toEqual({ mood: 'tired', matchedKeyword: '加班' });
    expect(parseMoodText('好困，想睡觉').mood).toBe('tired');
    expect(parseMoodText('累死了').matchedKeyword).toBe('累');
    expect(parseMoodText('浑身没劲').matchedKeyword).toBe('没劲');
  });

  it('happy 关键词命中', () => {
    expect(parseMoodText('今天太开心了').mood).toBe('happy');
    expect(parseMoodText(' project 上线，值得庆祝').matchedKeyword).toBe('庆祝');
    expect(parseMoodText('这波操作很爽').mood).toBe('happy');
  });

  it('stressed 关键词命中', () => {
    expect(parseMoodText('最近压力好大').mood).toBe('stressed');
    expect(parseMoodText(' deadline 前焦虑').matchedKeyword).toBe('焦虑');
    expect(parseMoodText('忙了一整天').mood).toBe('stressed');
  });

  it('blue 关键词命中（含 emo 小写归一）', () => {
    expect(parseMoodText('有点丧').mood).toBe('blue');
    expect(parseMoodText('今晚我 EMO 了').matchedKeyword).toBe('emo');
    expect(parseMoodText('心里委屈').mood).toBe('blue');
  });

  it('relaxed 关键词命中', () => {
    expect(parseMoodText('周末躺平中').matchedKeyword).toBe('躺平');
    expect(parseMoodText('好无聊啊').mood).toBe('relaxed');
  });

  it('adventurous 关键词命中', () => {
    expect(parseMoodText('想试试新开的店').matchedKeyword).toBe('想试');
    expect(parseMoodText('来点特别的').mood).toBe('adventurous');
  });

  it('空串 / 无命中 → 兜底 relaxed，matchedKeyword 为 null', () => {
    expect(parseMoodText('')).toEqual({ mood: 'relaxed', matchedKeyword: null });
    expect(parseMoodText('   ')).toEqual({ mood: 'relaxed', matchedKeyword: null });
    expect(parseMoodText('今天天气不错')).toEqual({ mood: 'relaxed', matchedKeyword: null });
  });

  it('优先级：含两个关键词时取表中靠前的维度（tired 先于 happy）', () => {
    // 「累」属于 tired（表中第 1 项），「开心」属于 happy（第 2 项）
    const r = parseMoodText('虽然累但很开心');
    expect(r.mood).toBe('tired');
    expect(r.matchedKeyword).toBe('累');
  });

  it('优先级：同一维度内按关键词顺序取先列出的', () => {
    // tired 表项内「累」在「疲惫」之前
    const r = parseMoodText('疲惫不堪');
    expect(r).toEqual({ mood: 'tired', matchedKeyword: '疲惫' });
  });
});

describe('词表扩容：网络热词 / 场景词 / 食物倾向词', () => {
  it('tired 新词：社畜 / 通宵 / 健身完 / 累觉不爱', () => {
    expect(parseMoodText('社畜的一天又结束了').mood).toBe('tired');
    expect(parseMoodText('通宵改方案').matchedKeyword).toBe('通宵');
    expect(parseMoodText('健身完好饿').mood).toBe('tired');
    expect(parseMoodText('累觉不爱').mood).toBe('tired');
  });

  it('happy 新词：发工资 / 元气满满 / 周五 / 想吃点好的', () => {
    expect(parseMoodText('今天发工资啦').matchedKeyword).toBe('发工资');
    expect(parseMoodText('元气满满的一天').mood).toBe('happy');
    expect(parseMoodText('终于周五了').matchedKeyword).toBe('周五');
    expect(parseMoodText('想吃点好的犒劳自己').mood).toBe('happy');
  });

  it('stressed 新词：周一 / 甲方 / 内耗 / 面试', () => {
    expect(parseMoodText('周一早上想辞职').matchedKeyword).toBe('周一');
    expect(parseMoodText('甲方又改需求').matchedKeyword).toBe('甲方');
    expect(parseMoodText('内耗严重').mood).toBe('stressed');
    expect(parseMoodText('明天有面试').mood).toBe('stressed');
  });

  it('blue 新词：破防 / 失恋 / 没胃口 / 蓝瘦', () => {
    expect(parseMoodText('破防了家人们').matchedKeyword).toBe('破防');
    expect(parseMoodText('失恋了吃不下').matchedKeyword).toBe('失恋');
    expect(parseMoodText('没胃口吃饭').mood).toBe('blue');
    expect(parseMoodText('蓝瘦香菇').matchedKeyword).toBe('蓝瘦');
  });

  it('relaxed 新词：摆烂 / 摸鱼 / 懒得动 / 葛优躺', () => {
    expect(parseMoodText('今天想摆烂').matchedKeyword).toBe('摆烂');
    expect(parseMoodText('上班摸鱼中').matchedKeyword).toBe('摸鱼');
    expect(parseMoodText('懒得动，不想出门').matchedKeyword).toBe('懒得动');
    expect(parseMoodText('葛优躺一下午').mood).toBe('relaxed');
  });

  it('adventurous 新词：想吃辣 / 打卡 / 换换口味 / 拔草', () => {
    expect(parseMoodText('突然想吃辣').matchedKeyword).toBe('想吃辣');
    expect(parseMoodText('想去打卡那家店').matchedKeyword).toBe('打卡');
    expect(parseMoodText('换换口味吧').mood).toBe('adventurous');
    expect(parseMoodText('拔草收藏夹里的店').mood).toBe('adventurous');
  });
});

describe('localMoodAnalyzer（线上 AI 分析预留接口）', () => {
  it('与 parseMoodText 结果一致，且返回 Promise', async () => {
    const { localMoodAnalyzer } = await import('../moodParse');
    const r = localMoodAnalyzer.analyze('今天加班到九点');
    expect(r).toBeInstanceOf(Promise);
    expect(await r).toEqual(parseMoodText('今天加班到九点'));
  });

  it('无命中时同样兜底 relaxed', async () => {
    const { localMoodAnalyzer } = await import('../moodParse');
    expect(await localMoodAnalyzer.analyze('今天天气不错')).toEqual({ mood: 'relaxed', matchedKeyword: null });
  });
});
