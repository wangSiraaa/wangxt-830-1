const express = require('express');
const router = express.Router();
const { data, nextId } = require('../models/database');

router.get('/', (req, res) => {
  const { status, name } = req.query;
  let elders = [...data.elders];
  
  if (status) {
    elders = elders.filter(e => e.status === status);
  }
  if (name) {
    elders = elders.filter(e => e.name.includes(name));
  }
  elders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ success: true, data: elders });
});

router.get('/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) {
    return res.status(404).json({ success: false, message: '老人档案不存在' });
  }
  res.json({ success: true, data: elder });
});

router.post('/', (req, res) => {
  const { name, id_card, gender, birth_date, admission_date, room_number, current_level, contact_name, contact_phone, contact_relation } = req.body;
  
  if (!name || !id_card) {
    return res.status(400).json({ success: false, message: '姓名和身份证号必填' });
  }

  const exists = data.elders.find(e => e.id_card === id_card);
  if (exists) {
    return res.status(400).json({ success: false, message: '身份证号已存在' });
  }

  const id = nextId('elders');
  const elder = {
    id,
    name,
    id_card,
    gender: gender || null,
    birth_date: birth_date || null,
    admission_date: admission_date || null,
    room_number: room_number || null,
    current_level: current_level || null,
    contact_name: contact_name || null,
    contact_phone: contact_phone || null,
    contact_relation: contact_relation || null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  data.elders.push(elder);
  res.json({ success: true, data: { id } });
});

router.put('/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) {
    return res.status(404).json({ success: false, message: '老人档案不存在' });
  }

  const fields = ['name', 'id_card', 'gender', 'birth_date', 'admission_date', 'room_number', 'current_level', 'contact_name', 'contact_phone', 'contact_relation', 'status'];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      elder[field] = req.body[field];
    }
  }
  elder.updated_at = new Date().toISOString();

  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  const elder = data.elders.find(e => e.id === Number(req.params.id));
  if (!elder) {
    return res.status(404).json({ success: false, message: '老人档案不存在' });
  }
  
  elder.status = 'inactive';
  elder.updated_at = new Date().toISOString();
  res.json({ success: true, message: '已停用' });
});

module.exports = router;
