import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { createDutyAPI, getDutiesAPI, getMyHouseAPI, toggleDutyAPI } from '../services/api';

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

function formatDueDate(value) {
  if (!value) return 'ไม่กำหนด';
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Duties() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [duties, setDuties] = useState([]);
  const [title, setTitle] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  async function loadDuties() {
    setLoading(true);
    setError('');
    try {
      const houseResponse = await getMyHouseAPI();
      setHouse(houseResponse.data);
      const dutiesResponse = await getDutiesAPI();
      setDuties(dutiesResponse.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        logout();
        navigate('/login', { replace: true });
      } else if ([404, 444].includes(requestError.response?.status)) {
        setHouse(null);
        setDuties([]);
      } else {
        setError(getErrorMessage(requestError, 'โหลดรายการเวรไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDuties();
  }, []);

  useEffect(() => {
    if (house?.members.length) {
      setAssignedUserId((current) => (
        house.members.some((member) => member.id === current)
          ? current
          : (house.members.find((member) => member.id === user?.id) || house.members[0]).id
      ));
    }
  }, [house, user?.id]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('กรุณาระบุรายละเอียดงาน');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        assigned_user_id: assignedUserId,
        ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      };
      const response = await createDutyAPI(payload);
      setDuties((current) => [response.data, ...current]);
      setTitle('');
      setDueDate('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'เพิ่มเวรไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(duty) {
    setError('');
    setUpdatingId(duty.id);
    try {
      const response = await toggleDutyAPI(duty.id);
      setDuties((current) => current.map((item) => (
        item.id === duty.id ? { ...item, is_completed: response.data.is_completed } : item
      )));
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        logout();
        navigate('/login', { replace: true });
      } else {
        setError(getErrorMessage(requestError, 'อัปเดตสถานะเวรไม่สำเร็จ กรุณาลองอีกครั้ง'));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return <main style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>กำลังโหลดรายการเวร...</main>;
  }

  return (
    <main style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <nav aria-label="เมนูหลัก" style={{ display: 'flex', gap: '12px' }}>
          <Link to="/dashboard">กลับไปหน้าบ้าน</Link>
          <Link to="/expenses">ค่าใช้จ่าย</Link>
        </nav>
        <span>เข้าสู่ระบบในชื่อ {user?.full_name || user?.email}</span>
        <button type="button" onClick={handleLogout}>ออกจากระบบ</button>
      </header>

      <h1>เวรประจำบ้าน{house ? ` - ${house.name}` : ''}</h1>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {!house ? (
        <section>
          <p>กรุณาสร้างบ้านหรือเข้าร่วมบ้านก่อนจัดการเวร</p>
          <Link to="/dashboard">ตั้งค่าบ้าน</Link>
        </section>
      ) : (
        <>
          <section style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <h2>มอบหมายเวรใหม่</h2>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                รายละเอียดงาน
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="เช่น ทิ้งขยะ หรือทำความสะอาดห้องครัว"
                  maxLength={120}
                  required
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                มอบหมายให้
                <select
                  value={assignedUserId}
                  onChange={(event) => setAssignedUserId(event.target.value)}
                  required
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px' }}
                >
                  {house.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} (@{member.username})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                กำหนดเสร็จ (ไม่บังคับ)
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', boxSizing: 'border-box' }}
                />
              </label>
              <button type="submit" disabled={submitting || !assignedUserId} style={{ padding: '10px 16px' }}>
                {submitting ? 'กำลังบันทึก...' : 'มอบหมายเวร'}
              </button>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>รายการเวร</h2>
              <button type="button" onClick={loadDuties}>รีเฟรช</button>
            </div>
            {duties.length === 0 ? (
              <p>ยังไม่มีรายการเวร เพิ่มงานแรกได้จากแบบฟอร์มด้านบน</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {duties.map((duty) => (
                  <li key={duty.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ textDecoration: duty.is_completed ? 'line-through' : 'none' }}>
                        {duty.title}
                      </strong>
                      <p style={{ margin: '6px 0' }}>ผู้รับผิดชอบ: {duty.assigned_user_name}</p>
                      <p style={{ margin: 0 }}>กำหนดเสร็จ: {formatDueDate(duty.due_date)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingId === duty.id}
                      onClick={() => handleToggle(duty)}
                    >
                      {updatingId === duty.id
                        ? 'กำลังบันทึก...'
                        : duty.is_completed
                          ? 'ทำเครื่องหมายว่ายังไม่เสร็จ'
                          : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
