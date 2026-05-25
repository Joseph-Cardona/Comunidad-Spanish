<script>
  import { onMount } from 'svelte';
  import { token, user, API_BASE_URL } from '../lib/stores';
  import axios from 'axios';
  import LessonModal from '../lib/LessonModal.svelte';
  import LessonPlayer from '../lib/LessonPlayer.svelte';

  let lessons = [];
  let selectedLesson = null;
  let selectedIndex = 0;
  let playingLesson = null;

  const fetchLessons = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/lessons`, {
        headers: { Authorization: `Bearer ${$token}` }
      });
      lessons = res.data;
    } catch (e) {
      console.error("Failed to fetch lessons", e);
    }
  };

  const completeLesson = async () => {
    if (!playingLesson) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/lessons/${playingLesson.id}/complete`, {}, {
        headers: { Authorization: `Bearer ${$token}` }
      });
      if ($user) $user.total_xp += res.data.xp_gained;
      playingLesson = null;
      fetchLessons();
    } catch (e) {
      alert('Lesson completion failed');
      playingLesson = null;
    }
  };

  const openLesson = (lesson, globalIndex) => {
    selectedLesson = lesson;
    selectedIndex = globalIndex;
  };

  const startLesson = (lesson) => {
    selectedLesson = null;
    playingLesson = lesson;
  };

  const typeColors = {
    'Lesson': '#1cb0f6',
    'Practice': '#58cc02',
    'Quiz': '#ff4b4b'
  };

  $: groupedLessons = lessons.reduce((groups, lesson) => {
    const unit = lesson.unit || 1;
    if (!groups[unit]) groups[unit] = [];
    groups[unit].push(lesson);
    return groups;
  }, {});

  $: sortedUnits = Object.entries(groupedLessons).sort((a, b) => Number(a[0]) - Number(b[0]));

  // Calculate global index for each lesson to ensure continuous numbering
  $: lessonsWithGlobalIndex = (() => {
    let count = 0;
    return sortedUnits.map(([unit, unitLessons]) => {
      return [unit, unitLessons.map(lesson => {
        count++;
        return { ...lesson, globalIndex: count };
      })];
    });
  })();

  onMount(fetchLessons);
</script>

<div class="path-container">
  <h1>Your Spanish Path</h1>
  
  {#each lessonsWithGlobalIndex as [unit, unitLessons]}
    <div class="unit-section">
      <div class="unit-header">
        <h2>Unit {unit}</h2>
        <p>Complete 7 levels to master this unit!</p>
      </div>
      <div class="lessons">
        {#each unitLessons as lesson, i}
          <div class="lesson-node {lesson.completed ? 'completed' : ''}" 
               style="margin-left: {Math.sin(i * 1.5) * 60}px">
            <div class="circle" 
                 style="background: {lesson.completed ? '#58cc02' : typeColors[lesson.type] || '#e5e5e5'}; 
                        border-bottom-color: {lesson.completed ? '#46a302' : '#afafaf'}"
                 on:click={() => openLesson(lesson, lesson.globalIndex)}>
              {#if lesson.completed}
                <span class="checkmark">✓</span>
              {:else}
                {lesson.globalIndex}
              {/if}
            </div>
            <div class="tooltip">{lesson.title}</div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if lessons.length === 0}
    <p class="loading">Loading your path...</p>
  {/if}
</div>

{#if selectedLesson}
  <LessonModal 
    lesson={selectedLesson} 
    lessonNumber={selectedIndex}
    onComplete={() => startLesson(selectedLesson)}
    onClose={() => selectedLesson = null}
  />
{/if}

{#if playingLesson}
  <LessonPlayer 
    lesson={playingLesson}
    on:finish={completeLesson}
    on:quit={() => playingLesson = null}
  />
{/if}

<style>
  .path-container {
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #fff;
    min-height: 100vh;
    width: 100%;
    box-sizing: border-box;
  }
  h1 {
    color: #1cb0f6;
    font-size: 2.5em;
    margin-bottom: 40px;
    font-weight: 700;
  }
  .unit-section {
    width: 100%;
    max-width: 600px;
    margin-bottom: 80px;
  }
  .unit-header {
    text-align: center;
    margin-bottom: 40px;
    padding: 24px;
    background: #1cb0f6;
    color: white;
    border-radius: 20px;
    box-shadow: 0 8px 0 #1899d6;
  }
  .unit-header h2 { margin: 0; font-size: 28px; text-transform: uppercase; }
  .unit-header p { margin: 10px 0 0; opacity: 0.9; font-weight: bold; }
  
  .lessons {
    display: flex;
    flex-direction: column;
    gap: 50px;
    align-items: center;
    padding: 20px 0;
  }
  .lesson-node {
    position: relative;
    cursor: pointer;
    z-index: 10;
  }
  .circle {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    border-bottom: 6px solid #afafaf;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: bold;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 4px 0 rgba(0,0,0,0.1);
  }
  .checkmark {
    font-size: 36px;
  }
  .tooltip {
    position: absolute;
    left: 90px;
    top: 50%;
    transform: translateY(-50%);
    background: white;
    padding: 10px 16px;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    white-space: nowrap;
    font-weight: bold;
    color: #4b4b4b;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  .lesson-node:hover .tooltip {
    opacity: 1;
  }
  .circle:hover {
    transform: scale(1.1) translateY(-5px);
  }
  .circle:active {
    transform: scale(0.95);
    border-bottom-width: 0;
    margin-top: 6px;
  }
  .loading {
    font-size: 20px;
    color: #afafaf;
    margin-top: 100px;
  }
</style>
