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
  counters: { elders: 0, assessmentScales: 0, assessmentResults: 0, notifications: 0, feeRules: 0, users: 0 }
};

function nextId(type) {
  data.counters[type]++;
  return data.counters[type];
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
  const elders = [
    { name: '陈爷爷', id_card: '110101194001011234', gender: '男', birth_date: '1940-01-01', admission_date: '2023-01-15', room_number: 'A-101', current_level: '二级护理', contact_name: '陈小明', contact_phone: '13800138001', contact_relation: '儿子' },
    { name: '李奶奶', id_card: '110101194502022345', gender: '女', birth_date: '1945-02-02', admission_date: '2023-03-20', room_number: 'B-203', current_level: '三级护理', contact_name: '李小红', contact_phone: '13800138002', contact_relation: '女儿' },
    { name: '王爷爷', id_card: '110101193803033456', gender: '男', birth_date: '1938-03-03', admission_date: '2022-06-10', room_number: 'A-105', current_level: '一级护理', contact_name: '王大明', contact_phone: '13800138003', contact_relation: '儿子' }
  ];
  for (const e of elders) {
    const id = nextId('elders');
    data.elders.push({ ...e, id, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  const currentMonth = new Date().toISOString().substring(0, 7);
  for (const elder of data.elders) {
    const feeConfig = FEE_RULES[elder.current_level] || FEE_RULES['自理级'];
    const totalFee = feeConfig.base_fee + feeConfig.nursing_fee + feeConfig.meal_fee + feeConfig.other_fee;
    const id = nextId('feeRules');
    data.feeRules.push({ id, elder_id: elder.id, result_id: null, care_level: elder.current_level, ...feeConfig, total_fee: totalFee, effective_month: currentMonth, status: 'active', created_at: new Date().toISOString() });
  }
  console.log('初始化数据完成');
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
  res.json({ success: true, data: { id } });
});

app.put('/api/elders/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  for (const k of Object.keys(req.body)) elder[k] = req.body[k];
  elder.updated_at = new Date().toISOString();
  res.json({ success: true, message: '更新成功' });
});

app.delete('/api/elders/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) return res.status(404).json({ success: false, message: '老人档案不存在' });
  elder.status = 'inactive';
  elder.updated_at = new Date().toISOString();
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

module.exports = app;
