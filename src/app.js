const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const data = {
  elders: [],
  assessmentScales: [],
  assessmentResults: [],
  notifications: [],
  feeRules: [],
  users: [],
  reviewAssignments: [],
  auditLogs: [],
  counters: { elders: 0, assessmentScales: 0, assessmentResults: 0, notifications: 0, feeRules: 0, users: 0, reviewAssignments: 0, auditLogs: 0 }
};

function nextId(type) {
  if (!data.counters[type]) data.counters[type] = 0;
  data.counters[type]++;
  return data.counters[type];
}

function generateBizNo(prefix) {
  const now = new Date();
  const dateStr = now.getFullYear().toString() + 
    (now.getMonth() + 1).toString().padStart(2, '0') + 
    now.getDate().toString().padStart(2, '0');
  const seq = (nextId('seq_' + prefix) % 10000).toString().padStart(4, '0');
  return prefix + dateStr + seq;
}

function addAuditLog(action, operator, targetType, targetId, detail) {
  const id = nextId('auditLogs');
  const log = {
    id,
    action,
    operator,
    target_type: targetType,
    target_id: targetId,
    detail: detail || '',
    created_at: new Date().toISOString()
  };
  data.auditLogs.push(log);
  return id;
}

const REQUIRED_ITEMS = [
  'daily_living_score', 'mental_status_score', 'sensory_communication_score',
  'social_participation_score', 'medical_condition_score', 'nutritional_status_score',
  'skin_condition_score', 'bowel_bladder_score'
];

const ITEM_NAMES = {
  daily_living_score: '日常生活能力',
  mental_status_score: '精神状态',
  sensory_communication_score: '感知觉与沟通',
  social_participation_score: '社会参与',
  medical_condition_score: '疾病状况',
  nutritional_status_score: '营养状况',
  skin_condition_score: '皮肤状况',
  bowel_bladder_score: '大小便情况'
};

const LEVEL_RULES = [
  { min: 0, max: 15, level: '特级护理', desc: '完全失能，需24小时专人护理' },
  { min: 16, max: 30, level: '一级护理', desc: '重度失能，需大量护理协助' },
  { min: 31, max: 50, level: '二级护理', desc: '中度失能，需部分护理协助' },
  { min: 51, max: 70, level: '三级护理', desc: '轻度失能，需少量护理协助' },
  { min: 71, max: 100, level: '自理级', desc: '基本自理，仅需日常监护' }
];

const FEE_RULES = {
  '特级护理': { base_fee: 3000, nursing_fee: 5000, meal_fee: 1500, other_fee: 500 },
  '一级护理': { base_fee: 2500, nursing_fee: 3500, meal_fee: 1500, other_fee: 300 },
  '二级护理': { base_fee: 2000, nursing_fee: 2500, meal_fee: 1500, other_fee: 200 },
  '三级护理': { base_fee: 1800, nursing_fee: 1500, meal_fee: 1500, other_fee: 100 },
  '自理级': { base_fee: 1500, nursing_fee: 800, meal_fee: 1500, other_fee: 0 }
};

function checkMissingItems(scaleData) {
  const missing = [];
  for (const item of REQUIRED_ITEMS) {
    if (scaleData[item] === null || scaleData[item] === undefined || scaleData[item] === '') {
      missing.push(item);
    }
  }
  return missing;
}

function calculateTotalScore(scaleData) {
  let total = 0;
  for (const item of REQUIRED_ITEMS) {
    if (scaleData[item] !== null && scaleData[item] !== undefined) {
      total += Number(scaleData[item]) || 0;
    }
  }
  return total;
}

function determineLevel(totalScore) {
  for (const rule of LEVEL_RULES) {
    if (totalScore >= rule.min && totalScore <= rule.max) {
      return { level: rule.level, desc: rule.desc };
    }
  }
  return { level: '自理级', desc: '基本自理' };
}

function isLevelUpgraded(oldLevel, newLevel) {
  const priority = ['自理级', '三级护理', '二级护理', '一级护理', '特级护理'];
  const oldIdx = priority.indexOf(oldLevel);
  const newIdx = priority.indexOf(newLevel);
  return newIdx > oldIdx;
}

function initData() {
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const currentMonth = today.substring(0, 7);
  const elders = [
    { name: '陈爷爷', id_card: '110101194001011234', gender: '男', birth_date: '1940-01-01', admission_date: '2023-01-15', room_number: 'A-101', current_level: '二级护理', contact_name: '陈小明', contact_phone: '13800138001', contact_relation: '儿子', health_notes: '高血压、糖尿病' },
    { name: '李奶奶', id_card: '110101194502022345', gender: '女', birth_date: '1945-02-02', admission_date: '2023-03-20', room_number: 'B-203', current_level: '三级护理', contact_name: '李小红', contact_phone: '13800138002', contact_relation: '女儿', health_notes: '关节炎、骨质疏松' },
    { name: '王爷爷', id_card: '110101193803033456', gender: '男', birth_date: '1938-03-03', admission_date: '2022-06-10', room_number: 'A-105', current_level: '一级护理', contact_name: '王大明', contact_phone: '13800138003', contact_relation: '儿子', health_notes: '冠心病、轻度认知障碍' },
    { name: '张奶奶', id_card: '110101194204044567', gender: '女', birth_date: '1942-04-04', admission_date: '2023-07-01', room_number: 'B-102', current_level: '自理级', contact_name: '张小花', contact_phone: '13800138004', contact_relation: '女儿', health_notes: '健康状况良好' },
    { name: '刘爷爷', id_card: '110101193505055678', gender: '男', birth_date: '1935-05-05', admission_date: '2022-12-01', room_number: 'C-301', current_level: '特级护理', contact_name: '刘大伟', contact_phone: '13800138005', contact_relation: '侄子', health_notes: '阿尔茨海默症、卧床' }
  ];
  for (const e of elders) {
    const id = nextId('elders');
    data.elders.push({ ...e, id, status: 'active', created_at: now, updated_at: now });
  }
  const assessmentScales = [
    { elder_id: 1, assessor_id: 2, assessor_name: '李评估员', assessment_date: '2024-01-10', scale_type: 'standard', daily_living_score: 45, mental_status_score: 40, sensory_communication_score: 50, social_participation_score: 35, medical_condition_score: 30, nutritional_status_score: 45, skin_condition_score: 55, bowel_bladder_score: 50 },
    { elder_id: 2, assessor_id: 2, assessor_name: '李评估员', assessment_date: '2024-01-12', scale_type: 'standard', daily_living_score: 60, mental_status_score: 55, sensory_communication_score: 65, social_participation_score: 50, medical_condition_score: 55, nutritional_status_score: 60, skin_condition_score: 65, bowel_bladder_score: 60 },
    { elder_id: 3, assessor_id: 2, assessor_name: '李评估员', assessment_date: '2024-01-08', scale_type: 'standard', daily_living_score: 25, mental_status_score: 20, sensory_communication_score: 30, social_participation_score: 15, medical_condition_score: 18, nutritional_status_score: 28, skin_condition_score: 35, bowel_bladder_score: 22 },
    { elder_id: 1, assessor_id: 2, assessor_name: '李评估员', assessment_date: '2024-02-15', scale_type: 'standard', daily_living_score: 35, mental_status_score: 30, sensory_communication_score: 40, social_participation_score: 25, medical_condition_score: 22, nutritional_status_score: 38, skin_condition_score: 45, bowel_bladder_score: 38 },
    { elder_id: 5, assessor_id: 2, assessor_name: '李评估员', assessment_date: '2024-01-05', scale_type: 'standard', daily_living_score: 5, mental_status_score: 3, sensory_communication_score: 8, social_participation_score: 2, medical_condition_score: 5, nutritional_status_score: 10, skin_condition_score: 12, bowel_bladder_score: 6 }
  ];
  for (const s of assessmentScales) {
    const id = nextId('assessmentScales');
    const totalScore = calculateTotalScore(s);
    data.assessmentScales.push({ ...s, id, total_score: totalScore, missing_items: [], can_grade: true, grade_reason: '', status: 'submitted', created_at: now });
  }
  const resultsData = [
    { elder_id: 1, scale_id: 1, previous_level: null, new_level: '二级护理', level_upgraded: 0 },
    { elder_id: 2, scale_id: 2, previous_level: null, new_level: '三级护理', level_upgraded: 0 },
    { elder_id: 3, scale_id: 3, previous_level: null, new_level: '一级护理', level_upgraded: 0 },
    { elder_id: 1, scale_id: 4, previous_level: '二级护理', new_level: '一级护理', level_upgraded: 1 },
    { elder_id: 5, scale_id: 5, previous_level: null, new_level: '特级护理', level_upgraded: 0 }
  ];
  for (const r of resultsData) {
    const scale = data.assessmentScales.find(s => s.id === r.scale_id);
    const elder = data.elders.find(e => e.id === r.elder_id);
    const id = nextId('assessmentResults');
    const levelInfo = determineLevel(scale ? scale.total_score : 0);
    data.assessmentResults.push({ id, elder_id: r.elder_id, scale_id: r.scale_id, previous_level: r.previous_level, new_level: r.new_level, level_upgraded: r.level_upgraded, assessment_date: scale ? scale.assessment_date : today, effective_date: today, total_score: scale ? scale.total_score : 0, level_reason: levelInfo.desc, status: 'effective', created_at: now });
    if (elder) { elder.current_level = r.new_level; elder.updated_at = now; }
  }
  for (const elder of data.elders) {
    const feeConfig = FEE_RULES[elder.current_level] || FEE_RULES['自理级'];
    const totalFee = feeConfig.base_fee + feeConfig.nursing_fee + feeConfig.meal_fee + feeConfig.other_fee;
    const id = nextId('feeRules');
    data.feeRules.push({ id, elder_id: elder.id, result_id: null, care_level: elder.current_level, ...feeConfig, total_fee: totalFee, effective_month: currentMonth, status: 'active', created_at: now });
  }
  const upgradedResults = data.assessmentResults.filter(r => r.level_upgraded === 1);
  for (const result of upgradedResults) {
    const elder = data.elders.find(e => e.id === result.elder_id);
    if (elder && result.previous_level) {
      const prevFee = FEE_RULES[result.previous_level] || FEE_RULES['自理级'];
      const newFee = FEE_RULES[result.new_level];
      const prevTotal = prevFee.base_fee + prevFee.nursing_fee + prevFee.meal_fee + prevFee.other_fee;
      const newTotal = newFee.base_fee + newFee.nursing_fee + newFee.meal_fee + newFee.other_fee;
      const nid = nextId('notifications');
      data.notifications.push({ id: nid, elder_id: elder.id, result_id: result.id, contact_name: elder.contact_name || '家属', contact_phone: elder.contact_phone || '', notification_type: 'level_up', title: '护理等级上调通知', content: '您好，' + elder.name + '的护理等级已从' + result.previous_level + '调整为' + result.new_level + '。', previous_level: result.previous_level, new_level: result.new_level, previous_fee: prevTotal, new_fee: newTotal, status: 'unread', created_at: now });
    }
  }
  const reviewAssignments = [
    { scale_id: 1, assigner_id: 1, assigner_name: '张院长', reviewer_id: 3, reviewer_name: '王主任', reason: '等级评定需复核', priority: 'normal' },
    { scale_id: 4, assigner_id: 1, assigner_name: '张院长', reviewer_id: 3, reviewer_name: '王主任', reason: '等级上调需复核', priority: 'high' }
  ];
  for (const ra of reviewAssignments) {
    const id = nextId('reviewAssignments');
    const scale = data.assessmentScales.find(s => s.id === ra.scale_id);
    const elder = data.elders.find(e => e.id === scale ? scale.elder_id : null);
    const bizNo = generateBizNo('FH');
    data.reviewAssignments.push({ id, biz_no: bizNo, ...ra, elder_id: scale ? scale.elder_id : null, elder_name: elder ? elder.name : '', status: 'pending', review_result: null, review_opinion: null, completed_at: null, created_at: now });
    addAuditLog('create_review_assignment', ra.assigner_name, 'review_assignment', id, `创建复核派单: ${bizNo}, 指定复核人: ${ra.reviewer_name}`);
  }
  console.log('初始化数据完成：');
  console.log('  - 老人档案：' + data.elders.length + ' 位');
  console.log('  - 评估量表：' + data.assessmentScales.length + ' 份');
  console.log('  - 评估结论：' + data.assessmentResults.length + ' 条');
  console.log('  - 通知消息：' + data.notifications.length + ' 条');
  console.log('  - 费用规则：' + data.feeRules.length + ' 条');
  console.log('  - 复核派单：' + data.reviewAssignments.length + ' 条');
  console.log('  - 审计日志：' + data.auditLogs.length + ' 条');
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '养老院护理等级评估服务运行中', timestamp: new Date().toISOString() });
});

app.get('/api/elders', (req, res) => {
  let elders = [...data.elders];
  if (req.query.status) elders = elders.filter(e => e.status === req.query.status);
  if (req.query.name) elders = elders.filter(e => e.name.includes(req.query.name));
  elders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: elders });
});

app.get('/api/elders/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  res.json({ success: true, data: elder });
});

app.post('/api/elders', (req, res) => {
  const { name, id_card } = req.body;
  if (!name || !id_card) return res.status(400).json({ success: false, message: '姓名和身份证号必填' });
  if (data.elders.find(e => e.id_card === id_card)) return res.status(400).json({ success: false, message: '身份证号已存在' });
  const id = nextId('elders');
  const elder = { id, ...req.body, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.elders.push(elder);
  addAuditLog('create_elder', 'system', 'elder', id, `创建老人档案: ${elder.name}`);
  res.json({ success: true, data: { id } });
});

app.put('/api/elders/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  for (const k of Object.keys(req.body)) elder[k] = req.body[k];
  elder.updated_at = new Date().toISOString();
  addAuditLog('update_elder', 'system', 'elder', elder.id, `更新老人档案: ${elder.name}`);
  res.json({ success: true, message: '更新成功' });
});

app.delete('/api/elders/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  elder.status = 'inactive';
  elder.updated_at = new Date().toISOString();
  addAuditLog('deactivate_elder', 'system', 'elder', elder.id, `停用老人档案: ${elder.name}`);
  res.json({ success: true, message: '已停用' });
});

app.post('/api/assessments/scales', (req, res) => {
  const missingItems = checkMissingItems(req.body);
  const canGrade = missingItems.length === 0;
  const totalScore = calculateTotalScore(req.body);
  let gradeReason = '';
  if (!canGrade) {
    const missingNames = missingItems.map(item => ITEM_NAMES[item] || item).join('、');
    gradeReason = '量表缺项，无法定级。缺少：' + missingNames;
  }
  const id = nextId('assessmentScales');
  const scale = { id, ...req.body, total_score: totalScore, missing_items: missingItems, can_grade: canGrade, grade_reason: gradeReason, status: 'submitted', created_at: new Date().toISOString() };
  data.assessmentScales.push(scale);
  addAuditLog('create_scale', req.body.assessor_name || 'system', 'scale', id, `提交评估量表, 可定级: ${canGrade}`);
  res.json({ success: true, data: { id, can_grade: canGrade, grade_reason: gradeReason, total_score: totalScore, missing_items: missingItems } });
});

app.get('/api/assessments/scales/:id', (req, res) => {
  const scale = data.assessmentScales.find(s => s.id === Number(req.params.id));
  if (!scale) return res.status(404).json({ success: false, message: '量表不存在' });
  res.json({ success: true, data: scale });
});

app.get('/api/assessments/scales/elder/:elderId', (req, res) => {
  const scales = data.assessmentScales.filter(s => s.elder_id === Number(req.params.elderId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: scales });
});

app.post('/api/assessments/results', (req, res) => {
  const { scale_id } = req.body;
  if (!scale_id) return res.status(400).json({ success: false, message: '缺少量表ID' });
  const scale = data.assessmentScales.find(s => s.id === Number(scale_id));
  if (!scale) return res.status(404).json({ success: false, message: '量表不存在' });
  if (!scale.can_grade) return res.status(400).json({ success: false, message: scale.grade_reason || '量表缺项，无法生成评估结论' });
  const elder = data.elders.find(e => e.id === scale.elder_id);
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  const levelInfo = determineLevel(scale.total_score);
  const previousLevel = elder.current_level;
  const levelUpgraded = previousLevel && isLevelUpgraded(previousLevel, levelInfo.level) ? 1 : 0;
  const today = new Date().toISOString().split('T')[0];
  const id = nextId('assessmentResults');
  const result = { id, elder_id: scale.elder_id, scale_id, previous_level: previousLevel, new_level: levelInfo.level, level_upgraded: levelUpgraded, assessment_date: scale.assessment_date, effective_date: today, total_score: scale.total_score, level_reason: levelInfo.desc, status: 'effective', created_at: new Date().toISOString() };
  data.assessmentResults.push(result);
  elder.current_level = levelInfo.level;
  elder.updated_at = new Date().toISOString();
  addAuditLog('create_result', 'system', 'result', id, `生成评估结论: ${elder.name} - ${levelInfo.level}`);
  if (levelUpgraded) {
    const prevFee = FEE_RULES[previousLevel] || FEE_RULES['自理级'];
    const newFee = FEE_RULES[levelInfo.level];
    const prevTotal = prevFee.base_fee + prevFee.nursing_fee + prevFee.meal_fee + prevFee.other_fee;
    const newTotal = newFee.base_fee + newFee.nursing_fee + newFee.meal_fee + newFee.other_fee;
    const nid = nextId('notifications');
    data.notifications.push({ id: nid, elder_id: elder.id, result_id: id, contact_name: elder.contact_name || '家属', contact_phone: elder.contact_phone || '', notification_type: 'level_up', title: '护理等级上调通知', content: '您好，' + elder.name + '的护理等级已从' + previousLevel + '调整为' + levelInfo.level + '。', previous_level: previousLevel, new_level: levelInfo.level, previous_fee: prevTotal, new_fee: newTotal, status: 'unread', created_at: new Date().toISOString() });
  }
  const feeConfig = FEE_RULES[levelInfo.level] || FEE_RULES['自理级'];
  const totalFee = feeConfig.base_fee + feeConfig.nursing_fee + feeConfig.meal_fee + feeConfig.other_fee;
  const effectiveMonth = today.substring(0, 7);
  for (const fr of data.feeRules) { if (fr.elder_id === elder.id && fr.status === 'active') fr.status = 'inactive'; }
  const fid = nextId('feeRules');
  data.feeRules.push({ id: fid, elder_id: elder.id, result_id: id, care_level: levelInfo.level, ...feeConfig, total_fee: totalFee, effective_month: effectiveMonth, status: 'active', created_at: new Date().toISOString() });
  res.json({ success: true, data: { id, previous_level: previousLevel, new_level: levelInfo.level, level_upgraded: levelUpgraded, effective_date: today } });
});

app.get('/api/assessments/results/elder/:elderId', (req, res) => {
  const results = data.assessmentResults.filter(r => r.elder_id === Number(req.params.elderId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: results });
});

app.post('/api/reviews/assign', (req, res) => {
  const { scale_id, assigner_id, assigner_name, reviewer_id, reviewer_name, reason, priority } = req.body;
  if (!scale_id || !reviewer_id || !reviewer_name) {
    return res.status(400).json({ success: false, message: '量表ID、复核人ID、复核人姓名必填' });
  }
  const scale = data.assessmentScales.find(s => s.id === Number(scale_id));
  if (!scale) return res.status(404).json({ success: false, message: '量表不存在' });
  const elder = data.elders.find(e => e.id === scale.elder_id);
  const id = nextId('reviewAssignments');
  const bizNo = generateBizNo('FH');
  const assignment = {
    id,
    biz_no: bizNo,
    scale_id: Number(scale_id),
    elder_id: scale.elder_id,
    elder_name: elder ? elder.name : '',
    assigner_id: assigner_id || null,
    assigner_name: assigner_name || '系统',
    reviewer_id: Number(reviewer_id),
    reviewer_name,
    reason: reason || '',
    priority: priority || 'normal',
    status: 'pending',
    review_result: null,
    review_opinion: null,
    completed_at: null,
    created_at: new Date().toISOString()
  };
  data.reviewAssignments.push(assignment);
  addAuditLog(
    'create_review_assignment',
    assigner_name || 'system',
    'review_assignment',
    id,
    `创建复核派单: ${bizNo}, 量表ID: ${scale_id}, 指定复核人: ${reviewer_name}, 原因: ${reason || ''}`
  );
  res.json({ success: true, data: { id, biz_no: bizNo, status: 'pending' } });
});

app.get('/api/reviews/list', (req, res) => {
  let assignments = [...data.reviewAssignments];
  if (req.query.status) assignments = assignments.filter(a => a.status === req.query.status);
  if (req.query.reviewer_id) assignments = assignments.filter(a => a.reviewer_id === Number(req.query.reviewer_id));
  if (req.query.elder_id) assignments = assignments.filter(a => a.elder_id === Number(req.query.elder_id));
  assignments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: assignments });
});

app.get('/api/reviews/:id', (req, res) => {
  const assignment = data.reviewAssignments.find(a => a.id === Number(req.params.id));
  if (!assignment) return res.status(404).json({ success: false, message: '复核派单不存在' });
  res.json({ success: true, data: assignment });
});

app.put('/api/reviews/:id/complete', (req, res) => {
  const assignment = data.reviewAssignments.find(a => a.id === Number(req.params.id));
  if (!assignment) return res.status(404).json({ success: false, message: '复核派单不存在' });
  if (assignment.status === 'completed') {
    return res.status(400).json({ success: false, message: '该复核派单已完成，不可重复提交' });
  }
  const { review_result, review_opinion, operator } = req.body;
  if (!review_result) {
    return res.status(400).json({ success: false, message: '复核结果必填' });
  }
  assignment.status = 'completed';
  assignment.review_result = review_result;
  assignment.review_opinion = review_opinion || '';
  assignment.completed_at = new Date().toISOString();
  addAuditLog(
    'complete_review_assignment',
    operator || assignment.reviewer_name,
    'review_assignment',
    assignment.id,
    `完成复核派单: ${assignment.biz_no}, 结果: ${review_result}, 意见: ${review_opinion || ''}`
  );
  res.json({ success: true, message: '复核完成', data: { id: assignment.id, status: 'completed' } });
});

app.get('/api/audit/logs', (req, res) => {
  let logs = [...data.auditLogs];
  if (req.query.target_type) logs = logs.filter(l => l.target_type === req.query.target_type);
  if (req.query.target_id) logs = logs.filter(l => l.target_id === Number(req.query.target_id));
  if (req.query.operator) logs = logs.filter(l => l.operator === req.query.operator);
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: logs });
});

app.get('/api/notifications/elder/:elderId', (req, res) => {
  const notifications = data.notifications.filter(n => n.elder_id === Number(req.params.elderId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: notifications });
});

app.get('/api/notifications/contact/:phone', (req, res) => {
  const notifications = data.notifications.filter(n => n.contact_phone === req.params.phone).map(n => {
    const elder = data.elders.find(e => e.id === n.elder_id);
    return { ...n, elder_name: elder ? elder.name : '' };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: notifications });
});

app.get('/api/notifications/:id', (req, res) => {
  const n = data.notifications.find(x => x.id === Number(req.params.id));
  if (!n) return res.status(404).json({ success: false, message: '通知不存在' });
  res.json({ success: true, data: n });
});

app.put('/api/notifications/:id/read', (req, res) => {
  const n = data.notifications.find(x => x.id === Number(req.params.id));
  if (n) n.status = 'read';
  res.json({ success: true, message: '已标记为已读' });
});

app.get('/api/fees/elder/:elderId', (req, res) => {
  const fees = data.feeRules.filter(f => f.elder_id === Number(req.params.elderId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: fees });
});

app.get('/api/fees/elder/:elderId/current', (req, res) => {
  const fee = data.feeRules.find(f => f.elder_id === Number(req.params.elderId) && f.status === 'active');
  if (!fee) return res.status(404).json({ success: false, message: '未找到当前费用规则' });
  res.json({ success: true, data: fee });
});

app.get('/api/dashboard/level-up-reminders', (req, res) => {
  const reminders = data.assessmentResults.filter(r => r.level_upgraded === 1).map(r => {
    const elder = data.elders.find(e => e.id === r.elder_id);
    const scale = data.assessmentScales.find(s => s.id === r.scale_id);
    return { ...r, elder_name: elder ? elder.name : '', room_number: elder ? elder.room_number : '', contact_name: elder ? elder.contact_name : '', contact_phone: elder ? elder.contact_phone : '', assessment_date: scale ? scale.assessment_date : '', total_score: scale ? scale.total_score : 0 };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ success: true, data: reminders });
});

initData();

app.listen(PORT, () => {
  console.log('服务已启动: http://localhost:' + PORT);
  console.log('健康检查: GET /api/health');
});

module.exports = { app, data, initData, checkMissingItems, calculateTotalScore, determineLevel, FEE_RULES, REQUIRED_ITEMS, ITEM_NAMES, LEVEL_RULES, nextId, generateBizNo, addAuditLog };
