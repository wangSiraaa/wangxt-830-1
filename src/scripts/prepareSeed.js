const path = require('path');
const fs = require('fs');

const {
  data,
  nextId,
  generateBizNo,
  addAuditLog,
  checkMissingItems,
  calculateTotalScore
} = require(path.join(__dirname, '..', 'app.js'));

const seedPath = path.join(__dirname, '..', '..', 'seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

console.log('========================================');
console.log('  养老院护理等级评估 - 数据准备');
console.log('========================================');
console.log('');

const createdElderIds = [];
const createdScaleIds = [];
const createdReviewBizNos = [];

console.log('【步骤 1/3】创建老人档案');
console.log('----------------------------------------');
for (let i = 0; i < seedData.elders.length; i++) {
  const elderData = seedData.elders[i];
  const id = nextId('elders');
  const elder = {
    id,
    ...elderData,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  data.elders.push(elder);
  createdElderIds.push(id);
  addAuditLog('create_elder', 'system', 'elder', id, `创建老人档案: ${elder.name}`);
  console.log(`  ✓ 老人 ${i + 1}: ${elder.name}`);
  console.log(`     老人ID: ${id}`);
  console.log(`     身份证: ${elder.id_card}`);
}
console.log('');

console.log('【步骤 2/3】提交评估量表');
console.log('----------------------------------------');
for (let i = 0; i < seedData.assessmentScales.length; i++) {
  const scaleData = seedData.assessmentScales[i];
  const elderIndex = scaleData.elder_index;
  const elderId = createdElderIds[elderIndex];
  const elder = data.elders.find(e => e.id === elderId);

  const missingItems = checkMissingItems(scaleData);
  const canGrade = missingItems.length === 0;
  const totalScore = calculateTotalScore(scaleData);
  let gradeReason = '';
  if (!canGrade) {
    const missingNames = missingItems.map(item => {
      const itemNames = {
        daily_living_score: '日常生活能力',
        mental_status_score: '精神状态',
        sensory_communication_score: '感知觉与沟通',
        social_participation_score: '社会参与',
        medical_condition_score: '疾病状况',
        nutritional_status_score: '营养状况',
        skin_condition_score: '皮肤状况',
        bowel_bladder_score: '大小便情况'
      };
      return itemNames[item] || item;
    }).join('、');
    gradeReason = '量表缺项，无法定级。缺少：' + missingNames;
  }

  const id = nextId('assessmentScales');
  const scale = {
    id,
    ...scaleData,
    elder_id: elderId,
    total_score: totalScore,
    missing_items: missingItems,
    can_grade: canGrade,
    grade_reason: gradeReason,
    status: 'submitted',
    created_at: new Date().toISOString()
  };
  delete scale.elder_index;
  data.assessmentScales.push(scale);
  createdScaleIds.push(id);
  addAuditLog('create_scale', scaleData.assessor_name || 'system', 'scale', id, `提交评估量表, 可定级: ${canGrade}`);
  
  console.log(`  ✓ 量表 ${i + 1}: ${elder ? elder.name : '未知老人'}`);
  console.log(`     量表ID: ${id}`);
  console.log(`     总分: ${totalScore}`);
  console.log(`     可定级: ${canGrade ? '是' : '否'}`);
  if (!canGrade) {
    console.log(`     缺项原因: ${gradeReason}`);
  }
}
console.log('');

console.log('【步骤 3/3】创建复核派单');
console.log('----------------------------------------');
for (let i = 0; i < seedData.reviewAssignments.length; i++) {
  const reviewData = seedData.reviewAssignments[i];
  const scaleIndex = reviewData.scale_index;
  const scaleId = createdScaleIds[scaleIndex];
  const scale = data.assessmentScales.find(s => s.id === scaleId);
  const elder = scale ? data.elders.find(e => e.id === scale.elder_id) : null;

  const id = nextId('reviewAssignments');
  const bizNo = generateBizNo('FH');
  const assignment = {
    id,
    biz_no: bizNo,
    scale_id: scaleId,
    elder_id: scale ? scale.elder_id : null,
    elder_name: elder ? elder.name : '',
    assigner_id: reviewData.assigner_id || null,
    assigner_name: reviewData.assigner_name || '系统',
    reviewer_id: reviewData.reviewer_id,
    reviewer_name: reviewData.reviewer_name,
    reason: reviewData.reason || '',
    priority: reviewData.priority || 'normal',
    status: 'pending',
    review_result: null,
    review_opinion: null,
    completed_at: null,
    created_at: new Date().toISOString()
  };
  data.reviewAssignments.push(assignment);
  createdReviewBizNos.push(bizNo);
  addAuditLog(
    'create_review_assignment',
    reviewData.assigner_name || 'system',
    'review_assignment',
    id,
    `创建复核派单: ${bizNo}, 量表ID: ${scaleId}, 指定复核人: ${reviewData.reviewer_name}, 原因: ${reviewData.reason || ''}`
  );

  console.log(`  ✓ 复核派单 ${i + 1}: ${elder ? elder.name : '未知老人'}`);
  console.log(`     派单编号: ${bizNo}`);
  console.log(`     量表ID: ${scaleId}`);
  console.log(`     复核人: ${reviewData.reviewer_name}`);
  console.log(`     优先级: ${reviewData.priority || 'normal'}`);
}
console.log('');

console.log('========================================');
console.log('  数据准备完成 - 业务编号汇总');
console.log('========================================');
console.log('');

console.log('【老人档案ID】');
for (let i = 0; i < createdElderIds.length; i++) {
  const elder = data.elders.find(e => e.id === createdElderIds[i]);
  console.log(`  ${elder ? elder.name : ''} -> ID: ${createdElderIds[i]}`);
}
console.log('');

console.log('【评估量表ID】');
for (let i = 0; i < createdScaleIds.length; i++) {
  const scale = data.assessmentScales.find(s => s.id === createdScaleIds[i]);
  const elder = scale ? data.elders.find(e => e.id === scale.elder_id) : null;
  console.log(`  ${elder ? elder.name : ''} -> 量表ID: ${createdScaleIds[i]}, 可定级: ${scale ? (scale.can_grade ? '是' : '否') : ''}`);
}
console.log('');

console.log('【复核派单编号】');
for (let i = 0; i < createdReviewBizNos.length; i++) {
  const assignment = data.reviewAssignments.find(a => a.biz_no === createdReviewBizNos[i]);
  console.log(`  ${assignment ? assignment.elder_name : ''} -> 派单编号: ${createdReviewBizNos[i]}, 状态: ${assignment ? assignment.status : ''}`);
}
console.log('');

console.log('========================================');
console.log('  准备完成');
console.log('========================================');
console.log('');
console.log('提示: 运行 npm start 启动 API 服务');
console.log('      可使用上述业务编号进行查询验证');

process.exit(0);
