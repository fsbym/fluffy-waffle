import { NextResponse } from "next/server";

const restaurants = [
  { id: 1, name: "一號義大利麵", category: "套餐", rating: 4.8, distance: "步行 3 分鐘", address: "台北市大安區新生南路三段 60 號", price: "$100-180", discount: "學生出示證件享 9 折", coupon: "飯團券可用", emoji: "🍝", color: "#f1d1b1", accent: "#de7a44" },
  { id: 2, name: "校園咖哩屋", category: "便當", rating: 4.6, distance: "步行 5 分鐘", address: "台北市大安區羅斯福路四段 16 號", price: "$120-200", discount: "指定套餐折 20 元", coupon: null, emoji: "🍛", color: "#dec68f", accent: "#c89c54" },
  { id: 3, name: "小巷手作甜點", category: "甜點", rating: 4.9, distance: "步行 7 分鐘", address: "台北市大安區師大路 92 巷 4 號", price: "$80-160", discount: "飲品甜點任兩件 8 折", coupon: "週三優惠", emoji: "🥞", color: "#d8e2bd", accent: "#98ad6d" },
  { id: 4, name: "午后茶所", category: "飲品", rating: 4.7, distance: "步行 4 分鐘", address: "台北市大安區舟山路 16 號", price: "$60-110", discount: "學生飲品第二杯半價", coupon: null, emoji: "🧋", color: "#c9dcae", accent: "#7e9c62" },
  { id: 5, name: "暖心便當店", category: "便當", rating: 4.5, distance: "步行 8 分鐘", address: "台北市大安區辛亥路一段 37 號", price: "$90-140", discount: "午餐時段送湯", coupon: "飯團券可用", emoji: "🍱", color: "#e7c3a8", accent: "#b77850" },
];

export async function GET() {
  return NextResponse.json(restaurants);
}
