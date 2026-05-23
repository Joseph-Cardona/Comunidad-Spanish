<script>
  import { createEventDispatcher } from 'svelte';
  import { token } from '../lib/stores';
  import axios from 'axios';

  export let lesson;
  const dispatch = createEventDispatcher();

  // Helper to shuffle array
  const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

  // Helper: Normalize strings for comparison (remove accents, lowercase)
  const normalize = (str) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  let steps = JSON.parse(lesson.steps || '[]').map(s => ({ 
    ...s, 
    wrongAnswers: [],
    // Randomize options if it's a choice step
    shuffledOptions: s.type === 'choice' ? shuffle(s.options) : null
  }));

  let currentStepIndex = 0;
  let selectedOption = null;
  let isCorrect = null;
  let showFeedback = false;
  let hearts = 3;
  let gameOver = false;
  
  // Track unique steps for progress bar
  const originalStepCount = steps.length;
  let completedSteps = 0;

  let spellInput = '';
  let fillInput = '';
  let sentenceWords = [];
  let userSentence = [];

  $: currentStep = steps[currentStepIndex];

  $: if (currentStep.type === 'sentence') {
      sentenceWords = currentStep.words ? [...currentStep.words].sort(() => Math.random() - 0.5) : [];
      userSentence = [];
  }

  const handleCheck = () => {
    if (currentStep.type === 'choice') {
      isCorrect = selectedOption === currentStep.answer;
      if (!isCorrect) {
        hearts--;
        // Add a copy of the failed step to the end of the queue, preserving previous wrong answers
        const nextWrongAnswers = [...(currentStep.wrongAnswers || []), selectedOption];
        steps = [...steps, { ...currentStep, wrongAnswers: nextWrongAnswers }];
        if (hearts <= 0) {
          gameOver = true;
        }
      } else {
        completedSteps++;
      }
    } else if (currentStep.type === 'spelling') {
      isCorrect = normalize(spellInput) === normalize(currentStep.answer);
      if (!isCorrect) { hearts--; if (hearts <= 0) gameOver = true; } else { completedSteps++; }
    } else if (currentStep.type === 'fill') {
      isCorrect = normalize(fillInput) === normalize(currentStep.answer);
      if (!isCorrect) { hearts--; if (hearts <= 0) gameOver = true; } else { completedSteps++; }
    } else if (currentStep.type === 'sentence') {
      isCorrect = userSentence.join(' ') === currentStep.answer;
      if (!isCorrect) { hearts--; if (hearts <= 0) gameOver = true; } else { completedSteps++; }
    } else {
      isCorrect = true;
      completedSteps++;
    }
    showFeedback = true;
  };

  const resetStepState = () => {
      selectedOption = null;
      spellInput = '';
      fillInput = '';
      userSentence = [];
      isCorrect = null;
      showFeedback = false;
  };

  const handleNext = () => {
    if (gameOver) { dispatch('quit'); return; }
    if (currentStepIndex < steps.length - 1) {
      currentStepIndex++;
      resetStepState();
    } else {
      dispatch('finish');
    }
  };

  const handleKeydown = (e) => {
      if (e.key === 'Enter') {
          if (showFeedback) {
              handleNext();
          } else if (!(!selectedOption && currentStep.type === 'choice' && !spellInput && !fillInput && userSentence.length === 0)) {
              handleCheck();
          }
      }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="player-container">
  <div class="top-bar">
    <button class="quit-btn" on:click={() => dispatch('quit')}>&times;</button>
    <div class="progress-container">
      <div class="progress-bar" style="width: {(completedSteps / originalStepCount) * 100}%"></div>
    </div>
    <div class="hearts-display">
      <span class="heart-icon">❤️</span>
      <span class="heart-count {hearts === 1 ? 'low' : ''}">{hearts}</span>
    </div>
  </div>

  <div class="content">
    {#if gameOver}
      <div class="game-over">
        <div class="sad-icon">💔</div>
        <h2>Out of hearts!</h2>
        <p>Don't worry, you can try again.</p>
      </div>
    {:else}
      {#if currentStep.type === 'info'}
        <div class="info-card">
          <h2>{currentStep.text}</h2>
          <p class="translation">{currentStep.translation}</p>
        </div>
      {:else if currentStep.type === 'choice'}
        <div class="choice-card">
          <h2>{currentStep.question}</h2>
          <div class="options">
            {#each currentStep.shuffledOptions as option}
              {@const isWrong = currentStep.wrongAnswers?.includes(option)}
              <button 
                class="option-btn {selectedOption === option ? 'selected' : ''} {isWrong ? 'wrong-attempt' : ''}" 
                disabled={isWrong || showFeedback}
                on:click={() => !showFeedback && !isWrong && (selectedOption = option)}>
                {option}
              </button>
            {/each}
          </div>
        </div>
      {:else if currentStep.type === 'spelling'}
        <div class="choice-card">
          <h2>Translate to Spanish:</h2>
          <p class="english-prompt">{currentStep.text}</p>
          <input type="text" bind:value={spellInput} placeholder="Type here..." disabled={showFeedback} />
        </div>
      {:else if currentStep.type === 'fill'}
        <div class="choice-card">
          <h2>{currentStep.question}</h2>
          <input type="text" bind:value={fillInput} placeholder="Fill in the blank..." disabled={showFeedback} />
        </div>
      {:else if currentStep.type === 'sentence'}
        <div class="choice-card">
          <h2>Form the sentence: {currentStep.translation}</h2>
          <div class="sentence-bank">
            {#each userSentence as word, i}
              <button class="word-btn" on:click={() => !showFeedback && (userSentence = userSentence.filter((_, index) => index !== i))}>{word}</button>
            {/each}
          </div>
          <div class="word-bank">
            {#each sentenceWords.filter(w => !userSentence.includes(w)) as word}
              <button class="word-btn" on:click={() => !showFeedback && (userSentence = [...userSentence, word])}>{word}</button>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="bottom-bar {showFeedback ? (isCorrect ? 'correct' : 'incorrect') : ''} {gameOver ? 'incorrect' : ''}">
    {#if gameOver}
      <div class="feedback-content">
        <div class="feedback-text">
          <strong>Game Over</strong>
        </div>
        <button class="next-btn" on:click={() => dispatch('quit')}>RETRY</button>
      </div>
    {:else if showFeedback}
      <div class="feedback-content">
        <div class="feedback-text">
          <strong>{isCorrect ? 'Excellent!' : 'Correct solution:'}</strong>
          {#if !isCorrect}
            <p>{currentStep.answer}</p>
          {/if}
        </div>
        <button class="next-btn" on:click={handleNext}>CONTINUE</button>
      </div>
    {:else}
      <button 
        class="check-btn {(!selectedOption && currentStep.type === 'choice' && !spellInput && !fillInput && userSentence.length === 0) ? 'disabled' : ''}" 
        disabled={(!selectedOption && currentStep.type === 'choice' && !spellInput && !fillInput && userSentence.length === 0) || showFeedback}
        on:click={handleCheck}>
        CHECK
      </button>
    {/if}
  </div>
</div>

<style>
  .player-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    z-index: 2000;
    display: flex;
    flex-direction: column;
  }
  .top-bar {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    max-width: 1000px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  .quit-btn {
    background: none;
    border: none;
    font-size: 32px;
    color: #afafaf;
    cursor: pointer;
  }
  .progress-container {
    flex-grow: 1;
    height: 16px;
    background: #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background: #58cc02;
    transition: width 0.3s;
  }
  .hearts-display {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    font-size: 20px;
    color: #ff4b4b;
  }
  .heart-count.low {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  h2 { font-size: 28px; color: #333; text-align: center; margin-bottom: 20px; }
  .english-prompt { font-size: 24px; color: #4b4b4b; font-weight: bold; text-align: center; margin-bottom: 20px; }
  .translation { font-size: 20px; color: #777; font-style: italic; }

  .game-over { text-align: center; }
  .sad-icon { font-size: 80px; margin-bottom: 20px; }
  .game-over h2 { margin-bottom: 10px; color: #ff4b4b; }
  .game-over p { color: #afafaf; font-size: 18px; }

  input {
    width: 100%;
    padding: 15px;
    border: 2px solid #e5e5e5;
    border-radius: 16px;
    font-size: 18px;
    margin-top: 20px;
    box-sizing: border-box;
  }
  .word-bank, .sentence-bank {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    min-height: 50px;
    padding: 10px;
    border-bottom: 2px solid #e5e5e5;
  }
  .word-btn {
    padding: 12px 18px;
    background: #f7f7f7;
    border: 2px solid #e5e5e5;
    border-bottom: 4px solid #d5d5d5;
    border-radius: 12px;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    color: #4b4b4b;
  }
  .word-btn:hover { background: #eee; }
  .word-btn:active { transform: translateY(2px); border-bottom-width: 2px; }
  
  .sentence-bank {
    background: #fff;
    border-radius: 12px;
    border: 2px dashed #1cb0f6;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .option-btn {
    padding: 15px;
    background: white;
    border: 2px solid #e5e5e5;
    border-bottom: 4px solid #e5e5e5;
    border-radius: 16px;
    font-size: 18px;
    font-weight: bold;
    color: #4b4b4b;
    cursor: pointer;
    text-align: left;
  }
  .option-btn.selected {
    background: #ddf4ff;
    border-color: #84d8ff;
    border-bottom-color: #84d8ff;
    color: #1cb0f6;
  }
  .option-btn.wrong-attempt {
    background: #f0f0f0;
    color: #afafaf;
    text-decoration: line-through;
    cursor: not-allowed;
    border-bottom: 2px solid #e5e5e5;
    transform: none;
    opacity: 0.7;
  }

  .bottom-bar {
    padding: 20px;
    border-top: 2px solid #e5e5e5;
    min-height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bottom-bar.correct { background: #d7ffb8; border-top: none; }
  .bottom-bar.incorrect { background: #ffdfe0; border-top: none; }

  .check-btn, .next-btn {
    width: 100%;
    max-width: 400px;
    padding: 15px;
    border: none;
    border-radius: 16px;
    font-weight: bold;
    font-size: 18px;
    cursor: pointer;
  }
  .check-btn {
    background: #58cc02;
    color: white;
    border-bottom: 4px solid #46a302;
  }
  .check-btn.disabled {
    background: #e5e5e5;
    color: #afafaf;
    border-bottom: 4px solid #afafaf;
    cursor: default;
  }
  .next-btn {
    background: #58cc02;
    color: white;
    border-bottom: 4px solid #46a302;
  }
  .bottom-bar.incorrect .next-btn {
    background: #ff4b4b;
    border-bottom: 4px solid #ea2b2b;
  }

  .feedback-content {
    max-width: 600px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }
  .feedback-text strong { font-size: 24px; display: block; margin-bottom: 5px; }
  .bottom-bar.correct .feedback-text { color: #58a700; }
  .bottom-bar.incorrect .feedback-text { color: #ea2b2b; }
</style>
