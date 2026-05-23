<script>
  import { user, token } from '../lib/stores';
  import axios from 'axios';

  export let role = 'client';

  let username = '';
  let password = '';
  let isRegistering = false;
  let error = '';
  let secretInput = '';
  let showSecretPrompt = false;

  const toggleRegister = () => {
    if (!isRegistering && role === 'admin') {
      showSecretPrompt = true;
      error = '';
    } else {
      isRegistering = !isRegistering;
      showSecretPrompt = false;
    }
  };

  const handleSecretSubmit = () => {
    if (secretInput === 'BillionsMustLearn') {
      isRegistering = true;
      showSecretPrompt = false;
      secretInput = '';
      error = '';
    } else {
      error = 'Incorrect secret password';
    }
  };

  const handleSubmit = async () => {
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const res = await axios.post(`http://localhost:3000/api${endpoint}`, { username, password, role });
      $token = res.data.token;
      $user = { 
        id: res.data.id,
        username: res.data.username, 
        role: res.data.role,
        total_xp: res.data.total_xp || 0,
        streak: res.data.streak || 0
      };
      error = '';
    } catch (e) {
      error = e.response?.data?.error || 'Something went wrong';
    }
  };
</script>

<div class="auth-container role-{role}">
  {#if showSecretPrompt}
    <h1>Admin Access</h1>
    <p class="prompt-text">Enter the secret password to create an admin account.</p>
    
    <form on:submit|preventDefault={handleSecretSubmit}>
      <input type="password" placeholder="Secret Password" bind:value={secretInput} autofocus required />
      <button type="submit">Verify Secret</button>
    </form>
    <button class="link cancel-btn" on:click={() => showSecretPrompt = false}>&larr; Cancel</button>
  {:else}
    <h1>{role === 'client' ? '' : 'ADMIN'} {isRegistering ? 'Join' : 'Welcome'}</h1>
    
    <form on:submit|preventDefault={handleSubmit}>
      <input type="text" placeholder="Username" bind:value={username} required />
      <input type="password" placeholder="Password" bind:value={password} required />
      <button type="submit">{isRegistering ? 'Create Account' : 'Sign In'}</button>
    </form>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if !showSecretPrompt}
    <p>
      {isRegistering ? 'Already have an account?' : 'New here?'}
      <button class="link" on:click={toggleRegister}>
        {isRegistering ? 'Log in' : 'Create an account'}
      </button>
    </p>
  {/if}
</div>

<style>
  .auth-container {
    max-width: 400px;
    margin: 100px auto;
    padding: 2.5rem 2rem;
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  }
  h1 {
    font-size: 2.2em;
    color: #58cc02;
    margin: 0 0 25px 0;
    line-height: 1.1;
    font-weight: 800;
  }
  .prompt-text {
    color: #777;
    margin-bottom: 20px;
  }
  .cancel-btn {
    margin-top: 20px;
  }
  .auth-container.role-admin {
    border-color: #1cb0f6;
  }
  .role-admin h1 {
    color: #1cb0f6;
  }
  .role-admin button:not(.link) {
    background: #1cb0f6;
    border-bottom: 4px solid #1482b5;
  }
  input {
    width: 100%;
    padding: 14px;
    margin: 12px 0;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    box-sizing: border-box;
    font-size: 1em;
    font-family: inherit;
    transition: border-color 0.2s;
  }
  input:focus {
    outline: none;
    border-color: #1cb0f6;
  }
  button {
    width: 100%;
    padding: 14px;
    background: #58cc02;
    color: white;
    border: none;
    border-bottom: 4px solid #46a302;
    border-radius: 12px;
    font-weight: bold;
    font-size: 1.1em;
    cursor: pointer;
    margin-top: 10px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  button:active {
    border-bottom: 0;
    margin-top: 14px;
  }
  .link {
    background: none;
    border: none;
    color: #1cb0f6;
    display: inline;
    width: auto;
    padding: 0;
    cursor: pointer;
    font-weight: bold;
    text-transform: none;
    letter-spacing: normal;
  }
  .link:hover {
    text-decoration: underline;
  }
  .error { 
    color: #ff4b4b; 
    margin-top: 15px; 
    font-weight: bold;
    background: #ff4b4b11;
    padding: 10px;
    border-radius: 8px;
  }
</style>
