<!-- src/views/components/PrivacyScore.svelte -->
<script>
    export let score = null;
    export let rating = "Unknown";
    export let color = "#666";

    function getScoreColor(score) {
        if (score === null || score === undefined) return "#666";
        if (score >= 80) return "#10b981"; // green
        if (score >= 60) return "#3b82f6"; // blue
        if (score >= 40) return "#f59e0b"; // yellow
        if (score >= 20) return "#ef4444"; // red
        return "#dc2626"; // dark red
    }

    $: displayScore = score !== null && score !== undefined ? Math.round(score) : "—";
    $: displayColor = getScoreColor(score);
    $: displayRating = rating || "Unknown";
</script>

<div class="privacy-score">
    <div class="score-header">
        <span class="label">Privacy Score</span>
    </div>
    <div class="score-display">
        <div class="score-circle" style="--score-color: {displayColor}">
            <span class="score-value">{displayScore}</span>
            <span class="score-max">/100</span>
        </div>
        <div class="rating-badge" style="--rating-color: {displayColor}">
            {displayRating}
        </div>
    </div>
    <div class="score-bar">
        <div class="score-bar-fill" style="width: {displayScore}%; background-color: {displayColor};"></div>
    </div>
</div>

<style>
    .privacy-score {
        margin-bottom: 20px;
        padding: 16px;
        background: #1a1a1a;
        border-radius: 8px;
        border: 1px solid #2a2a2a;
    }

    .score-header {
        margin-bottom: 12px;
    }

    .label {
        font-weight: 600;
        color: #66b3ff;
        font-size: 0.9rem;
    }

    .score-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }

    .score-circle {
        display: flex;
        align-items: baseline;
        gap: 4px;
    }

    .score-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--score-color);
        line-height: 1;
    }

    .score-max {
        font-size: 1.2rem;
        color: #999;
        font-weight: 500;
    }

    .rating-badge {
        padding: 6px 12px;
        border-radius: 6px;
        background: rgba(var(--rating-color-rgb, 59, 130, 246), 0.1);
        color: var(--rating-color);
        font-weight: 600;
        font-size: 0.85rem;
        border: 1px solid var(--rating-color);
    }

    .score-bar {
        width: 100%;
        height: 8px;
        background: #2a2a2a;
        border-radius: 4px;
        overflow: hidden;
    }

    .score-bar-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 4px;
    }
</style>

