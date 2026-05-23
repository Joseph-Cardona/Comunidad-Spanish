<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { token } from '../lib/stores';

  export let currentUser; // Passed from App.svelte

  let x = -1000; 
  let y = -1000;
  let scale = 1;
  let isDragging = false;
  let startX, startY;
  let container;

  let mode = 'normal'; // 'normal', 'edit', 'comment'
  
  let nodes = [];

  $: isAdmin = currentUser && currentUser.role === 'admin';

  async function fetchNodes() {
    try {
      const res = await axios.get('http://localhost:3000/api/board/nodes');
      // The server returns 'content', but the component uses 'text'
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

  function handleBoardMouseDown(e) {
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
    isDragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleNodeMouseDown(node, e) {
    // Prevent board drag when clicking any node
    e.stopPropagation();

    // Only allow dragging if user is owner or admin
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
    nodes = nodes; // Trigger reactivity
  }

  async function handleNodeMouseUp() {
    if (dragNode) {
      try {
        await axios.put(`http://localhost:3000/api/board/nodes/${dragNode.id}`, 
          { x: dragNode.x, y: dragNode.y, title: dragNode.title, content: dragNode.text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
      } catch (e) {
        console.error('Failed to update node position', e);
      }
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
        id: tempId, 
        x: clickX, 
        y: clickY, 
        title: '', 
        text: '', 
        comments: [], 
        isNew: true,
        isEditing: true,
        user_id: currentUser.id,
        ownerUsername: currentUser.username
      };
      nodes = [...nodes, newNode];
    }
  }

  async function deleteNode(id) {
    const nodeToDelete = nodes.find(n => n.id === id);
    if (nodeToDelete && (nodeToDelete.user_id === currentUser.id || isAdmin)) {
      if (nodeToDelete.isNew) {
        nodes = nodes.filter(n => n.id !== id);
        return;
      }
      try {
        await axios.delete(`http://localhost:3000/api/board/nodes/${id}`, {
          headers: { Authorization: `Bearer ${$token}` }
        });
        nodes = nodes.filter(n => n.id !== id);
        if (selectedNode && selectedNode.id === id) selectedNode = null;
      } catch (e) {
        alert('Failed to delete node');
      }
    } else {
      alert("Permission denied!");
    }
  }

  async function addComment(node, e) {
    const text = e.target.value;
    if (e.key === 'Enter' && text && currentUser) {
      try {
        const res = await axios.post(`http://localhost:3000/api/board/nodes/${node.id}/comments`, 
          { content: text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
        
        node.comments = [...node.comments, { 
          id: res.data.id, 
          text, 
          ownerId: currentUser.id, 
          ownerUsername: currentUser.username 
        }];
        e.target.value = '';
        nodes = nodes; 
        selectedNode = selectedNode; 
      } catch (e) {
        alert('Failed to add comment');
      }
    }
  }

  async function deleteComment(node, commentId) {
    const commentToDelete = node.comments.find(c => c.id === commentId);
    if (commentToDelete && (commentToDelete.ownerId === currentUser.id || isAdmin)) {
      try {
        await axios.delete(`http://localhost:3000/api/board/comments/${commentId}`, {
          headers: { Authorization: `Bearer ${$token}` }
        });
        node.comments = node.comments.filter(c => c.id !== commentId);
        nodes = nodes;
        selectedNode = selectedNode;
      } catch (e) {
        alert('Failed to delete comment');
      }
    } else {
      alert(`Permission denied!`);
    }
  }

  async function finishEditing(node) {
    if (!node.title.trim() || !node.text.trim()) {
      alert('Both title and note content are required!');
      return;
    }

    if (node.isNew) {
      try {
        const res = await axios.post('http://localhost:3000/api/board/nodes', 
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
        await axios.put(`http://localhost:3000/api/board/nodes/${node.id}`, 
          { x: node.x, y: node.y, title: node.title, content: node.text },
          { headers: { Authorization: `Bearer ${$token}` } }
        );
        node.isEditing = false;
        nodes = nodes;
      } catch (e) {
        alert('Failed to update node');
      }
    }
  }

  function startEditing(node) {
    // Double check permissions before opening editor
    if (mode === 'edit' && (node.user_id === currentUser.id || isAdmin)) {
      node.isEditing = true;
      nodes = nodes;
    }
  }

  let selectedNode = null;

  function handleNodeClick(node, e) {
    if (isDragging) return;
    
    if (mode === 'edit') {
      // If user has permission, start editing. Otherwise, do nothing
      if (node.user_id === currentUser.id || isAdmin) {
        startEditing(node);
      }
    } else {
      // normal or comment mode
      selectedNode = node;
    }
  }

  function closeDetail() {
    selectedNode = null;
  }
</script>

<div class="controls">
  <button class:active={mode === 'normal'} on:click={() => mode = 'normal'}>Normal (V)</button>
  <button class:active={mode === 'edit'} on:click={() => mode = 'edit'}>Edit (E)</button>
  <button class:active={mode === 'comment'} on:click={() => mode = 'comment'}>Comment (C)</button>
</div>

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
               <span class="click-hint">Click to comment</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .controls { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); z-index: 200; display: flex; gap: 10px; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 2px solid #e5e5e5; }
  .controls button { padding: 8px 16px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; background: #f0f0f0; color: #777; }
  .controls button.active { background: #1cb0f6; color: white; }
  
  .board-container { width: 100%; height: calc(100vh - 120px); overflow: hidden; background-color: #F5E9CB; cursor: grab; position: relative; user-select: none; border: 2px solid #e5e5e5; border-radius: 12px; margin: 20px auto; max-width: 1000px; }
  .peg-board { width: 5000px; height: 5000px; position: absolute; top: 0; left: 0; }
  .peg-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(#d1d1d1 4px, transparent 4px); background-size: 50px 50px; background-position: 25px 25px; }
  
  .board-content { position: absolute; padding: 15px; background: white; border: 2px solid #e5e5e5; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); min-width: 150px; max-width: 250px; cursor: pointer; transition: transform 0.1s; }
  .board-content:hover { transform: translateY(-2px); }
  .board-content.is-owner { border-color: #1cb0f6; }
  
  .node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .node-owner { font-size: 0.75em; color: #999; font-weight: bold; }
  .delete-btn { background: #ff4b4b; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  
  h3 { margin: 0 0 8px 0; color: #0a70a4; font-size: 1.1em; font-weight: 800; }
  p { margin: 0; font-size: 0.9em; line-height: 1.4; color: #4b4b4b; }
  .truncate { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  
  .node-footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 8px; }
  .comment-count { font-size: 0.75em; color: #1cb0f6; font-weight: bold; }
  .click-hint { font-size: 0.7em; color: #ffc800; font-weight: bold; }

  .title-input, .text-input { width: 100%; margin-bottom: 5px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px; box-sizing: border-box; font-family: inherit; }
  .text-input { height: 80px; resize: none; }
  .done-btn { background: #58cc02; color: white; border: none; border-radius: 8px; padding: 10px; margin-top: 5px; cursor: pointer; font-weight: bold; width: 100%; }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
  .modal-content { background: white; width: 90%; max-width: 600px; max-height: 80vh; border-radius: 20px; position: relative; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
  .close-modal { position: absolute; top: 15px; right: 15px; background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; font-size: 20px; cursor: pointer; z-index: 1; }
  
  .modal-header { padding: 30px 30px 10px; border-bottom: 1px solid #eee; }
  .modal-body { padding: 20px 30px 30px; overflow-y: auto; flex: 1; }
  .main-text { font-size: 1.2em; color: #333; margin-bottom: 30px; white-space: pre-wrap; }
  
  .comments-section h4 { margin: 0 0 15px 0; color: #777; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
  .comment-input-wrapper { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 12px; }
  .comment-input-wrapper input { width: 100%; padding: 12px; border: 2px solid #e5e5e5; border-radius: 10px; margin-bottom: 5px; }
  .comment-input-wrapper small { color: #999; }
  
  .comment-list { list-style: none; padding: 0; margin: 0; }
  .comment-item { padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
  .comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 0.9em; }
  .comment-item p { font-size: 1em; color: #444; }
  .delete-comment-btn { background: none; border: none; color: #ff4b4b; cursor: pointer; font-size: 0.85em; font-weight: bold; }
</style>
