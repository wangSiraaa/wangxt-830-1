const path = require('path');
const { initData, data, FEE_RULES, REQUIRED_ITEMS, ITEM_NAMES, LEVEL_RULES } = require(path.join(__dirname, '..', 'app.js'));

console.log('========================================');
console.log('  养老院护理等级评估 - 初始化数据');
console.log('========================================');
console.log('');

initData();

console.log('');
console.log('========================================');
console.log('  数据摘要');
console.log('========================================');
console.log('');

console.log('【老人档案】');
data.elders.forEach(e => {
  console.log(`  ${e.id}. ${e.name}（${e.gender}）- ${e.current_level}');
  console.log(`     房间: ${e.room_number} | 联系人: ${e.contact_name}（${e.contact_relation}）`);
  if (e.health_notes) console.log(`     健康备注: ${e.health_notes}`);
  console.log('');
});

console.log('【评估量表】');
data.assessmentScales.forEach(s => {
  const elder = data.elders.find(e => e.id === s.elder_id);
  console.log(`  #${s.id} ${elder ? elder.name : '未知'} - ${s.assessment_date}`);
  console.log(`     总分: ${s.total_score} | 评估员: ${s.assessor_name}`);
  if (s.missing_items && s.missing_items.length > 0) {
    console.log(`     缺项: ${s.missing_items.join(', ')}');
  }
  console.log('');
});

console.log('【评估结论】');
data.assessmentResults.forEach(r => {
  const elder = data.elders.find(e => e.id === r.elder_id);
  console.log(`  #${r.id} ${elder ? elder.name : '未知'} - ${r.new_level}`);
  console.log(`     日期: ${r.assessment_date} | 生效: ${r.effective_date}`);
  if (r.level_upgraded) {
    console.log(`     ⚠️  等级上调: ${r.previous_level} → ${r.new_level}`);
  }
  console.log('');
});

console.log('【费用规则】');
data.feeRules.forEach(f => {
  const elder = data.elders.find(e => e.id === f.elder_id);
  console.log(`  ${elder ? elder.name : '未知'} - ${f.care_level}`);
  console.log(`     床位费: ¥${f.base_fee} | 护理费: ¥${f.nursing_fee} | 餐饮费: ¥${f.meal_fee} | 其他: ¥${f.other_fee}`);
  console.log(`     月费总计: ¥${f.total_fee} | 生效月份: ${f.effective_month}`);
  console.log('');
});

console.log('【通知消息】');
if (data.notifications.length === 0) {
  console.log('  暂无通知');
} else {
  data.notifications.forEach(n => {
    const elder = data.elders.find(e => e.id === n.elder_id);
    console.log(`  #${n.id} ${n.title}`);
    console.log(`     接收人: ${n.contact_name}（${elder ? elder.name : ''}）`);
    console.log(`     ${n.content}`);
    if (n.level_upgraded) {
      console.log(`     费用变化: ¥${n.previous_fee} → ¥${n.new_fee}`);
    }
    console.log('');
  });
}

console.log('========================================');
console.log('  初始化完成');
console.log('========================================');
console.log('');
console.log('提示: 运行 npm start 启动 API 服务');
console.log('      运行 npm run verify 运行验收测试');