import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { loginAPI } from '../services/api';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await loginAPI(formData);
      login(response.data.user, response.data.access_token);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    }
  }

  return (
    <main style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>เข้าสู่ระบบ</h1>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: '12px' }}>
          อีเมล
          <input
            type="email"
            value={formData.email}
            autoComplete="email"
            required
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '12px' }}>
          รหัสผ่าน
          <input
            type="password"
            value={formData.password}
            autoComplete="current-password"
            required
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', boxSizing: 'border-box' }}
          />
        </label>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>เข้าสู่ระบบ</button>
      </form>
      <p>ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link></p>
    </main>
  );
}
