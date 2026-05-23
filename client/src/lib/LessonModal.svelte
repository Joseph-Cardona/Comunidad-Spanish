<script>
  export let lesson;
  export let lessonNumber;
  export let onComplete;
  export let onClose;

  const typeColors = {
    'Lesson': '#1cb0f6',
    'Practice': '#58cc02',
    'Quiz': '#ff4b4b'
  };
</script>

<div class="modal-overlay" on:click|self={onClose}>
  <div class="modal-content" style="border-color: {typeColors[lesson.type] || '#e5e5e5'}">
    <div class="header">
      <span class="type-badge" style="background: {typeColors[lesson.type]}">{lesson.type}</span>
      <button class="close-btn" on:click={onClose}>&times;</button>
    </div>
    
    <div class="body">
      <h2>Lesson {lessonNumber}</h2>
      <h3>{lesson.title}</h3>
      <p class="unit-info">Unit {lesson.unit}</p>
      
      <div class="details">
        <div class="detail-item">
          <strong>Status</strong>
          <span class="status {lesson.completed ? 'completed' : 'pending'}">
            {lesson.completed ? '✓ Completed' : '○ Not started'}
          </span>
        </div>
        <div class="detail-item">
          <strong>XP Reward</strong>
          <span>{lesson.completed ? 0 : lesson.xp_reward} XP</span>
        </div>
        <div class="detail-item">
          <strong>Learning</strong>
          <p>{lesson.content}</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <button class="complete-btn {lesson.completed ? 'review' : ''}" on:click={() => onComplete(lesson.id)}>
        {lesson.completed ? 'Review' : 'Start ' + lesson.type}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    padding: 30px;
    border-radius: 24px;
    border: 4px solid #e5e5e5;
    width: 90%;
    max-width: 400px;
    position: relative;
    box-shadow: 0 10px 0 rgba(0,0,0,0.1);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .type-badge {
    padding: 4px 12px;
    border-radius: 12px;
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-transform: uppercase;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #afafaf;
    cursor: pointer;
  }
  h2 { margin: 0; color: #afafaf; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
  h3 { margin: 5px 0; font-size: 24px; color: #4b4b4b; }
  .unit-info { color: #afafaf; font-weight: bold; margin-bottom: 20px; }
  
  .details {
    background: #f7f7f7;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 25px;
  }
  .detail-item { margin-bottom: 15px; }
  .detail-item:last-child { margin-bottom: 0; }
  .detail-item strong { display: block; color: #afafaf; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
  .detail-item span { font-weight: bold; color: #ffc800; font-size: 18px; }
  .status { font-size: 14px !important; padding: 2px 8px; border-radius: 8px; display: inline-block !important; }
  .status.completed { background: #d7ffb8; color: #58a700 !important; }
  .status.pending { background: #e5e5e5; color: #afafaf !important; }
  .detail-item p { margin: 0; color: #4b4b4b; line-height: 1.4; }

  .complete-btn {
    width: 100%;
    padding: 15px;
    background: #58cc02;
    color: white;
    border: none;
    border-bottom: 4px solid #46a302;
    border-radius: 16px;
    font-weight: bold;
    font-size: 18px;
    cursor: pointer;
  }
  .complete-btn.review {
    background: #1cb0f6;
    border-bottom-color: #1899d6;
  }
  .complete-btn:active {
    border-bottom: 0;
    margin-top: 4px;
  }
  .complete-btn.disabled {
    background: #e5e5e5;
    border-bottom-color: #afafaf;
    cursor: default;
  }
</style>
