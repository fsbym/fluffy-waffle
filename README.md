# 校园美食地图

用 Next.js 搭建的多伦多大学（多大）St. George 主校区周边美食与折扣地图。

## 功能

- 按分类、店名或地址搜索附近餐厅
- 显示学生折扣与饭团券信息
- 每家店都可一键在 Google Maps 中打开
- 响应式的校区地图与店家预览

> 目前店家数据写在 `src/app/api/restaurants/route.ts` 中，折扣、饭团券、评分和步行时间为示例数据。后续计划接入免费数据库（如 Supabase）。

## 开发

```bash
npm install
npm run dev
```
