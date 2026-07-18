# 「等一下吃什么」开发路线图

## 📊 现状分析

### ✅ 已完成功能
1. **推荐引擎核心** - 7维加权评分系统完整实现
2. **天气模块** - Open-Meteo真实天气API接入
3. **UI界面** - 手账风格设计，响应式布局
4. **数据持久化** - localStorage记录历史
5. **菜谱数据** - 50+道内置菜谱（分类完整）
6. **商户数据** - 25个模拟商户

### ⚠️ 数据真实化需求

| 模块 | 当前状态 | 目标状态 | 工作量 |
|------|----------|----------|--------|
| 天气 | ✅ Open-Meteo真实数据 | 保持 | 0天 |
| 菜谱 | ⚠️ 静态数据 | 接入真实菜谱API | 3天 |
| 商户 | ⚠️ 模拟数据 | 接入高德/美团API | 4天 |
| 距离 | ⚠️ 模拟距离 | 真实地图距离 | 2天 |
| 冰箱 | ❌ 无管理功能 | 食材CRUD+过期提醒 | 4天 |

---

## 🚀 开发计划

### Phase 1: 真实数据接入（Week 1-2）

#### 1.1 高德地图API接入
```typescript
// 需要申请: https://lbs.amap.com
// 服务: 周边搜索、距离计算、路线规划

interface AMapService {
  // 搜索周边餐厅
  searchNearby(keyword: string, location: [number, number], radius: number): Promise<POI[]>;
  
  // 计算距离
  calculateDistance(from: [number, number], to: [number, number]): Promise<number>;
  
  // 获取周边美食
  getNearbyRestaurants(location: [number, number], radius = 3000): Promise<Restaurant[]>;
}
```

**实施步骤**:
1. 注册高德开放平台账号
2. 创建Web应用获取Key
3. 配置环境变量 `VITE_AMAP_KEY`
4. 实现 `AmapPlaceService`
5. 替换 `places.ts` 静态数据

#### 1.2 菜谱API接入
```typescript
// 可选API:
// 1. 豆果美食: https://www.douguo.com
// 2. 下厨房: https://www.xiachufang.com
// 3. 自建数据库

interface RecipeService {
  searchByIngredients(ingredients: string[], limit = 20): Promise<Recipe[]>;
  searchByKeyword(keyword: string, page = 1): Promise<Recipe[]>;
  getRecipeDetail(id: string): Promise<Recipe>;
  getRandomRecipe(): Promise<Recipe>;
}
```

**推荐方案**: 先使用内置数据，后续接入豆果美食API

#### 1.3 外卖平台对接（可选）
```typescript
// 美团开放平台: https://open.meituan.com
// 饿了么开放平台: https://open.ele.me

interface DeliveryService {
  getNearbyShops(location: string): Promise<Shop[]>;
  getDeliveryTime(shopId: string, address: string): Promise<number>;
  getShopMenu(shopId: string): Promise<MenuItem[]>;
}
```

**注意**: 外卖API需要企业资质，个人开发者可先用高德周边搜索替代

---

### Phase 2: 冰箱食材管理（Week 2-3）

#### 2.1 食材数据结构
```typescript
interface FridgeIngredient {
  id: string;
  name: string;
  category: 'meat' | 'seafood' | 'vegetable' | 'fruit' | 'dairy' | 'other';
  quantity: number;
  unit: string;
  addedAt: Date;
  expiresAt?: Date;
  location: 'fridge' | 'freezer' | 'pantry';
  image?: string;
}

interface FridgeState {
  ingredients: FridgeIngredient[];
  lastUpdated: Date;
}
```

#### 2.2 核心功能
- [ ] 添加食材（手动输入/拍照识别）
- [ ] 删除/消耗食材
- [ ] 过期提醒（提前1天通知）
- [ ] 智能购物清单生成
- [ ] 食材分类筛选
- [ ] 过期食材推荐菜谱

#### 2.3 AI拍照识别（进阶）
```typescript
// 使用Kimi/Claude Vision API
async function recognizeIngredient(image: File): Promise<{
  name: string;
  category: string;
  confidence: number;
}> {
  // 上传图片到AI服务
  // 解析返回结果
}
```

---

### Phase 3: 用户体验优化（Week 3-4）

#### 3.1 推荐结果展示优化
```typescript
interface RecommendationCard {
  // 当前缺少:
  - 菜谱图片
  - 商户图片
  - 用户评价
  - 价格区间
  - 配送时间（外卖）
  - 导航按钮
}
```

#### 3.2 新增功能
- [ ] 分享功能（生成推荐卡片图片）
- [ ] 收藏功能
- [ ] 历史记录导出
- [ ] 每日推荐推送
- [ ] 周菜单规划

#### 3.3 性能优化
- [ ] 图片懒加载
- [ ] 数据缓存策略
- [ ] PWA离线支持
- [ ] 首屏加载优化

---

## 🔧 技术实现细节

### 环境变量配置
```bash
# .env.local
# 高德地图（必需）
VITE_AMAP_KEY=your_amap_key_here
VITE_AMAP_SECURITY_CODE=your_security_code

# 城市adcode（可选，默认上海）
VITE_AMAP_CITY=310000

# AI服务（可选，用于拍照识别）
VITE_KIMI_API_KEY=your_kimi_key
```

### 高德API集成示例
```typescript
// src/core/services/amap.ts
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;

export async function searchNearby(
  keyword: string, 
  location: { lat: number; lng: number },
  radius = 3000
) {
  const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}`
    + `&keywords=${encodeURIComponent(keyword)}`
    + `&location=${location.lng},${location.lat}`
    + `&radius=${radius}&offset=20&extensions=all`;
  
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (data.status !== '1') {
    throw new Error(`高德API错误: ${data.info}`);
  }
  
  return data.pois.map(poi => ({
    id: poi.id,
    name: poi.name,
    address: poi.address,
    distance: poi.distance ? parseInt(poi.distance) : null,
    location: {
      lat: parseFloat(poi.location.split(',')[1]),
      lng: parseFloat(poi.location.split(',')[0]),
    },
    type: poi.type,
    photos: poi.photos?.map(p => p.url) || [],
  }));
}
```

### 冰箱数据存储
```typescript
// src/lib/fridgeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FridgeStore {
  ingredients: FridgeIngredient[];
  addIngredient: (ing: Omit<FridgeIngredient, 'id'>) => void;
  removeIngredient: (id: string) => void;
  consumeIngredient: (id: string) => void;
  getExpiringSoon: () => FridgeIngredient[];
  getShoppingList: () => string[];
}

export const useFridgeStore = create<FridgeStore>()(
  persist(
    (set, get) => ({
      ingredients: [],
      addIngredient: (ing) => set(state => ({
        ingredients: [...state.ingredients, { ...ing, id: crypto.randomUUID() }]
      })),
      removeIngredient: (id) => set(state => ({
        ingredients: state.ingredients.filter(i => i.id !== id)
      })),
      consumeIngredient: (id) => get().removeIngredient(id),
      getExpiringSoon: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return get().ingredients.filter(i => 
          i.expiresAt && new Date(i.expiresAt) <= tomorrow
        );
      },
      getShoppingList: () => {
        // 基于最近吃过的菜谱推荐
        return [];
      },
    }),
    { name: 'fridge-storage' }
  )
);
```

---

## 📅 里程碑

| 日期 | 目标 | 验收标准 |
|------|------|----------|
| Week 1 结束 | 高德API接入 | 能显示真实周边餐厅 |
| Week 2 结束 | 冰箱管理MVP | 能添加/删除食材 |
| Week 3 结束 | 完整功能 | 所有P0功能完成 |
| Week 4 结束 | 上线发布 | GitHub Pages部署 |

---

## 🎯 下一步立即行动

1. **申请高德API Key** (5分钟)
   - 访问: https://lbs.amap.com
   - 注册 → 应用管理 → 创建应用
   - 添加Key: Web服务(API)

2. **配置环境变量**
   ```bash
   cd ~/Documents/kimi/Workspaces/《吃点啥》/eat-what
   echo "VITE_AMAP_KEY=你的key" > .env.local
   ```

3. **开始开发**
   ```bash
   npm install
   npm run dev
   ```

---

*生成时间: 2026-07-18*
*版本: v1.0.0*
