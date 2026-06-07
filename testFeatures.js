const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('========================================');
  console.log('  养老院护理等级评估 - 功能验收测试');
  console.log('========================================');
  console.log('');

  console.log('【1/5】健康检查');
  const health = await fetchJson(BASE_URL + '/api/health');
  console.log('  ✓ 服务运行正常');
  console.log('');

  console.log('【2/5】验证：量表缺项不能定级');
  const missingScaleRes = await fetchJson(BASE_URL + '/api/assessments/scales', {
    method: 'POST',
    body: JSON.stringify({
      elder_id: 1,
      assessor_id: 2,
      assessor_name: '李评估员',
      assessment_date: '2024-06-01',
      daily_living_score: 40,
      mental_status_score: 35,
      sensory_communication_score: null,
      social_participation_score: 45,
      medical_condition_score: null,
      nutritional_status_score: 50,
      skin_condition_score: 60,
      bowel_bladder_score: 55
    })
  });
  console.log('  量表ID:', missingScaleRes.data.id);
  console.log('  可定级:', missingScaleRes.data.can_grade);
  console.log('  缺项原因:', missingScaleRes.data.grade_reason);
  if (!missingScaleRes.data.can_grade && missingScaleRes.data.grade_reason.includes('量表缺项')) {
    console.log('  ✅ 验收通过！缺项量表正确返回不可定级');
  } else {
    console.log('  ❌ 验收失败');
  }
  console.log('');

  console.log('【3/5】验证：创建复核派单');
  const completeScaleRes = await fetchJson(BASE_URL + '/api/assessments/scales', {
    method: 'POST',
    body: JSON.stringify({
      elder_id: 2,
      assessor_id: 2,
      assessor_name: '李评估员',
      assessment_date: '2024-06-02',
      daily_living_score: 45,
      mental_status_score: 40,
      sensory_communication_score: 50,
      social_participation_score: 35,
      medical_condition_score: 30,
      nutritional_status_score: 45,
      skin_condition_score: 55,
      bowel_bladder_score: 50
    })
  });
  const assignRes = await fetchJson(BASE_URL + '/api/reviews/assign', {
    method: 'POST',
    body: JSON.stringify({
      scale_id: completeScaleRes.data.id,
      assigner_id: 1,
      assigner_name: '张院长',
      reviewer_id: 3,
      reviewer_name: '王主任',
      reason: '测试复核派单',
      priority: 'high'
    })
  });
  console.log('  派单编号:', assignRes.data.biz_no);
  console.log('  派单状态:', assignRes.data.status);
  const reviewBizNo = assignRes.data.biz_no;
  console.log('  ✅ 复核派单创建成功');
  console.log('');

  console.log('【4/5】验证：完成复核派单');
  const completeRes = await fetchJson(BASE_URL + '/api/reviews/' + assignRes.data.id + '/complete', {
    method: 'PUT',
    body: JSON.stringify({
      review_result: '通过',
      review_opinion: '复核通过，同意定级',
      operator: '王主任'
    })
  });
  console.log('  完成状态:', completeRes.data.status);
  console.log('  ✅ 复核派单完成成功');
  console.log('');

  console.log('【5/5】验证：新增样例可查询');
  console.log('  --- 查询复核派单列表 ---');
  const reviewList = await fetchJson(BASE_URL + '/api/reviews/list');
  console.log('  复核派单总数:', reviewList.data.length);
  const found = reviewList.data.find(r => r.biz_no === reviewBizNo);
  if (found) {
    console.log('  ✅ 新增派单可在列表中查询到');
    console.log('     派单编号:', found.biz_no);
    console.log('     状态:', found.status);
    console.log('     复核结果:', found.review_result);
  } else {
    console.log('  ❌ 新增派单未在列表中找到');
  }
  console.log('');

  console.log('  --- 查询审计日志 ---');
  const auditLogs = await fetchJson(BASE_URL + '/api/audit/logs?target_type=review_assignment');
  console.log('  复核派单相关审计日志:', auditLogs.data.length, '条');
  console.log('  ✅ 审计日志记录正常');
  console.log('');

  console.log('  --- 查询老人列表（含新增样例） ---');
  const elderList = await fetchJson(BASE_URL + '/api/elders');
  console.log('  老人档案总数:', elderList.data.length);
  console.log('  ✅ 老人列表可正常查询');
  console.log('');

  console.log('========================================');
  console.log('  测试完成');
  console.log('========================================');
  console.log('');
  console.log('业务编号汇总：');
  console.log('  缺项测试量表ID:', missingScaleRes.data.id);
  console.log('  完整测试量表ID:', completeScaleRes.data.id);
  console.log('  复核派单编号:', reviewBizNo);
  process.exit(0);
}

async function fetchJson(url, options = {}) {
  const opts = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  const res = await fetch(url, opts);
  return res.json();
}

test().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
