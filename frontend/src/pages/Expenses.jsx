import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  createExpenseAPI,
  confirmPaymentAPI,
  getPaymentProofAPI,
  getExpensesAPI,
  getMyHouseAPI,
  requestPaymentReplacementAPI,
  submitPaymentProofAPI,
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
  const [paymentActionId, setPaymentActionId] = useState(null);
  const [replacementReasons, setReplacementReasons] = useState({});
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

  async function handleSubmitProof(expenseId, file) {
    if (!file) return;
    setError('');
    setPaymentActionId(`${expenseId}:${user.id}`);
    try {
      const response = await submitPaymentProofAPI(expenseId, file);
      setExpenses((current) => current.map((expense) => (
        expense.id === expenseId
          ? response.data
          : expense
      )));
    } catch (requestError) {
      setError(errorMessage(requestError, 'ส่งหลักฐานการโอนไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setPaymentActionId(null);
    }
  }

  async function handleConfirmPayment(expenseId, memberId) {
    setError('');
    setPaymentActionId(`${expenseId}:${memberId}`);
    try {
      const response = await confirmPaymentAPI(expenseId, memberId);
      setExpenses((current) => current.map((expense) => (
        expense.id === expenseId ? response.data : expense
      )));
    } catch (requestError) {
      setError(errorMessage(requestError, 'ยืนยันการชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setPaymentActionId(null);
    }
  }

  async function handleRequestReplacement(expenseId, memberId) {
    const actionId = `${expenseId}:${memberId}`;
    const reason = replacementReasons[actionId]?.trim() || '';
    if (reason.length < 5) {
      setError('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษรก่อนขอหลักฐานใหม่');
      return;
    }
    setError('');
    setPaymentActionId(actionId);
    try {
      const response = await requestPaymentReplacementAPI(expenseId, memberId, reason);
      setExpenses((current) => current.map((expense) => (
        expense.id === expenseId ? response.data : expense
      )));
      setReplacementReasons((current) => ({ ...current, [actionId]: '' }));
    } catch (requestError) {
      setError(errorMessage(requestError, 'ขอหลักฐานใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง'));
    } finally {
      setPaymentActionId(null);
    }
  }

  async function handleViewProof(expenseId, memberId) {
    const proofWindow = window.open('', '_blank');
    if (!proofWindow) {
      setError('เบราว์เซอร์บล็อกหน้าต่างหลักฐาน กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง');
      return;
    }
    proofWindow.document.title = 'กำลังโหลดหลักฐานการโอน...';
    try {
      const response = await getPaymentProofAPI(expenseId, memberId);
      const proofUrl = URL.createObjectURL(response.data);
      proofWindow.location.href = proofUrl;
      window.setTimeout(() => URL.revokeObjectURL(proofUrl), 60_000);
    } catch (requestError) {
      proofWindow.close();
      setError(errorMessage(requestError, 'เปิดหลักฐานการโอนไม่สำเร็จ กรุณาลองอีกครั้ง'));
    }
  }

  if (loading) {
    return <main className="app-page app-loading">กำลังโหลดรายการค่าใช้จ่าย...</main>;
  }

  return (
    <main className="app-page">
      <header className="app-header">
        <Link to="/dashboard">กลับไปหน้าบ้าน</Link>
        <Link to="/duties">จัดการเวร</Link>
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

      <div className="page-intro">
        <h1>ค่าใช้จ่ายในบ้าน{house ? ` - ${house.name}` : ''}</h1>
        <p>ติดตามรายการและแบ่งค่าใช้จ่ายของสมาชิกในบ้าน</p>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}

      {!house ? (
        <section className="empty-state">
          <p>กรุณาสร้างบ้านหรือเข้าร่วมบ้านก่อนเพิ่มค่าใช้จ่าย</p>
          <Link to="/dashboard">ตั้งค่าบ้าน</Link>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginBottom: '24px' }}>
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

          <section className="panel">
            <h2>รายการค่าใช้จ่าย</h2>
            {expenses.length === 0 ? (
              <p>ยังไม่มีรายการค่าใช้จ่าย เพิ่มรายการแรกได้จากแบบฟอร์มด้านบน</p>
            ) : (
              <ul className="card-list">
                {expenses.map((expense) => {
                  const myShare = expense.splits[user?.id];
                  const isMyShareSettled = expense.settled_users.includes(user?.id);
                  return (
                    <li key={expense.id} className="expense-card">
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
                          const proofSubmitted = expense.payment_proof_users?.includes(memberId);
                          const replacementReason = expense.payment_rejection_reasons?.[memberId];
                          const isCreator = expense.paid_by_id === user?.id;
                          return (
                            <li key={memberId}>
                              <div className="expense-share">
                                <span>
                                  {member?.full_name || 'สมาชิกในบ้าน'}: {formatAmount(amount)} — {
                                    settled ? 'ยืนยันแล้ว' : replacementReason
                                      ? 'ขอหลักฐานใหม่'
                                      : proofSubmitted ? 'ส่งหลักฐานแล้ว · รอยืนยัน' : 'ยังไม่ชำระ'
                                  }
                                </span>
                                {replacementReason && (
                                  <p className="payment-rejection-reason">
                                    เหตุผลที่ขอหลักฐานใหม่: {replacementReason}
                                  </p>
                                )}
                                {isCreator && proofSubmitted && !settled && (
                                  <div className="payment-actions">
                                    <button type="button" className="button-secondary" onClick={() => handleViewProof(expense.id, memberId)}>
                                      ดูสลิป
                                    </button>
                                    {!replacementReason && (
                                      <button
                                        type="button"
                                        disabled={paymentActionId === `${expense.id}:${memberId}`}
                                        onClick={() => handleConfirmPayment(expense.id, memberId)}
                                      >
                                        {paymentActionId === `${expense.id}:${memberId}` ? 'กำลังยืนยัน...' : 'ยืนยันว่าได้รับเงินแล้ว'}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {isCreator && proofSubmitted && !settled && !replacementReason && (
                                  <div className="replacement-request">
                                    <label>
                                      ขอให้ส่งสลิปใหม่ พร้อมระบุเหตุผล
                                      <textarea
                                        value={replacementReasons[`${expense.id}:${memberId}`] || ''}
                                        onChange={(event) => setReplacementReasons((current) => ({
                                          ...current,
                                          [`${expense.id}:${memberId}`]: event.target.value,
                                        }))}
                                        minLength={5}
                                        maxLength={500}
                                        rows={2}
                                        placeholder="เช่น ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="button-secondary"
                                      disabled={paymentActionId === `${expense.id}:${memberId}`}
                                      onClick={() => handleRequestReplacement(expense.id, memberId)}
                                    >
                                      ขอหลักฐานใหม่
                                    </button>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {myShare !== undefined && (
                        isMyShareSettled ? (
                          <p>ส่วนแบ่งของคุณชำระแล้ว ({formatAmount(myShare)})</p>
                        ) : (
                          <label className="proof-upload">
                            {expense.payment_rejection_reasons?.[user?.id]
                              ? 'ส่งสลิปใหม่ตามคำขอ'
                              : expense.payment_proof_users?.includes(user?.id)
                              ? 'แนบสลิปใหม่ (รอผู้สร้างบิลยืนยัน)'
                              : `แนบสลิปหลังโอน ${formatAmount(myShare)}`}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              disabled={paymentActionId === `${expense.id}:${user?.id}`}
                              onChange={(event) => {
                                const [file] = event.target.files || [];
                                if (file) handleSubmitProof(expense.id, file);
                                event.target.value = '';
                              }}
                            />
                            <small>รองรับ JPG, PNG, WEBP หรือ PDF ขนาดไม่เกิน 5 MB</small>
                          </label>
                        )
                      )}
                      {expense.payment_history?.length > 0 && (
                        <details className="payment-history">
                          <summary>ประวัติการชำระเงิน ({expense.payment_history.length})</summary>
                          <ol>
                            {expense.payment_history.map((event, index) => {
                              const actor = house.members.find((member) => member.id === event.actor_id);
                              const member = house.members.find((candidate) => candidate.id === event.member_id);
                              const description = event.action === 'submitted'
                                ? 'ส่งหลักฐานการโอน'
                                : event.action === 'replacement_requested'
                                  ? 'ขอให้ส่งหลักฐานใหม่'
                                  : 'ยืนยันการชำระเงิน';
                              return (
                                <li key={`${event.created_at}-${index}`}>
                                  <span>
                                    {actor?.full_name || 'สมาชิก'} {description}
                                    {event.action !== 'submitted' && member ? ` ของ${member.full_name}` : ''}
                                  </span>
                                  <time dateTime={event.created_at}>
                                    {new Date(event.created_at).toLocaleString('th-TH')}
                                  </time>
                                  {event.reason && <p>{event.reason}</p>}
                                </li>
                              );
                            })}
                          </ol>
                        </details>
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
