<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  let leaderboard = [];

  const fetchLeaderboard = async () => {
    const res = await axios.get('http://localhost:3000/api/leaderboard');
    leaderboard = res.data;
  };

  onMount(fetchLeaderboard);
</script>

<div class="view-container">
  <h1>Leaderboard</h1>
  <div class="leaderboard-list">
    {#each leaderboard as user, i}
      <div class="leaderboard-item">
        <span class="rank">{i + 1}</span>
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
  }
  .leaderboard-item:last-child { border-bottom: none; }
  .rank { width: 40px; font-weight: bold; color: #afafaf; }
  .username { flex-grow: 1; font-weight: bold; color: #4b4b4b; }
  .xp { color: #ffc800; font-weight: bold; }
</style>
