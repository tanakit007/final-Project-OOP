import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        setLoadingError(
          getErrorMessage(requestError, 'Could not load your house. Check your connection and try again.')
        );
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
      setError(getErrorMessage(requestError, 'Could not create the house. Please try again.'));
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
      setError(getErrorMessage(requestError, 'Could not join the house. Check the invite code and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return <main style={{ maxWidth: '600px', margin: '30px auto', padding: '20px' }}>Loading your house...</main>;
  }

  return (
    <main style={{ maxWidth: '600px', margin: '30px auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span>Signed in as {user?.full_name || user?.email}</span>
        <button type="button" onClick={handleLogout}>Log out</button>
      </header>

      {loadingError ? (
        <section role="alert" style={{ color: 'red' }}>
          <p>{loadingError}</p>
          <button type="button" onClick={fetchHouse}>Try again</button>
        </section>
      ) : house ? (
        <section style={{ border: '1px solid #4CAF50', padding: '20px', borderRadius: '8px' }}>
          <h1>Your house: {house.name}</h1>
          <p>Invite code: <strong>{house.invite_code}</strong></p>
          <h2>Members ({house.members.length})</h2>
          <ul>
            {house.members.map((member) => (
              <li key={member.id}>
                <strong>{member.full_name}</strong> (@{member.username})
                {member.promptpay_no ? ` - PromptPay: ${member.promptpay_no}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <h1>Set up your house</h1>
          <p>Create a house or join one using an invite code.</p>
          {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
            <form onSubmit={handleCreate} style={{ flex: '1 1 240px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h2>Create a house</h2>
              <input
                placeholder="House name"
                value={houseName}
                onChange={(event) => setHouseName(event.target.value)}
                required
                style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
              />
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px' }}>
                {submitting ? 'Please wait...' : 'Create house'}
              </button>
            </form>

            <form onSubmit={handleJoin} style={{ flex: '1 1 240px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h2>Join a house</h2>
              <input
                placeholder="Invite code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                required
                style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
              />
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px' }}>
                {submitting ? 'Please wait...' : 'Join house'}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
