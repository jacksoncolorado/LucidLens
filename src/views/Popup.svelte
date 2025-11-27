<script>
    import { onMount } from "svelte";
    import PopupController from "../controllers/PopupController.js";

    let info = {
        fullUrl: "Loading...",
        host: "Loading...",
        isSecure: false,
        privacyScore: null,
        message: "Loading..."
    };

    let loading = true;

    async function load() {
        loading = true;
        info = await PopupController.loadWebsiteInfo();
        loading = false;
    }

    onMount(load);
</script>

<style>
    .title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #ffffff;
    }
    .card {
        background: #0d0d0f;
        border-radius: 10px;
        padding: 16px;
        width: 340px;
        box-shadow: 0 0 15px rgba(0, 132, 255, 0.5);
        border: 1px solid #1a1a1a;
    }
    .label {
        font-weight: 600;
        color: #66b3ff;
    }
    .text {
        color: #e6e6e6;
        font-size: 0.95rem;
        word-break: break-all;
    }
    .refresh-btn {
        margin-top: 14px;
        background: #0084ff;
        padding: 8px 14px;
        color: white;
        border-radius: 6px;
        border: none;
        font-size: 0.9rem;
        cursor: pointer;
    }
    .refresh-btn:hover {
        background: #0a93ff;
    }
</style>

<div class="card">
    <div class="title">Privacy Lens</div>

    {#if loading}
        <p class="text">Loading...</p>
    {:else}
        <p><span class="label">Website:</span></p>
        <p class="text">{info.fullUrl}</p>

        <p style="margin-top: 10px;"><span class="label">Host:</span></p>
        <p class="text">{info.host}</p>

        <p style="margin-top: 10px;"><span class="label">Secure:</span>
            <span class="text">{info.isSecure ? "Yes" : "No"}</span>
        </p>

        <p style="margin-top: 10px;"><span class="label">Privacy Score:</span>
            <span class="text">{info.privacyScore ?? "—"}</span>
        </p>

        <p class="text" style="margin-top: 14px; font-size: 0.85rem; opacity: 0.8;">
            {info.message}
        </p>
    {/if}

    <button class="refresh-btn" on:click={load}>Refresh</button>
</div>
