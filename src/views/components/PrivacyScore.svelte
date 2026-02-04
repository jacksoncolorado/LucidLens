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
    background: var(--panel);
    border-radius: var(--radius);
    border: 1px solid var(--panel-border);
    box-shadow: var(--panel-shadow);
}

    .score-header {
        margin-bottom: 12px;
    }

.label {
    font-weight: 650;
    color: var(--red);
    font-size: 0.95rem;
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
        font-size: 2.6rem;
        font-weight: 750;
        color: var(--score-color);
        line-height: 1;
    }

    .score-max {
        font-size: 1rem;
        color: var(--text-subtle);
        font-weight: 600;
    }

    .rating-badge {
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--rating-color);
        font-weight: 700;
        font-size: 0.85rem;
        border: 1px solid var(--rating-color);
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    .score-bar {
        width: 100%;
        height: 8px;
        background: var(--panel-strong);
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid var(--panel-border);
    }

    .score-bar-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 999px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }
</style>

