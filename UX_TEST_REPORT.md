# 「等一下吃什么」应用 - 用户体验测试报告

## 📋 测试概览

| 测试项 | 状态 | 说明 |
|--------|------|------|
| 天气数据 | ✅ 真实 | Open-Meteo API，支持浏览器定位 |
| 推荐引擎 | ✅ 已实现 | 7维加权评分（食材/天气/时间/心情/时令/热度/新鲜度） |
| 菜谱数据 | ⚠️ 内置 | 静态数据文件，无API接入 |
| 商户数据 | ⚠️ 内置 | 25个模拟商户，标注"高德扫街榜"但为静态数据 |
| 冰箱食材 | ❌ 未实现 | UI有按钮但无实际数据管理 |
| 外卖API | ❌ 未接入 | 无美团/饿了么API |
| 地图API | ❌ 未接入 | 无高德/百度地图实时距离 |
| 手账记录 | ✅ 已实现 | localStorage 持久化 |

---

## 🔍 详细测试结果

### 1. 天气模块 ✅
- **数据源**: Open-Meteo（免费、免Key、CORS开放）
- **定位**: 支持浏览器GPS定位，失败降级到上海默认坐标
- **显示**: 温度、湿度、天气状况、城市名
- **降级链**: 高德API（需配置Key）→ Open-Meteo → Mock数据

**测试截图**:
```
📖 7月19日 · 周日 · 夜宵时间
🌧️ 26.2°C 下雨 湿度 97% 上海（默认）
```

### 2. 推荐引擎 ✅
- **评分维度**: 食材匹配、天气适配、时间适配、心情适配、口味适配、时令适配、热度适配、新鲜度
- **过滤机制**: 
  - 最近吃过剔除（7天有效期）
  - 忌口食材剔除
  - 荤素多样性约束

### 3. 菜谱数据 ⚠️
- **文件位置**: `src/core/data/recipes/`
- **分类**: breakfast, meat, veg, staple, soup, lateNight
- **问题**: 静态数据，无真实菜谱API
- **数据量**: 约50+道菜谱

### 4. 商户数据 ⚠️
- **文件位置**: `src/core/data/places.ts`
- **数据量**: 25个商户
- **问题**: 
  - 距离为模拟数据（非真实地图距离）
  - 无实时库存/营业状态
  - 无外卖配送时间

### 5. 冰箱食材 ❌
- **UI状态**: 有食材选择按钮
- **实际功能**: 仅作为推荐过滤条件
- **缺失**: 无食材管理、无过期提醒、无智能补充

---

## 🚀 开发建议方案

### Phase 1: 数据真实化（1-2周）

#### 1.1 接入真实菜谱API
```typescript
// 推荐API
// 1. 下厨房API（非官方）
// 2. 豆果美食API
// 3. 自建菜谱数据库

interface RecipeAPI {
  searchByIngredients(ingredients: string[]): Promise<Recipe[]>;
  searchByCuisine(cuisine: string): Promise<Recipe[]>;
  getRecipeDetail(id: string): Promise<Recipe>;
}
```

#### 1.2 接入真实地图/外卖API
```typescript
// 高德地图API
// - 周边搜索：搜索附近餐厅
// - 距离计算：真实距离
// - 路线规划

// 美团/饿了么开放平台
// - 周边商家
// - 配送时间估算
// - 实时价格
```

#### 1.3 天气API增强
```bash
# 当前: Open-Meteo（已实现）
# 增强: 配置高德天气API
VITE_AMAP_KEY=your_key
VITE_AMAP_CITY=310000  # 上海adcode
```

### Phase 2: 功能完善（2-3周）

#### 2.1 冰箱食材管理
- [ ] 食材添加/删除
- [ ] 过期提醒
- [ ] 智能购物清单
- [ ] 食材拍照识别（AI）

#### 2.2 用户系统
- [ ] 用户登录/注册
- [ ] 收藏菜谱/餐厅
- [ ] 历史记录云同步
- [ ] 个性化推荐

#### 2.3 AI推荐增强
```typescript
// 接入Kimi/Claude API
interface AIRecommendation {
  prompt: string;
  context: {
    weather: Weather;
    mood: Mood;
    ingredients: string[];
    time: Date;
    preferences: UserPrefs;
  };
  getRecommendation(): Promise<string>;
}
```

### Phase 3: 体验优化（1-2周）

#### 3.1 UI/UX优化
- [ ] 加载动画
- [ ] 推荐结果卡片优化
- [ ] 菜系转盘动画
- [ ] 手账记录可视化

#### 3.2 性能优化
- [ ] 数据缓存
- [ ] 懒加载
- [ ] PWA支持

---

## 📊 优先级排序

| 优先级 | 功能 | 工作量 | 用户价值 |
|--------|------|--------|----------|
| P0 | 接入真实外卖API | 3天 | ⭐⭐⭐⭐⭐ |
| P0 | 真实地图距离 | 2天 | ⭐⭐⭐⭐⭐ |
| P1 | 冰箱食材管理 | 4天 | ⭐⭐⭐⭐ |
| P1 | 真实菜谱API | 3天 | ⭐⭐⭐⭐ |
| P2 | AI推荐增强 | 2天 | ⭐⭐⭐ |
| P2 | 用户系统 | 5天 | ⭐⭐⭐ |
| P3 | UI动画优化 | 3天 | ⭐⭐ |

---

## 🔧 技术实现建议

### 外卖API接入方案

#### 方案A: 高德地图周边搜索（推荐）
```typescript
// 使用高德地图Web服务API
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;

async function searchNearby(keyword: string, location: string, radius = 3000) {
  const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}`
    + `&keywords=${keyword}&location=${location}&radius=${radius}&offset=20`;
  
  const resp = await fetch(url);
  const data = await resp.json();
  return data.pois.map(poi => ({
    id: poi.id,
    name: poi.name,
    address: poi.address,
    distance: poi.distance,
    location: poi.location,
    type: poi.type,
  }));
}
```

#### 方案B: 美团开放平台
- 需要企业认证
- 提供周边商家、配送费、预计时间
- 申请地址: https://open.meituan.com

### 菜谱API接入方案

#### 方案A: 豆果美食API
```typescript
async function searchRecipes(keyword: string, page = 1) {
  const url = `https://api.douguo.com/recipe/search?keyword=${keyword}&page=${page}`;
  // 需要申请API Key
}
```

#### 方案B: 自建数据库
- 从公开数据集导入
- 定期爬取更新
- 用户贡献UGC

---

## 📝 下一步行动

1. **立即申请API Key**:
   - [ ] 高德开放平台: https://lbs.amap.com
   - [ ] 美团开放平台: https://open.meituan.com

2. **配置环境变量**:
   ```bash
   # .env.local
   VITE_AMAP_KEY=your_amap_key
   VITE_AMAP_CITY=310000
   ```

3. **开发计划**:
   - Week 1: 接入高德地图API，实现真实距离和周边搜索
   - Week 2: 接入外卖平台API，实现真实商家和配送信息
   - Week 3: 冰箱食材管理和用户系统

---

*报告生成时间: 2026-07-18*
*测试版本: v1.0.0*
