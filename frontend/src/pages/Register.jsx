import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerAPI } from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    promptpay_no: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await registerAPI(formData);
      alert('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }

  return (
    <main className="auth-card">
      <h1>สมัครสมาชิก</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input aria-label="ชื่อผู้ใช้" placeholder="ชื่อผู้ใช้" autoComplete="username" required onChange={(event) => setFormData({ ...formData, username: event.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
        <input aria-label="อีเมล" placeholder="อีเมล" type="email" autoComplete="email" required onChange={(event) => setFormData({ ...formData, email: event.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
        <input aria-label="รหัสผ่าน" placeholder="รหัสผ่าน" type="password" autoComplete="new-password" required onChange={(event) => setFormData({ ...formData, password: event.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
        <input aria-label="ชื่อ-นามสกุล" placeholder="ชื่อ-นามสกุล" autoComplete="name" required onChange={(event) => setFormData({ ...formData, full_name: event.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
        <input aria-label="เบอร์พร้อมเพย์" placeholder="เบอร์พร้อมเพย์" onChange={(event) => setFormData({ ...formData, promptpay_no: event.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: '10px' }}>สมัครสมาชิก</button>
      </form>
      <p>มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
    </main>
  );
}
