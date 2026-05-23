<script>
  import { user, token } from './lib/stores';
  import axios from 'axios';
  import Login from './views/Login.svelte';
  import Path from './views/Path.svelte';
  import Chat from './views/Chat.svelte';
  import Leaderboard from './views/Leaderboard.svelte';
  import Board from './views/Board.svelte';

  let currentView = 'path';
  let loginRole = null; // null, 'client', or 'admin'

  const logout = () => {
    $user = null;
    $token = null;
    loginRole = null;
  };

  // Global error handling for auth
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        logout();
      }
      return Promise.reject(error);
    }
  );
</script>

<main>
  {#if !$user}
    {#if !loginRole}
      <div class="landing">
        <div class="landing-content">
          <img src="/src/assets/logo.svg" alt="Comunidad Logo" class="hero-img" />
          <h1>Comunidad</h1>
          <p>Bond with your Hispanic Neighbors</p>
          <div class="role-selector">
            <button class="learner-btn" on:click={() => loginRole = 'client'}>GET STARTED</button>
            <button class="admin-btn" on:click={() => loginRole = 'admin'}>ADMIN PORTAL</button>
          </div>
        </div>
      </div>
    {:else}
      <div class="back-nav">
        <button class="link" on:click={() => loginRole = null}>&larr; Back to Role Selection</button>
      </div>
      <Login role={loginRole} />
    {/if}
  {:else}
    <nav>
      <div class="nav-content">
        <div class="nav-left">
          <img src="/src/assets/logo.svg" alt="Logo" class="nav-logo" />
          <div class="links">
            <button class:active={currentView === 'path'} on:click={() => currentView = 'path'}>LEARN</button>
            <button class:active={currentView === 'board'} on:click={() => currentView = 'board'}>BOARD</button>
            <button class:active={currentView === 'chat'} on:click={() => currentView = 'chat'}>CHAT</button>
            <button class:active={currentView === 'leaderboard'} on:click={() => currentView = 'leaderboard'}>LEADERBOARD</button>
          </div>
        </div>
        <div class="user-info">
          <span class="role-tag" class:admin={$user.role === 'admin'}>
            {$user.role === 'client' ? 'learner' : $user.role}
          </span>
          <span>{$user.username}</span>
          <span class="xp">{$user.total_xp} XP</span>
          <button class="logout" on:click={logout}>Logout</button>
        </div>
      </div>
    </nav>

    <div class="main-content">
      {#if currentView === 'path'}
        <Path />
      {:else if currentView === 'board'}
        <Board currentUser={$user} />
      {:else if currentView === 'chat'}
        <Chat />
      {:else if currentView === 'leaderboard'}
        <Leaderboard />
      {/if}
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Din Round', sans-serif, Arial;
    background-color: #fff;
    color: #4b4b4b;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Global Scrollbar Theme */
  :global(::-webkit-scrollbar) {
    width: 10px;
  }
  :global(::-webkit-scrollbar-track) {
    background: #f1f9ff;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: #1cb0f6;
    border-radius: 10px;
    transition: background 0.2s;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: #1899d6;
  }
  :global(::-webkit-scrollbar-thumb:active) {
    background: #1482b5;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  nav {
    border-bottom: 2px solid #e5e5e5;
    padding: 10px 0;
    background: white;
    z-index: 100;
    flex-shrink: 0;
  }
  .nav-content {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
  }
  .nav-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .nav-logo {
    height: 35px;
    width: auto;
  }
  .links button {
    background: none;
    border: none;
    padding: 10px 15px;
    font-weight: bold;
    color: #afafaf;
    cursor: pointer;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .links button.active {
    color: #1cb0f6;
  }
  .main-content {
    flex-grow: 1;
    overflow-y: auto;
    width: 100%;
    background-color: #fff;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 20px;
    font-weight: bold;
  }
  .xp { color: #ffc800; }
  .role-tag {
    font-size: 0.7em;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e5e5e5;
    color: #777;
    text-transform: uppercase;
  }
  .role-tag.admin {
    background: #1cb0f6;
    color: white;
  }
  .logout {
    background: none;
    border: 1px solid #e5e5e5;
    padding: 5px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    color: #afafaf;
  }
  .logout:hover {
    background: #f7f7f7;
    color: #4b4b4b;
  }

  /* Landing Styles */
  .landing {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
  }
  .landing-content {
    text-align: center;
    max-width: 600px;
    padding: 20px;
  }
  .hero-img {
    width: 200px;
    margin-bottom: 15px;
  }
  .landing h1 {
    font-size: 3.5em;
    color: #58cc02;
    margin: 0 0 10px 0;
    line-height: 1.1;
  }
  .landing p {
    font-size: 1.5em;
    color: #afafaf;
    margin-bottom: 40px;
    font-weight: bold;
  }
  .role-selector {
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-width: 300px;
    margin: 0 auto;
  }
  .role-selector button {
    padding: 15px 30px;
    font-size: 1.1em;
    font-weight: bold;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    color: white;
    transition: transform 0.1s, filter 0.2s;
  }
  .role-selector button:active {
    transform: translateY(4px);
  }
  .learner-btn {
    background: #58cc02;
    border-bottom: 5px solid #46a302;
  }
  .admin-btn {
    background: #1cb0f6;
    border-bottom: 5px solid #1482b5;
  }
  .back-nav {
    max-width: 400px;
    margin: 40px auto -80px;
    padding: 0 20px;
  }
  .link {
    background: none;
    border: none;
    color: #afafaf;
    cursor: pointer;
    font-weight: bold;
    font-size: 1.1em;
  }
  .link:hover {
    color: #1cb0f6;
  }
</style>