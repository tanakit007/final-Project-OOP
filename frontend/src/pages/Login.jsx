import { useState, useContext } from 'react';
import { loginAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginAPI(formData);
      login(res.data.user, res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>เข้าสู่ระบบ</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" required onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>Login</button>
      </form>
      <p>ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link></p>
    </div>
  );
}