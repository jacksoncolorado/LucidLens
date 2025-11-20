<script>
    import { onMount } from "svelte";
    import PopupController from "../controllers/PopupController.js";

    // The website data that will be displayed
    let website = {
        fullUrl: "",
        host: "",
        isSecure: false,
        privacyScore: null,
        message: "Loading..."
    };

    let isLoading = true;

    onMount(async () => {
        await loadWebsiteInfo();
    });

    async function loadWebsiteInfo() {
        isLoading = true;

        try {
            website = await PopupController.loadWebsiteInfo();
        } catch (error) {
            console.error("Error loading website info:", error);

            website = {
                fullUrl: "N/A",
                host: "N/A",
                isSecure: false,
                privacyScore: null,
                message: "Error loading website data"
            };
        }

        isLoading = false;
    }

    async function handleRefresh() {
        await loadWebsiteInfo();
    }
</script>

<style>
    .container {
        min-width: 300px;
        padding: 16px;
        font-size: 14px;
    }
</style>

<div class="container">
    <h1 class="text-lg font-bold mb-4">Privacy Lens</h1>

    {#if isLoading}
        <p>Loading...</p>
    {:else}
        <p><strong>Website:</strong> {website.fullUrl || "N/A"}</p>
        <p><strong>Host:</strong> {website.host || "N/A"}</p>
        <p><strong>Secure:</strong> {website.isSecure ? "Yes" : "No"}</p>
        <p><strong>Privacy Score:</strong> {website.privacyScore ?? "—"}</p>
        <p class="text-xs text-gray-500 mt-4">{website.message}</p>

        <button
            class="mt-4 p-2 bg-blue-600 text-white rounded"
            on:click={handleRefresh}
        >
            Refresh
        </button>
    {/if}
</div>
