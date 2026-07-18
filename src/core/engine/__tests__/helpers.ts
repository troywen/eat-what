import type { Recipe, ScorerContext, Weather } from '../../types';

export function makeWeather(overrides: Partial<Weather> = {}): Weather {
  return {
    tempC: 20,
    condition: 'sunny',
    humidity: 50,
    description: '晴',
    isMock: true,
    ...overrides,
  };
}

/** 默认：7 月 17 日中午 12 点（夏季午餐）。 */
export function makeCtx(overrides: Partial<ScorerContext> = {}): ScorerContext {
  return {
    ingredients: [],
    weather: makeWeather(),
    now: new Date(2026, 6, 17, 12, 0, 0),
    mood: 'relaxed',
    availableMinutes: 60,
    recentEaten: [],
    ...overrides,
  };
}

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'test-recipe',
    name: '测试菜',
    course: 'veg',
    description: '测试用菜谱',
    ingredients: [
      { name: '鸡蛋', amount: '2个（约100g）' },
      { name: '番茄', amount: '1个（约150g）' },
      { name: '小葱', amount: '1根' },
      { name: '盐', amount: '1小勺' },
    ],
    steps: ['第一步', '第二步', '第三步', '第四步'],
    cookMinutes: 15,
    difficulty: 1,
    mealSlots: ['lunch'],
    tastes: ['savory'],
    warmth: 'neutral',
    moods: ['relaxed'],
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    trendScore: 0.8,
    videoKeyword: '测试菜 做法',
    tags: ['测试'],
    ...overrides,
  };
}
