<script>
    import { onMount, onDestroy } from "svelte";
    import PopupController from "../controllers/PopupController.js";
    import Header from "./components/Header.svelte";
    import UrlDisplay from "./components/UrlDisplay.svelte";
    import PrivacyScore from "./components/PrivacyScore.svelte";
    import DataCollectionSummary from "./components/DataCollectionSummary.svelte";
    import ScoreBreakdown from "./components/ScoreBreakdown.svelte";
    import TrackingScriptDetails from "./components/TrackingScriptDetails.svelte";

    let info = {
        fullUrl: null,
        host: null,
        isSecure: false,
        privacyScore: null,
        privacyData: null,
        privacyScoreDetails: null,
        message: "Loading..."
    };

    let loading = true;
    let initialWait = true;
    let initialTimer = null;
    let privacyDataModel = null;
    let refreshTimer = null;

    // AI Summary State
    let aiLoading = false;
    let aiSummary = null;
    let aiError = null;

    // --- PATCH B: Pause updates during AI generation ---
    let pauseUpdates = false;

    function handleUpdate(msg) {
        if (pauseUpdates) return;   // 🔥 Block updates during AI summary

        if (msg?.type === "policyScrape:complete") {
            if (info?.privacyData?.privacyPolicy) {
                info.privacyData.privacyPolicy.url = msg.finalUrl;
            }
        }

        if (msg?.type === "privacyScore:updated") {
            info.privacyScore = msg.privacyScore;
            info.privacyScoreDetails = msg.privacyScoreDetails;

            if (msg.privacyData) {
                info.privacyData = msg.privacyData;
                privacyDataModel = {
                    getSummary: () => msg.privacyData.summary
                };
            }
        } 
        else if (msg?.type === "privacyData:updated" && privacyDataModel) {
            privacyDataModel = {
                ...privacyDataModel,
                getSummary: () => msg.summary
            };

            if (msg.privacyData) {
                info.privacyData = msg.privacyData;
            }
        }
    }

    onMount(() => {
        chrome.runtime.onMessage.addListener(handleUpdate);
        load();

        // Set a max wait for first data so UI shows after a short spinner
        initialTimer = setTimeout(() => {
            initialWait = false;
        }, 1800);

        // Periodically refresh snapshot so score and counts stay current
        refreshTimer = setInterval(() => {
            void refreshSnapshot();
        }, 4000);
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(handleUpdate);
        if (initialTimer) clearTimeout(initialTimer);
        if (refreshTimer) clearInterval(refreshTimer);
    });

    async function load() {
        loading = true;
        aiSummary = null;
        aiError = null;
        aiLoading = false;
        initialWait = true;
        if (initialTimer) clearTimeout(initialTimer);
        initialTimer = setTimeout(() => {
            initialWait = false;
        }, 1800);

        try {
            const data = await PopupController.loadWebsiteInfo();
            info = data;

            if (data.privacyData) {
                privacyDataModel = {
                    getSummary: () => data.privacyData.summary
                };
            }
        } catch (err) {
            console.error("Error loading website info:", err);
            info.message = "Error loading website information";
        } finally {
            loading = false;
        }
    }

    async function refreshSnapshot() {
        try {
            const data = await PopupController.loadWebsiteInfo();
            info = data;
            if (data.privacyData) {
                privacyDataModel = { getSummary: () => data.privacyData.summary };
            }
        } catch (err) {
            // keep last known info on failure
        }
    }

    async function generateSummary() {
        aiLoading = true;
        aiSummary = null;
        aiError = null;

        pauseUpdates = true;  // 🔥 STOP popup updates

        try {
            const result = await PopupController.generateAISummary({
                fullUrl: info.fullUrl,
                host: info.host,
                privacyScore: info.privacyScore,
                cookies: info.privacyData?.cookies,
                tracking: info.privacyData?.tracking,
                privacyPolicy: info.privacyData?.privacyPolicy
            });

            if (result?.finalUrl && info?.privacyData?.privacyPolicy) {
                info.privacyData.privacyPolicy.url = result.finalUrl;
            }

            if (result.success) {
                aiSummary = result.summary;
            } else {
                aiError = result.summary || "Unknown AI error.";
            }

        } catch (err) {
            aiError = "Failed to generate summary.";
        } finally {
            aiLoading = false;
            pauseUpdates = false;   // 🔥 RESUME updates
        }
    }
</script>

<div class="popup-container">
    <Header title="Privacy Lens" />

    {#if loading || initialWait}
        <div class="loading-state"><p class="loading-text">Gathering privacy data...</p></div>

    {:else if !info.fullUrl}
        <div class="error-state">
            <p class="error-text">{info.message || "Cannot analyze this page"}</p>
            <p class="error-hint">Navigate to a website to see privacy information.</p>
        </div>

    {:else}
        <UrlDisplay 
            url={info.fullUrl}
            hostname={info.host}
            isSecure={info.isSecure}
        />

        <div class="score-stack">
            <PrivacyScore 
                score={info.privacyScore}
                rating={info.privacyScoreDetails?.rating || "Unknown"}
                color={info.privacyScoreDetails 
                    ? (info.privacyScore >= 80 ? "#10b981" 
                    : info.privacyScore >= 60 ? "#3b82f6"
                    : info.privacyScore >= 40 ? "#f59e0b"
                    : "#ef4444")
                    : "#666"}
            />

            {#if info.privacyScoreDetails?.factors}
                <details class="score-breakdown-toggle">
                    <summary>View score breakdown</summary>
                    <ScoreBreakdown
                        factors={info.privacyScoreDetails.factors}
                        score={info.privacyScoreDetails.score}
                    />
                </details>
            {/if}
        </div>

        {#if info.privacyData}
            <DataCollectionSummary privacyData={privacyDataModel} />
        {/if}

        {#if info.privacyScoreDetails?.recommendations?.length > 0}
            <div class="recommendations">
                <div class="recommendations-header"><span class="label">Recommendations</span></div>
                <div class="recommendations-list">
                    {#each info.privacyScoreDetails.recommendations as rec}
                        <div class="recommendation-item priority-{rec.priority}">
                            <span class="rec-action">{rec.action}</span>
                            <span class="rec-description">{rec.description}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if info?.privacyData?.privacyPolicy?.found}
            <div class="privacy-policy">
                <div class="policy-header">
                    <span class="label">Privacy Policy</span>
                    <span class="policy-status success">Found</span>
                </div>

                {#if info.privacyData.privacyPolicy.url}
                    <a href={info.privacyData.privacyPolicy.url} target="_blank" class="policy-link">
                        View Privacy Policy →
                    </a>
                {/if}
            </div>
        {/if}

        <button class="ai-btn" on:click={generateSummary} disabled={aiLoading}>
            {#if aiLoading} Analyzing... {:else} Generate AI Privacy Summary {/if}
        </button>

        {#if aiSummary}
            <details class="ai-summary">
                <summary>AI Privacy Summary</summary>
                <div class="ai-content">
                    {@html aiSummary.replace(/\n/g, "<br>")}
                </div>
            </details>
        {/if}

        {#if aiError}
            <div class="ai-error">{aiError}</div>
        {/if}

        <TrackingScriptDetails scripts={info?.privacyData?.tracking?.scriptDetails || []} />

        <button class="refresh-btn" on:click={load}>Refresh</button>
    {/if}
</div>

<style>
:root {
    color-scheme: dark;
}

.popup-container {
    --bg: #080808;
    --bg-glow: radial-gradient(circle at 50% 0%, rgba(223, 38, 56, 0.16), transparent 55%);
    --edge-glow: radial-gradient(circle at 10% 10%, rgba(255,255,255,0.05), transparent 45%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.05), transparent 45%);
    --panel: rgba(255, 255, 255, 0.045);
    --panel-strong: rgba(255, 255, 255, 0.06);
    --panel-border: rgba(255, 255, 255, 0.12);
    --panel-divider: rgba(255, 255, 255, 0.08);
    --panel-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
    --text-strong: #f5f5f5;
    --text-muted: #c8c8c8;
    --text-subtle: #9aa0a6;
    --red: #df2638;
    --red-strong: #b61b2b;
    --red-soft: rgba(223, 38, 56, 0.14);
    --radius: 12px;

    background: var(--bg);
    background-image: var(--bg-glow), var(--edge-glow);
    border-radius: 12px;
    padding: 18px;
    width: 400px;
    max-height: 640px;
    overflow-y: auto;
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-strong);
}

.label {
    font-weight: 650;
    color: var(--red);
    font-size: 0.94rem;
    letter-spacing: 0.01em;
}

/* Recommendations block */
.recommendations {
    margin-top: 16px;
    margin-bottom: 16px;
    background: var(--panel);
    border-radius: var(--radius);
    border: 1px solid var(--panel-border);
    overflow: hidden;
    box-shadow: var(--panel-shadow);
}

.recommendations-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--panel-divider);
}

.recommendations-list {
    padding: 8px 16px;
}

.recommendation-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--panel-divider);
}

.recommendation-item:last-child {
    border-bottom: none;
}

.rec-action {
    display: block;
    color: var(--text-strong) !important;
    font-weight: 650;
    font-size: 0.87rem;
    margin-bottom: 4px;
}

.rec-description {
    display: block;
    color: var(--text-muted) !important;
    font-size: 0.82rem;
}

.recommendation-item.priority-high .rec-action {
    color: var(--red);
}

.recommendation-item.priority-medium .rec-action {
    color: #f59e0b;
}

/* AI button + summary */
.ai-btn {
    width: 100%;
    margin-top: 14px;
    background: linear-gradient(135deg, var(--red) 0%, var(--red-strong) 100%);
    padding: 11px 16px;
    color: white;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(223, 38, 56, 0.25);
}

.ai-btn:hover {
    filter: brightness(1.07);
}

.ai-btn:disabled {
    background: var(--panel);
    border-color: var(--panel-border);
    color: var(--text-subtle);
    cursor: not-allowed;
    box-shadow: none;
}

.ai-summary {
    margin-top: 14px;
    background: var(--panel);
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--panel-border);
    box-shadow: var(--panel-shadow);
}

.ai-summary summary {
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.92rem;
    font-weight: 650;
}

.ai-content {
    margin-top: 8px;
    color: var(--text-strong);
    font-size: 0.86rem;
    line-height: 1.32rem;
}

.ai-error {
    color: var(--red);
    margin-top: 8px;
    text-align: center;
    font-size: 0.88rem;
}

/* Privacy policy card */
.privacy-policy {
    margin-top: 16px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--panel);
    border-radius: var(--radius);
    border: 1px solid var(--panel-border);
    box-shadow: var(--panel-shadow);
}

.policy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.policy-status {
    padding: 4px 8px;
    border-radius: 16px;
    font-size: 0.78rem;
    font-weight: 700;
    background: var(--red-soft);
    color: var(--red);
    border: 1px solid rgba(223, 38, 56, 0.4);
}

.policy-link {
    color: var(--red);
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 600;
}

.policy-link:hover {
    color: #ff4a59;
}

/* Refresh button */
.refresh-btn {
    width: 100%;
    margin-top: 16px;
    background: var(--panel-strong);
    padding: 10px 16px;
    color: var(--text-strong);
    border-radius: 8px;
    border: 1px solid var(--panel-border);
    font-size: 0.92rem;
    font-weight: 650;
    cursor: pointer;
}

.refresh-btn:hover {
    border-color: rgba(255, 255, 255, 0.18);
}

.score-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.score-breakdown-toggle {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    padding: 10px 12px;
    box-shadow: var(--panel-shadow);
}

.score-breakdown-toggle summary {
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 650;
    list-style: none;
}

.score-breakdown-toggle summary::-webkit-details-marker {
    display: none;
}

.score-breakdown-toggle[open] summary {
    color: var(--red);
}
</style>
