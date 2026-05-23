<script>
  import { onMount } from 'svelte';
  import { token } from '../lib/stores';
  import axios from 'axios';

  let feed = [];
  let newPostContent = '';

  const fetchFeed = async () => {
    const res = await axios.get('http://localhost:3000/api/feed');
    feed = res.data;
  };

  const createPost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await axios.post('http://localhost:3000/api/posts', 
        { content: newPostContent },
        { headers: { Authorization: `Bearer ${$token}` } }
      );
      newPostContent = '';
      fetchFeed();
    } catch (e) {
      alert('Error creating post');
    }
  };

  onMount(fetchFeed);
</script>

<div class="view-container">
  <h1>Chat Feed</h1>

  <div class="post-creator">
    <textarea bind:value={newPostContent} placeholder="Send a message to the group..."></textarea>
    <button on:click={createPost}>Send</button>
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
    box-sizing: border-box;
  }
  .post-creator button {
    align-self: flex-end;
    padding: 8px 20px;
    background: #1cb0f6;
    color: white;
    border: none;
    border-bottom: 4px solid #1899d6;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
  }
  .post-creator button:active {
    border-bottom: 0;
    margin-top: 4px;
  }

  .feed-list { display: flex; flex-direction: column; gap: 15px; }
  .feed-item {
    display: flex;
    gap: 15px;
    padding: 15px;
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 16px;
    transition: transform 0.1s;
  }
  .feed-item.activity {
    border-color: #58cc0233;
    background: #58cc0205;
  }
  .avatar {
    width: 50px;
    height: 50px;
    background: #1cb0f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    flex-shrink: 0;
  }
  .header { display: flex; align-items: center; gap: 10px; }
  .badge {
    background: #58cc02;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .content p { margin: 5px 0; color: #4b4b4b; line-height: 1.4; }
  small { color: #afafaf; font-size: 11px; }
</style>
