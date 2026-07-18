/**
 * 《吃点啥》核心领域模型。
 * 纯 TypeScript，零 React / DOM 依赖，可原样迁移到 Node 服务端 / RN / 小程序。
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'lateNight';
export type Mood = 'happy' | 'tired' | 'stressed' | 'blue' | 'relaxed' | 'adventurous';
export type Taste = 'spicy' | 'sweet' | 'sour' | 'salty' | 'light' | 'savory';
export type Warmth = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy';
export type CookMode = 'cook' | 'takeout' | 'dineout';
/** 菜品角色：肉菜主菜 / 素菜 / 主食面点 / 汤羹甜品（含肉禽水产蛋为主角→meat）。 */
export type Course = 'meat' | 'veg' | 'staple' | 'soup';

export interface Weather {
  tempC: number;
  condition: WeatherCondition;
  humidity: number;
  description: string;
  isMock: boolean;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  course: Course;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookMinutes: number;
  difficulty: 1 | 2 | 3;
  mealSlots: MealSlot[];
  tastes: Taste[];
  warmth: Warmth;
  moods: Mood[];
  seasonMonths: number[];
  trendScore: number;
  videoKeyword: string;
  tags: string[];
  /** 标准份量（几人份），缺省视为 2 人份。 */
  servings?: number;
}

export interface PlaceCandidate {
  id: string;
  name: string;
  category: string;
  perCapita: number;
  distanceKm: number;
  trendScore: number;
  seasonMonths: number[];
  moods: Mood[];
  scene: ('takeout' | 'dineout')[];
  source: 'amap-rank' | 'hot' | 'seasonal';
  reason: string;
  /** 招牌菜：「我想吃 X」搜菜名时也能命中对应商户。 */
  signatureDishes?: string[];
}

export interface ScorerContext {
  ingredients: string[];
  weather: Weather;
  now: Date;
  mood: Mood;
  availableMinutes: number;
  recentEaten: string[];
  /** 口味偏好：0=超清淡，1=超重口；缺省视为 0.5（中性）。 */
  tasteBias?: number;
  /** 忌口食材名：命中的菜谱会被硬过滤（仅 cook 模式）。 */
  dislikes?: string[];
}

export interface FoodComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface FoodRecord {
  id: string;
  dishName: string;
  note: string;
  photoDataUrl?: string;
  mood?: Mood;
  mode?: CookMode;
  rating?: 1 | 2 | 3 | 4 | 5;
  visibility: 'private' | 'shared';
  comments: FoodComment[];
  createdAt: string;
}

export interface ScorerResult {
  score: number;
  reason?: string;
}

export interface Scorer<T> {
  key: string;
  score(candidate: T, ctx: ScorerContext): ScorerResult;
}

export interface ScoreBreakdown {
  scorerKey: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  reason?: string;
}

export interface Recommendation<T> {
  candidate: T;
  totalScore: number;
  breakdown: ScoreBreakdown[];
  summary: string;
}

export interface RecommendResult {
  mode: CookMode;
  recipes: Recommendation<Recipe>[];
  places: Recommendation<PlaceCandidate>[];
}
