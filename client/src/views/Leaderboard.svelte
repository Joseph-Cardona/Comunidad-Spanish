<script>
  import { onMount } from 'svelte';
  import { API_BASE_URL } from '../lib/stores';
  import axios from 'axios';

  let leaderboard = [];

  const fetchLeaderboard = async () => {
    const res = await axios.get(`${API_BASE_URL}/leaderboard`);
    leaderboard = res.data;
  };

  onMount(fetchLeaderboard);
</script>

<div class="view-container">
  <h1>🏆 Leaderboard</h1>
  <div class="leaderboard-list">
    {#each leaderboard as user, i}
      <div class="leaderboard-item" class:top-three={i < 3}>
        <span class="rank rank-{i + 1}">
          {#if i === 0}🥇{:else if i === 1}🥈{:else if i === 2}🥉{:else}{i + 1}{/if}
        </span>
        <span class="username">{user.username}</span>
        <span class="xp">{user.total_xp} XP</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .view-container { max-width: 600px; margin: 0 auto; padding: 20px; }
  h1 {
    color: #1cb0f6;
    font-size: 2.5em;
    margin-bottom: 25px;
    font-weight: 700;
  }
  .leaderboard-list {
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 16px;
    overflow: hidden;
  }
  .leaderboard-item {
    display: flex;
    padding: 15px 20px;
    border-bottom: 2px solid #e5e5e5;
    align-items: center;
    transition: background 0.1s;
  }
  .leaderboard-item:last-child { border-bottom: none; }
  .leaderboard-item.top-three { background: #fffdf0; }
  .rank {
    width: 40px;
    font-weight: bold;
    color: #afafaf;
    font-size: 1.2em;
  }
  .username { flex-grow: 1; font-weight: bold; color: #4b4b4b; }
  .xp { color: #ffc800; font-weight: bold; white-space: nowrap; }

  @media (max-width: 640px) {
    .view-container { padding: 16px; }
    h1 { font-size: 1.8em; margin-bottom: 16px; }
    .leaderboard-item { padding: 12px 16px; }
  }
</style>
