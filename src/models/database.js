const data = {
  elders: [],
  assessmentScales: [],
  assessmentResults: [],
  notifications: [],
  feeRules: [],
  users: [],
  counters: {
    elders: 0,
    assessmentScales: 0,
    assessmentResults: 0,
    notifications: 0,
    feeRules: 0,
    users: 0
  }
};

function nextId(type) {
  data.counters[type]++;
  return data.counters[type];
}

function initDatabase() {
  console.log("内存数据库初始化完成");
}

module.exports = { data, nextId, initDatabase };
