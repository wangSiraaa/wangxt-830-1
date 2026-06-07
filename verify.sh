#!/bin/bash
BASE_URL=http://localhost:3000
echo "养老院护理等级评估 API 验收测试"
echo ""
echo "1. 健康检查"
curl -s $BASE_URL/api/health
echo ""
echo ""
echo "2. 提交缺项量表（核心验收）"
RESP=$(curl -s -X POST $BASE_URL/api/assessments/scales -H "Content-Type: application/json" -d '{"elder_id":1,"daily_living_score":40,"mental_status_score":35,"sensory_communication_score":null,"social_participation_score":45,"medical_condition_score":null,"nutritional_status_score":50,"skin_condition_score":60,"bowel_bladder_score":55}')
echo "响应: $RESP"
echo ""
if echo "$RESP" | grep -q "量表缺项"; then
  echo "✅ 验收通过！提交缺项量表返回不可定级原因"
  exit 0
else
  echo "❌ 验收失败"
  exit 1
fi
