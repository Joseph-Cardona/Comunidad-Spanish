<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { token, API_BASE_URL } from '../lib/stores';

  export let currentUser;

  let x = -1000; 
  let y = -1000;
  let scale = 1;
  let isDragging = false;
  let startX, startY;
  let container;

  let mode = 'normal';
  let nodes = [];

  $: isAdmin = currentUser && currentUser.role === 'admin';

  async function fetchNodes() {
    try {
      const res = await axios.get(`${API_BASE_URL}/board/nodes`);
      nodes = res.data.map(n => ({
        ...n,
        text: n.content,
        isNew: false,
        isEditing: false
      }));
    } catch (e) {
      console.error('Failed to fetch board nodes', e);
    }
  }

  let dragNode = null;
  let offsetX, offsetY;

  // Touch state
  let lastTouchDist = null;
  let touchStartX, touchStartY;
  let touchNodeId = null;

  onMount(() => {
    fetchNodes();
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  function handleGlobalKeydown(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'v') mode = 'normal';
    if (e.key.toLowerCase() === 'e') mode = 'edit';
    if (e.key.toLowerCase() === 'c') mode = 'comment';
  }

  // ── Mouse handlers ──
  function handleBoardMouseDown(e) {
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
    isDragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleNodeMouseDown(node, e) {
    e.stopPropagation();
    if (mode === 'edit' && (node.user_id === currentUser.id || isAdmin)) {
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
      dragNode = node;
      offsetX = e.clientX - node.x * scale - x;
      offsetY = e.clientY - node.y * scale - y;
      window.addEventListener('mousemove', handleNodeMouseMove);
      window.addEventListener('mouseup', handleNodeMouseUp);
    }
  }

  function handleNodeMouseMove(e) {
    if (!dragNode) return;
    dragNode.x = (e.clientX - offsetX - x) / scale;
    dragNode.y = (e.clientY - offsetY - y) / scale;
    nodes = nodes;
  }

  async function handleNodeMouseUp() {
    if (dragNode) {
      try {
        await axios.put(`${API_BASE_URL}/board/nodes/${dragNode.id}`, 
          { x: dragNode.x, y: dragNode.y, title: dragNode.title, content: dragNode.text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
      } catch (e) { console.error('Failed to update node position', e); }
    }
    dragNode = null;
    window.removeEventListener('mousemove', handleNodeMouseMove);
    window.removeEventListener('mouseup', handleNodeMouseUp);
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    x = e.clientX - startX;
    y = e.clientY - startY;
  }

  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    const newScale = Math.min(Math.max(scale * factor, 0.1), 3);
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x = mouseX - (mouseX - x) * (newScale / scale);
    y = mouseY - (mouseY - y) * (newScale / scale);
    scale = newScale;
  }

  function handleBoardClick(e) {
    if (mode === 'edit' && (e.target === container || e.target.classList.contains('peg-grid'))) {
      const rect = container.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - x) / scale;
      const clickY = (e.clientY - rect.top - y) / scale;
      const tempId = Date.now();
      const newNode = { 
        id: tempId, x: clickX, y: clickY, title: '', text: '', comments: [], 
        isNew: true, isEditing: true, user_id: currentUser.id, ownerUsername: currentUser.username
      };
      nodes = [...nodes, newNode];
    }
  }

  // ── Touch handlers for pan + pinch ──
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      // Check if touching a node
      const nodeEl = e.target.closest('.board-content');
      if (nodeEl) return; // Let node handle its own touch
      touchStartX = t.clientX - x;
      touchStartY = t.clientY - y;
      isDragging = true;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      x = t.clientX - touchStartX;
      y = t.clientY - touchStartY;
    } else if (e.touches.length === 2 && lastTouchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / lastTouchDist;
      const newScale = Math.min(Math.max(scale * factor, 0.2), 3);
      const rect = container.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      x = midX - (midX - x) * (newScale / scale);
      y = midY - (midY - y) * (newScale / scale);
      scale = newScale;
      lastTouchDist = dist;
    }
  }

  function handleTouchEnd() {
    isDragging = false;
    lastTouchDist = null;
  }

  // ── Node CRUD ──
  async function deleteNode(id) {
    const nodeToDelete = nodes.find(n => n.id === id);
    if (nodeToDelete && (nodeToDelete.user_id === currentUser.id || isAdmin)) {
      if (nodeToDelete.isNew) { nodes = nodes.filter(n => n.id !== id); return; }
      try {
        await axios.delete(`${API_BASE_URL}/board/nodes/${id}`, {
          headers: { Authorization: `Bearer ${$token}` }
        });
        nodes = nodes.filter(n => n.id !== id);
        if (selectedNode && selectedNode.id === id) selectedNode = null;
      } catch (e) { alert('Failed to delete node'); }
    } else { alert("Permission denied!"); }
  }

  async function addComment(node, e) {
    const text = e.target.value;
    if (e.key === 'Enter' && text && currentUser) {
      try {
        const res = await axios.post(`${API_BASE_URL}/board/nodes/${node.id}/comments`, 
          { content: text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
        node.comments = [...node.comments, { 
          id: res.data.id, text, ownerId: currentUser.id, ownerUsername: currentUser.username 
        }];
        e.target.value = '';
        nodes = nodes;
        selectedNode = selectedNode;
      } catch (e) { alert('Failed to add comment'); }
    }
  }

  async function deleteComment(node, commentId) {
    const c = node.comments.find(c => c.id === commentId);
    if (c && (c.ownerId === currentUser.id || isAdmin)) {
      try {
        await axios.delete(`${API_BASE_URL}/board/comments/${commentId}`, {
          headers: { Authorization: `Bearer ${$token}` }
        });
        node.comments = node.comments.filter(c => c.id !== commentId);
        nodes = nodes;
        selectedNode = selectedNode;
      } catch (e) { alert('Failed to delete comment'); }
    } else { alert('Permission denied!'); }
  }

  async function finishEditing(node) {
    if (!node.title.trim() || !node.text.trim()) {
      alert('Both title and note content are required!');
      return;
    }
    if (node.isNew) {
      try {
        const res = await axios.post(`${API_BASE_URL}/board/nodes`, 
          { x: node.x, y: node.y, title: node.title, content: node.text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
        node.id = res.data.id;
        node.isNew = false;
        node.isEditing = false;
        nodes = nodes;
      } catch (e) {
        alert('Failed to save new node');
        nodes = nodes.filter(n => n.id !== node.id);
      }
    } else {
      try {
        await axios.put(`${API_BASE_URL}/board/nodes/${node.id}`, 
          { x: node.x, y: node.y, title: node.title, content: node.text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
        node.isEditing = false;
        nodes = nodes;
      } catch (e) { alert('Failed to update node'); }
    }
  }

  function startEditing(node) {
    if (mode === 'edit' && (node.user_id === currentUser.id || isAdmin)) {
      node.isEditing = true;
      nodes = nodes;
    }
  }

  let selectedNode = null;

  function handleNodeClick(node, e) {
    if (isDragging) return;
    if (mode === 'edit') {
      if (node.user_id === currentUser.id || isAdmin) startEditing(node);
    } else {
      selectedNode = node;
    }
  }

  function closeDetail() { selectedNode = null; }

  // Mobile: add node via FAB button
  function addNodeCenter() {
    const rect = container.getBoundingClientRect();
    const cx = (rect.width / 2 - x) / scale;
    const cy = (rect.height / 2 - y) / scale;
    const tempId = Date.now();
    nodes = [...nodes, { 
      id: tempId, x: cx, y: cy, title: '', text: '', comments: [], 
      isNew: true, isEditing: true, user_id: currentUser.id, ownerUsername: currentUser.username
    }];
  }
</script>

<div class="controls">
  <button class:active={mode === 'normal'} on:click={() => mode = 'normal'}>View (V)</button>
  <button class:active={mode === 'edit'} on:click={() => mode = 'edit'}>Edit (E)</button>
  <button class:active={mode === 'comment'} on:click={() => mode = 'comment'}>Comment (C)</button>
</div>

{#if mode === 'edit'}
  <button class="fab" on:click={addNodeCenter} title="Add note">+</button>
{/if}

{#if selectedNode}
  <div class="modal-overlay" on:click={closeDetail} role="presentation">
    <div class="modal-content" on:click|stopPropagation role="presentation">
      <button class="close-modal" on:click={closeDetail}>×</button>
      <div class="modal-header">
        <span class="node-owner">by {selectedNode.ownerUsername}</span>
        <h3>{selectedNode.title}</h3>
      </div>
      <div class="modal-body">
        <p class="main-text">{selectedNode.text}</p>
        <div class="comments-section">
          <h4>Comments ({selectedNode.comments.length})</h4>
          {#if mode === 'comment'}
            <div class="comment-input-wrapper">
              <input placeholder="Write a comment..." on:keydown={(e) => addComment(selectedNode, e)} />
              <small>Press Enter to post</small>
            </div>
          {/if}
          <ul class="comment-list">
            {#each selectedNode.comments as comment (comment.id)}
              <li class="comment-item">
                <div class="comment-header">
                  <strong>{comment.ownerUsername}</strong>
                  {#if comment.ownerId === currentUser.id || isAdmin}
                    <button class="delete-comment-btn" on:click={() => deleteComment(selectedNode, comment.id)}>Delete</button>
                  {/if}
                </div>
                <p>{comment.text}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>
{/if}

<div 
  bind:this={container}
  class="board-container mode-{mode}" 
  on:mousedown={handleBoardMouseDown}
  on:click={handleBoardClick}
  on:touchstart|passive={handleTouchStart}
  on:touchmove|nonpassive={handleTouchMove}
  on:touchend={handleTouchEnd}
  role="presentation"
>
  <div 
    class="peg-board" 
    style="transform: translate({x}px, {y}px) scale({scale}); transform-origin: 0 0;"
  >
    <div class="peg-grid"></div>
    {#each nodes as node (node.id)}
      <div 
        class="board-content" 
        class:is-owner={node.user_id === currentUser.id || isAdmin}
        style="top: {node.y}px; left: {node.x}px;"
        on:mousedown={(e) => handleNodeMouseDown(node, e)}
        on:click|stopPropagation={(e) => handleNodeClick(node, e)}
        role="presentation"
      >
        <div class="node-header">
          <span class="node-owner">by {node.ownerUsername}</span>
          {#if mode === 'edit' && (node.user_id === currentUser.id || isAdmin)}
            <button class="delete-btn" on:mousedown|stopPropagation on:click|stopPropagation={() => deleteNode(node.id)}>×</button>
          {/if}
        </div>

        {#if node.isNew || node.isEditing}
          <div on:mousedown|stopPropagation role="presentation">
            <input bind:value={node.title} class="title-input" autofocus={node.isNew} placeholder="Title" />
            <textarea bind:value={node.text} class="text-input" placeholder="Note content..." />
            <button class="done-btn" on:mousedown|stopPropagation on:click|stopPropagation={() => finishEditing(node)}>Done</button>
          </div>
        {:else}
          <h3>{node.title}</h3>
          <p class="truncate">{node.text}</p>
          <div class="node-footer">
            <span class="comment-count">{node.comments.length} comments</span>
            {#if mode === 'comment'}
              <span class="click-hint">Tap to comment</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .controls {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    gap: 8px;
    background: white;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    border: 2px solid #e5e5e5;
  }
  .controls button {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    background: #f0f0f0;
    color: #777;
    white-space: nowrap;
    font-size: 0.9em;
  }
  .controls button.active { background: #1cb0f6; color: white; }

  /* FAB for adding nodes on mobile */
  .fab {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 56px;
    height: 56px;
    background: #58cc02;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    z-index: 300;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 4px solid #46a302;
  }
  
  .board-container {
    width: calc(100% - 40px);
    height: calc(100vh - 140px);
    overflow: hidden;
    background-color: #F5E9CB;
    cursor: grab;
    position: relative;
    user-select: none;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    margin: 60px 20px 20px;
    touch-action: none;
  }
  .board-container:active { cursor: grabbing; }
  .peg-board { width: 5000px; height: 5000px; position: absolute; top: 0; left: 0; }
  .peg-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(#d1d1d1 4px, transparent 4px);
    background-size: 50px 50px;
    background-position: 25px 25px;
  }
  
  .board-content {
    position: absolute;
    padding: 12px;
    background: white;
    border: 2px solid #e5e5e5;
    border-radius: 15px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    min-width: 140px;
    max-width: 220px;
    cursor: pointer;
    transition: transform 0.1s;
  }
  .board-content:hover { transform: translateY(-2px); }
  .board-content.is-owner { border-color: #1cb0f6; }
  
  .node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .node-owner { font-size: 0.72em; color: #999; font-weight: bold; }
  .delete-btn {
    background: #ff4b4b;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  h3 { margin: 0 0 8px 0; color: #0a70a4; font-size: 1em; font-weight: 800; }
  p { margin: 0; font-size: 0.85em; line-height: 1.4; color: #4b4b4b; }
  .truncate { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .node-footer { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 6px; }
  .comment-count { font-size: 0.72em; color: #1cb0f6; font-weight: bold; }
  .click-hint { font-size: 0.68em; color: #ffc800; font-weight: bold; }

  .title-input, .text-input {
    width: 100%;
    margin-bottom: 5px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 8px;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 0.9em;
  }
  .text-input { height: 70px; resize: none; }
  .done-btn {
    background: #58cc02;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px;
    margin-top: 5px;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
    padding: 16px;
    box-sizing: border-box;
  }
  .modal-content {
    background: white;
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    border-radius: 20px;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  .close-modal {
    position: absolute;
    top: 12px;
    right: 12px;
    background: #f0f0f0;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 20px;
    cursor: pointer;
    z-index: 1;
  }
  .modal-header { padding: 24px 24px 10px; border-bottom: 1px solid #eee; }
  .modal-body { padding: 16px 24px 24px; overflow-y: auto; flex: 1; }
  .main-text { font-size: 1.1em; color: #333; margin-bottom: 24px; white-space: pre-wrap; }
  .comments-section h4 { margin: 0 0 12px 0; color: #777; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
  .comment-input-wrapper { margin-bottom: 16px; background: #f9f9f9; padding: 12px; border-radius: 12px; }
  .comment-input-wrapper input { width: 100%; padding: 10px; border: 2px solid #e5e5e5; border-radius: 10px; margin-bottom: 4px; box-sizing: border-box; }
  .comment-input-wrapper small { color: #999; }
  .comment-list { list-style: none; padding: 0; margin: 0; }
  .comment-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
  .comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.9em; }
  .comment-item p { font-size: 1em; color: #444; }
  .delete-comment-btn { background: none; border: none; color: #ff4b4b; cursor: pointer; font-size: 0.85em; font-weight: bold; }

  @media (max-width: 640px) {
    .controls {
      top: auto;
      bottom: calc(80px + env(safe-area-inset-bottom, 0) + 70px);
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.85em;
    }
    .controls button { padding: 7px 10px; font-size: 0.82em; }
    .board-container {
      width: 100%;
      margin: 0;
      border-radius: 0;
      border-left: none;
      border-right: none;
      height: calc(100vh - 60px);
    }
    .modal-header { padding: 20px 16px 10px; }
    .modal-body { padding: 14px 16px 20px; }
  }
</style>
