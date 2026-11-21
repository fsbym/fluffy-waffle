import { NextResponse } from "next/server";

// 示例数据：店家为多大 St. George 校区周边的真实餐厅，
// 但折扣、饭团券、评分和步行时间均为示意，请以店家实际公布为准。
const restaurants = [
  { id: 1, name: "Kinton Ramen", category: "日料", rating: 4.5, distance: "步行约 10 分钟", address: "51 Baldwin St, Toronto, ON", price: "$15-22", discount: "出示学生卡 9 折（示例）", coupon: "饭团券可用（示例）", emoji: "🍜", color: "#f1d1b1", accent: "#de7a44" },
  { id: 2, name: "Sushi on Bloor", category: "日料", rating: 4.3, distance: "步行约 8 分钟", address: "515 Bloor St W, Toronto, ON", price: "$15-30", discount: "午市套餐学生减 $2（示例）", coupon: null, emoji: "🍣", color: "#dec68f", accent: "#c89c54" },
  { id: 3, name: "Mother's Dumplings", category: "中餐", rating: 4.4, distance: "步行约 12 分钟", address: "421 Spadina Ave, Toronto, ON", price: "$12-20", discount: "满 $30 送小菜（示例）", coupon: "饭团券可用（示例）", emoji: "🥟", color: "#e7c3a8", accent: "#b77850" },
  { id: 4, name: "Rol San", category: "中餐", rating: 4.2, distance: "步行约 15 分钟", address: "323 Spadina Ave, Toronto, ON", price: "$15-25", discount: "工作日早茶 9 折（示例）", coupon: null, emoji: "🥢", color: "#d8e2bd", accent: "#98ad6d" },
  { id: 5, name: "Sneaky Dee's", category: "西式", rating: 4.1, distance: "步行约 10 分钟", address: "431 College St, Toronto, ON", price: "$14-24", discount: "学生周二特价（示例）", coupon: null, emoji: "🌮", color: "#c9dcae", accent: "#7e9c62" },
  { id: 6, name: "Seven Lives Tacos", category: "西式", rating: 4.7, distance: "步行约 14 分钟", address: "72 Kensington Ave, Toronto, ON", price: "$8-18", discount: null, coupon: "饭团券可用（示例）", emoji: "🌯", color: "#f1d1b1", accent: "#de7a44" },
  { id: 7, name: "Future Bistro", category: "甜点", rating: 4.0, distance: "步行约 8 分钟", address: "483 Bloor St W, Toronto, ON", price: "$8-18", discount: "蛋糕第二件半价（示例）", coupon: null, emoji: "🍰", color: "#dec68f", accent: "#c89c54" },
  { id: 8, name: "Pancho's Bakery", category: "甜点", rating: 4.6, distance: "步行约 14 分钟", address: "214 Augusta Ave, Toronto, ON", price: "$4-12", discount: "买 6 个 churros 送 1 个（示例）", coupon: null, emoji: "🥐", color: "#d8e2bd", accent: "#98ad6d" },
];

export async function GET() {
  return NextResponse.json(restaurants);
}
