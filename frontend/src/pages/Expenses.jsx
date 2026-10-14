import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  createExpenseAPI,
  getExpensesAPI,
  getMyHouseAPI,
  settleExpenseAPI,
} from '../services/api';

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

function formatAmount(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
}

function amountInSatang(value) {
  return Math.round(Number(value) * 100);
}

export default function Expenses() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState('EQUAL');
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [error, setError] = useState('');

  async function loadExpenses() {
    setLoading(true);
    setError('');
    try {
      const houseResponse = await getMyHouseAPI();
      setHouse(houseResponse.data);
      const expensesResponse = await getExpensesAPI();
      setExpenses(expensesResponse.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        logout();
        navigate('/login', { replace: true });
      } else if ([404, 444].includes(requestError.response?.status)) {
        setHouse(null);
        setExpenses([]);
      } else {
        setError(errorMessage(requestError, 'โหลดรายการค่าใช้จ่ายไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');

    const totalCents = amountInSatang(totalAmount);
    if (!Number.isFinite(totalCents) || totalCents <= 0) {
      setError('กรุณาระบุยอดเงินที่มากกว่าศูนย์');
      return;
    }

    let customSplitAmounts;
    if (splitType === 'CUSTOM') {
      customSplitAmounts = {};
      for (const member of house.members) {
        const value = customSplits[member.id];
        const amount = Number(value);
        if (value === undefined || value === '' || !Number.isFinite(amount) || amount < 0) {
          setError(`กรุณาระบุยอดส่วนแบ่งของ ${member.full_name} ให้ถูกต้อง`);
          return;
        }
        customSplitAmounts[member.id] = amount;
      }

      const splitTotal = Object.values(customSplitAmounts)
        .reduce((sum, amount) => sum + amountInSatang(amount), 0);
      if (splitTotal !== totalCents) {
        setError('ยอดส่วนแบ่งทั้งหมดต้องเท่ากับยอดค่าใช้จ่าย');
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await createExpenseAPI({
        title: title.trim(),
        total_amount: Number(totalAmount),
        split_type: splitType,
        ...(splitType === 'CUSTOM' ? { custom_splits: customSplitAmounts } : {}),
      });
      setExpenses((current) => [response.data, ...current]);
      setTitle('');
      setTotalAmount('');
      setCustomSplits({});
    } catch (requestError) {
      setError(errorMessage(requestError, 'เพิ่มค่าใช้จ่ายไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle(expenseId) {
    setError('');
    setSettlingId(expenseId);
    try {
      await settleExpenseAPI(expenseId);
      setExpenses((current) => current.map((expense) => (
        expense.id === expenseId
          ? { ...expense, settled_users: [...expense.settled_users, user.id] }
          : expense
      )));
    } catch (requestError) {
      setError(errorMessage(requestError, 'บันทึกการชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setSettlingId(null);
    }
  }

  if (loading) {
    return <main style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>กำลังโหลดรายการค่าใช้จ่าย...</main>;
  }

  return (
    <main style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/dashboard">กลับไปหน้าบ้าน</Link>
        <span>เข้าสู่ระบบในชื่อ {user?.full_name || user?.email}</span>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          ออกจากระบบ
        </button>
      </header>

      <h1>ค่าใช้จ่ายในบ้าน{house ? ` - ${house.name}` : ''}</h1>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {!house ? (
        <section>
          <p>กรุณาสร้างบ้านหรือเข้าร่วมบ้านก่อนเพิ่มค่าใช้จ่าย</p>
          <Link to="/dashboard">ตั้งค่าบ้าน</Link>
        </section>
      ) : (
        <>
          <section style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <h2>เพิ่มค่าใช้จ่าย</h2>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                รายละเอียด
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="เช่น ค่าไฟฟ้า"
                  required
                  maxLength={120}
                  style={{ display: 'block', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                ยอดรวม (บาท)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  required
                  style={{ display: 'block', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '12px' }}>
                วิธีหารค่าใช้จ่าย
                <select
                  value={splitType}
                  onChange={(event) => setSplitType(event.target.value)}
                  style={{ display: 'block', width: '100%', padding: '8px' }}
                >
                  <option value="EQUAL">หารเท่ากัน</option>
                  <option value="CUSTOM">กำหนดยอดของแต่ละคน</option>
                </select>
              </label>

              {splitType === 'CUSTOM' && (
                <fieldset style={{ marginBottom: '12px' }}>
                  <legend>ยอดส่วนแบ่งของสมาชิกแต่ละคน (บาท)</legend>
                  {house.members.map((member) => (
                    <label key={member.id} style={{ display: 'block', marginBottom: '8px' }}>
                      {member.full_name}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customSplits[member.id] ?? ''}
                        onChange={(event) => setCustomSplits((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))}
                        required
                        style={{ display: 'block', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      />
                    </label>
                  ))}
                </fieldset>
              )}

              <button type="submit" disabled={submitting} style={{ padding: '10px 16px' }}>
                {submitting ? 'กำลังบันทึก...' : 'เพิ่มค่าใช้จ่าย'}
              </button>
            </form>
          </section>

          <section>
            <h2>รายการค่าใช้จ่าย</h2>
            {expenses.length === 0 ? (
              <p>ยังไม่มีรายการค่าใช้จ่าย เพิ่มรายการแรกได้จากแบบฟอร์มด้านบน</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {expenses.map((expense) => {
                  const myShare = expense.splits[user?.id];
                  const isMyShareSettled = expense.settled_users.includes(user?.id);
                  return (
                    <li key={expense.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px' }}>
                        <strong>{expense.title}</strong>
                        <strong>{formatAmount(expense.total_amount)}</strong>
                      </div>
                      <p style={{ marginBottom: '8px' }}>
                        ผู้จ่าย: {expense.paid_by_name} · {new Date(expense.created_at).toLocaleString('th-TH')}
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        {expense.split_type === 'EQUAL' ? 'หารเท่ากัน' : 'กำหนดยอดเอง'}
                      </p>
                      <ul>
                        {Object.entries(expense.splits).map(([memberId, amount]) => {
                          const member = house.members.find((candidate) => candidate.id === memberId);
                          const settled = expense.settled_users.includes(memberId);
                          return (
                            <li key={memberId}>
                              {member?.full_name || 'สมาชิกในบ้าน'}: {formatAmount(amount)} — {settled ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                            </li>
                          );
                        })}
                      </ul>
                      {myShare !== undefined && (
                        isMyShareSettled ? (
                          <p>คุณชำระส่วนแบ่งแล้ว ({formatAmount(myShare)})</p>
                        ) : (
                          <button
                            type="button"
                            disabled={settlingId === expense.id}
                            onClick={() => handleSettle(expense.id)}
                          >
                            {settlingId === expense.id ? 'กำลังบันทึก...' : `ยืนยันว่าชำระส่วนแบ่ง ${formatAmount(myShare)} แล้ว`}
                          </button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
