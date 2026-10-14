import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { createHouseAPI, getMyHouseAPI, joinHouseAPI } from '../services/api';

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export default function HouseSetup() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [houseName, setHouseName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loadingError, setLoadingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function fetchHouse() {
    setLoading(true);
    setLoadingError('');
    try {
      const response = await getMyHouseAPI();
      setHouse(response.data);
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setHouse(null);
      } else if (requestError.response?.status === 401) {
        logout();
        navigate('/login', { replace: true });
      } else {
        setLoadingError(getErrorMessage(requestError, 'โหลดข้อมูลบ้านไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHouse();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await createHouseAPI({ name: houseName });
      setHouse(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'สร้างบ้านไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await joinHouseAPI({ invite_code: inviteCode });
      setHouse(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'เข้าร่วมบ้านไม่สำเร็จ กรุณาตรวจสอบรหัสเชิญแล้วลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return <main className="app-page app-loading">กำลังโหลดข้อมูลบ้าน...</main>;
  }

  return (
    <main className="app-page">
      <header className="app-header">
        <span>เข้าสู่ระบบในชื่อ {user?.full_name || user?.email}</span>
        <button type="button" onClick={handleLogout}>ออกจากระบบ</button>
      </header>

      {loadingError ? (
        <section className="alert" role="alert">
          <p>{loadingError}</p>
          <button type="button" onClick={fetchHouse}>ลองอีกครั้ง</button>
        </section>
      ) : house ? (
        <section className="panel house-panel">
          <div className="page-intro">
            <h1>บ้านของคุณ: {house.name}</h1>
            <p>จัดการสมาชิก ค่าใช้จ่าย และงานบ้านได้จากที่นี่</p>
          </div>
          <p><Link to="/expenses">ดูรายการค่าใช้จ่ายในบ้าน</Link></p>
          <p><Link to="/duties">จัดการเวรประจำบ้าน</Link></p>
          <p>รหัสเชิญ: <strong>{house.invite_code}</strong></p>
          <h2>สมาชิก ({house.members.length})</h2>
          <ul className="member-list">
            {house.members.map((member) => (
              <li className="member-row" key={member.id}>
                <strong>{member.full_name}</strong> (@{member.username})
                {member.promptpay_no ? ` - พร้อมเพย์: ${member.promptpay_no}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <div className="page-intro">
            <h1>ตั้งค่าบ้านของคุณ</h1>
          <p>สร้างบ้านใหม่หรือเข้าร่วมบ้านด้วยรหัสเชิญ</p>
          </div>
          {error && <p className="alert" role="alert">{error}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
            <form className="panel" onSubmit={handleCreate} style={{ flex: '1 1 240px' }}>
              <h2>สร้างบ้าน</h2>
              <input
                aria-label="ชื่อบ้าน"
                placeholder="ชื่อบ้าน"
                value={houseName}
                onChange={(event) => setHouseName(event.target.value)}
                required
                style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }}
              />
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px' }}>
                {submitting ? 'กรุณารอสักครู่...' : 'สร้างบ้าน'}
              </button>
            </form>

            <form className="panel" onSubmit={handleJoin} style={{ flex: '1 1 240px' }}>
              <h2>เข้าร่วมบ้าน</h2>
              <input
                aria-label="รหัสเชิญ"
                placeholder="รหัสเชิญ"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                required
                style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }}
              />
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px' }}>
                {submitting ? 'กรุณารอสักครู่...' : 'เข้าร่วมบ้าน'}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
