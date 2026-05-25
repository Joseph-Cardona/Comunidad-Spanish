<script>
  import { onMount } from 'svelte';
  import { token, API_BASE_URL } from '../lib/stores';
  import axios from 'axios';

  let feed = [];
  let newPostContent = '';

  const fetchFeed = async () => {
    const res = await axios.get(`${API_BASE_URL}/feed`);
    feed = res.data;
  };

  const createPost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/posts`, 
        { content: newPostContent },
        { headers: { Authorization: `Bearer ${$token}` } }
      );
      newPostContent = '';
      fetchFeed();
    } catch (e) {
      alert('Error creating post');
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      createPost();
    }
  };

  onMount(fetchFeed);
</script>

<div class="view-container">
  <h1>Chat Feed</h1>

  <div class="post-creator">
    <textarea 
      bind:value={newPostContent} 
      placeholder="Send a message to the group..."
      on:keydown={handleKeydown}
    ></textarea>
    <div class="post-actions">
      <small class="hint">Ctrl+Enter to send</small>
      <button on:click={createPost}>Send</button>
    </div>
  </div>

  <div class="feed-list">
    {#each feed as item}
      <div class="feed-item {item.type}">
        <div class="avatar">{item.username[0].toUpperCase()}</div>
        <div class="content">
          <div class="header">
            <strong>{item.username}</strong>
            {#if item.type === 'activity'}
              <span class="badge">Lesson</span>
            {/if}
          </div>
          <p>{item.content}</p>
          <small>{new Date(item.created_at).toLocaleString()}</small>
        </div>
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
  .post-creator {
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 16px;
    padding: 15px;
    margin-bottom: 25px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  textarea {
    width: 100%;
    border: 2px solid #f0f0f0;
    border-radius: 12px;
    padding: 12px;
    resize: none;
    font-family: inherit;
    font-size: 1em;
    box-sizing: border-box;
    min-height: 80px;
  }
  textarea:focus { outline: none; border-color: #1cb0f6; }
  .post-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .hint { color: #ccc; font-size: 12px; }
  .post-creator button {
    padding: 10px 24px;
    background: #1cb0f6;
    color: white;
    border: none;
    border-bottom: 4px solid #1899d6;
    border-radius: 12px;
    font-weight: bold;
    font-size: 1em;
    cursor: pointer;
  }
  .post-creator button:active { border-bottom: 0; margin-top: 4px; }

  .feed-list { display: flex; flex-direction: column; gap: 15px; }
  .feed-item {
    display: flex;
    gap: 15px;
    padding: 15px;
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 16px;
  }
  .feed-item.activity {
    border-color: #58cc0233;
    background: #58cc0205;
  }
  .avatar {
    width: 46px;
    height: 46px;
    background: #1cb0f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 18px;
    flex-shrink: 0;
  }
  .header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge {
    background: #58cc02;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .content { flex: 1; min-width: 0; }
  .content p { margin: 5px 0; color: #4b4b4b; line-height: 1.4; word-break: break-word; }
  small { color: #afafaf; font-size: 11px; }

  @media (max-width: 640px) {
    .view-container { padding: 16px; }
    h1 { font-size: 1.8em; margin-bottom: 16px; }
    .avatar { width: 38px; height: 38px; font-size: 15px; }
    .feed-item { padding: 12px; gap: 10px; }
    .hint { display: none; }
  }
</style>
