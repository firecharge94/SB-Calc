let skyblockItemsCache = null;
const materialTextureOverrides = { INK_SACK: "ink_sac", SULPHUR: "gunpowder", WATCH: "clock" };

async function getSkyblockItems(forceRefresh = false) {
    if (!forceRefresh && skyblockItemsCache) {
        return skyblockItemsCache;
    }

    try {
        const response = await fetch("https://api.hypixel.net/v2/resources/skyblock/items");
        const data = await response.json();
        skyblockItemsCache = Object.fromEntries((data.items ?? []).map(item => [item.id, item]));
    } catch {
        skyblockItemsCache = {};
    }

    return skyblockItemsCache;
}

function getItemIconUrl(itemData) {
    if (!itemData) {
        return null;
    }

    if (itemData.material === "SKULL_ITEM") {
        const textureUrl = decodeSkinValueToTextureUrl(itemData.skin?.value);
        const textureHash = textureUrl?.split("/texture/")[1];
        return textureHash ? `https://mc-heads.net/head/${textureHash}/64` : textureUrl;
    }

    const material = itemData.materialTexture ?? materialTextureOverrides[itemData.material] ?? itemData.material;
    return material ? `https://assets.mcasset.cloud/1.21/assets/minecraft/textures/item/${material.toLowerCase()}.png` : null;
}

function decodeSkinValueToTextureUrl(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    try {
        return JSON.parse(atob(value.replace(/\\u003d/g, "=")))?.textures?.SKIN?.url?.replace("http://", "https://") ?? null;
    } catch {
        return null;
    }
}

function getItemIconMarkup(item) {
    return item.iconUrl
        ? `<img class="profit-item-icon" src="${item.iconUrl}" alt="" loading="lazy">`
        : `<span class="profit-item-icon-fallback" aria-hidden="true">${formatItemName(item.itemID).charAt(0)}</span>`;
}
