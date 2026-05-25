<script>
  import { user, token } from './lib/stores';
  import axios from 'axios';
  import Login from './views/Login.svelte';
  import Path from './views/Path.svelte';
  import Chat from './views/Chat.svelte';
  import Leaderboard from './views/Leaderboard.svelte';
  import Board from './views/Board.svelte';
  import logoUrl from './assets/logo.svg';

  let currentView = 'path';
  let loginRole = null;
  let mobileMenuOpen = false;

  const logout = () => {
    $user = null;
    $token = null;
    loginRole = null;
  };

  const navigate = (view) => {
    currentView = view;
    mobileMenuOpen = false;
  };

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) logout();
      return Promise.reject(error);
    }
  );
</script>

<main>
  {#if !$user}
    {#if !loginRole}
      <div class="landing">
        <div class="landing-content">
          <img src={logoUrl} alt="Comunidad Logo" class="hero-img" />
          <h1>Comunidad</h1>
          <p>Learn Spanish with a Community of Learners</p>
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
          <img src={logoUrl} alt="Logo" class="nav-logo" />
          <!-- Desktop links -->
          <div class="links desktop-links">
            <button class:active={currentView === 'path'} on:click={() => navigate('path')}>LEARN</button>
            <button class:active={currentView === 'board'} on:click={() => navigate('board')}>BOARD</button>
            <button class:active={currentView === 'chat'} on:click={() => navigate('chat')}>CHAT</button>
            <button class:active={currentView === 'leaderboard'} on:click={() => navigate('leaderboard')}>LEADERBOARD</button>
          </div>
        </div>
        <div class="nav-right">
          <div class="user-info">
            <span class="role-tag" class:admin={$user.role === 'admin'}>
              {$user.role === 'client' ? 'learner' : $user.role}
            </span>
            <span class="username-display">{$user.username}</span>
            <span class="xp">{$user.total_xp} XP</span>
            <button class="logout" on:click={logout}>Logout</button>
          </div>
          <!-- Hamburger -->
          <button class="hamburger" on:click={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      {#if mobileMenuOpen}
        <div class="mobile-menu">
          <button class:active={currentView === 'path'} on:click={() => navigate('path')}>LEARN</button>
          <button class:active={currentView === 'board'} on:click={() => navigate('board')}>BOARD</button>
          <button class:active={currentView === 'chat'} on:click={() => navigate('chat')}>CHAT</button>
          <button class:active={currentView === 'leaderboard'} on:click={() => navigate('leaderboard')}>LEADERBOARD</button>
          <div class="mobile-user-info">
            <span class="role-tag" class:admin={$user.role === 'admin'}>
              {$user.role === 'client' ? 'learner' : $user.role}
            </span>
            <span>{$user.username}</span>
            <span class="xp">{$user.total_xp} XP</span>
            <button class="logout" on:click={logout}>Logout</button>
          </div>
        </div>
      {/if}
    </nav>

    <!-- Mobile bottom tabs -->
    <div class="bottom-tabs">
      <button class:active={currentView === 'path'} on:click={() => navigate('path')}>
        <span class="tab-icon">📚</span>
        <span>Learn</span>
      </button>
      <button class:active={currentView === 'board'} on:click={() => navigate('board')}>
        <span class="tab-icon">📌</span>
        <span>Board</span>
      </button>
      <button class:active={currentView === 'chat'} on:click={() => navigate('chat')}>
        <span class="tab-icon">💬</span>
        <span>Chat</span>
      </button>
      <button class:active={currentView === 'leaderboard'} on:click={() => navigate('leaderboard')}>
        <span class="tab-icon">🏆</span>
        <span>Rank</span>
      </button>
    </div>

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
  
  :global(::-webkit-scrollbar) { width: 10px; }
  :global(::-webkit-scrollbar-track) { background: #f1f9ff; }
  :global(::-webkit-scrollbar-thumb) { background: #1cb0f6; border-radius: 10px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: #1899d6; }
  :global(::-webkit-scrollbar-thumb:active) { background: #1482b5; }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
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
  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .nav-logo { height: 35px; width: auto; }
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
  .links button.active { color: #1cb0f6; }

  .main-content {
    flex-grow: 1;
    overflow-y: auto;
    width: 100%;
    background-color: #fff;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
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
  .role-tag.admin { background: #1cb0f6; color: white; }
  .logout {
    background: none;
    border: 1px solid #e5e5e5;
    padding: 5px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    color: #afafaf;
  }
  .logout:hover { background: #f7f7f7; color: #4b4b4b; }

  /* Hamburger */
  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
  }
  .hamburger span {
    display: block;
    width: 22px;
    height: 2px;
    background: #4b4b4b;
    border-radius: 2px;
  }

  /* Mobile menu dropdown */
  .mobile-menu {
    display: flex;
    flex-direction: column;
    padding: 10px 20px 15px;
    border-top: 1px solid #f0f0f0;
    gap: 5px;
  }
  .mobile-menu button {
    background: none;
    border: none;
    padding: 12px 10px;
    text-align: left;
    font-weight: bold;
    color: #afafaf;
    cursor: pointer;
    letter-spacing: 0.8px;
    font-size: 0.95em;
    border-radius: 8px;
  }
  .mobile-menu button.active { color: #1cb0f6; background: #f0f9ff; }
  .mobile-user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 10px;
    margin-top: 5px;
    border-top: 1px solid #f0f0f0;
    flex-wrap: wrap;
  }

  /* Bottom tabs (mobile only) */
  .bottom-tabs {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 2px solid #e5e5e5;
    z-index: 200;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .bottom-tabs button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 5px;
    background: none;
    border: none;
    color: #afafaf;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 0.3px;
  }
  .bottom-tabs button.active { color: #1cb0f6; }
  .tab-icon { font-size: 20px; line-height: 1; }

  /* Landing */
  .landing {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    padding: 20px;
  }
  .landing-content {
    text-align: center;
    max-width: 600px;
    padding: 20px;
    width: 100%;
  }
  .hero-img { width: 200px; margin-bottom: 15px; }
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
  .role-selector button:active { transform: translateY(4px); }
  .learner-btn { background: #58cc02; border-bottom: 5px solid #46a302; }
  .admin-btn { background: #1cb0f6; border-bottom: 5px solid #1482b5; }
  .back-nav {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 100;
    padding-bottom: 8px;
  }
  .link {
    background: none;
    border: none;
    color: #afafaf;
    cursor: pointer;
    font-weight: bold;
    font-size: 0.8em;
  }
  .link:hover { color: #1cb0f6; }

  /* ── Mobile breakpoint ── */
  @media (max-width: 640px) {
    .desktop-links { display: none !important; }
    .hamburger { display: none; } /* Using bottom tabs instead */
    .user-info { gap: 8px; }
    .username-display { display: none; }
    .role-tag { display: none; }

    .bottom-tabs { display: flex; }
    /* Push main content above fixed bottom tabs */
    .main-content { padding-bottom: calc(70px + env(safe-area-inset-bottom, 0)); }

    .landing h1 { font-size: 2.5em; }
    .landing p { font-size: 1.2em; margin-bottom: 30px; }
    .hero-img { width: 150px; }
    .back-nav { top: 12px; left: 12px; }
  }

  /* Tablet */
  @media (max-width: 768px) and (min-width: 641px) {
    .links button { padding: 8px 10px; font-size: 0.85em; }
    .user-info { gap: 8px; }
  }
</style>
