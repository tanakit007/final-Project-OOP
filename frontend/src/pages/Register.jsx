import { useState } from 'react';
import { registerAPI } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    promptpay_no: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerAPI(formData);
      alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>สมัครสมาชิก</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Username" required onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        <input placeholder="Email" type="email" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        <input placeholder="Password" type="password" required onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        <input placeholder="ชื่อ-นามสกุล" required onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        <input placeholder="เบอร์ PromptPay (ถ้ามี)" onChange={(e) => setFormData({ ...formData, promptpay_no: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        <button type="submit" style={{ width: '100%', padding: '10px' }}>Register</button>
      </form>
      <p>มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
    </div>
  );
}