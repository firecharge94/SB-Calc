let bazaarProductsCache = null;
let currentForgeSort = "profit";
let latestForgeItems = [];

async function getBazaarProducts(forceRefresh = false) {
    if (!forceRefresh && bazaarProductsCache) {
        return bazaarProductsCache;
    }

    const response = await fetch("https://api.hypixel.net/skyblock/bazaar");
    const bazaar = await response.json();
    bazaarProductsCache = bazaar.products;
    return bazaarProductsCache;
}

async function APIGetBazaar(itemID, forceRefresh = false) {
    const products = await getBazaarProducts(forceRefresh);
    const product = products[itemID];

    if (!product?.quick_status) {
        return null;
    }

    const highestBuyOrder = product.buy_summary?.[0]?.pricePerUnit ?? null;

    return {
        ...product.quick_status,
        calculatedSellPrice: highestBuyOrder !== null ? highestBuyOrder - 0.1 : product.quick_status.sellPrice
    };
}

async function ForgeTable(forceRefresh = false) {
    const result = [];
    const profitTable = document.getElementById("profit-table");
    const slotCountSelect = document.getElementById("slot-count-select");
    const hotmSelect = document.getElementById("hotm-select");
    const quickForgeToggle = document.getElementById("quick-forge-toggle");
    const buyResourcesToggle = document.getElementById("buy-resources-toggle");
    const selectedSlots = Number(slotCountSelect?.value ?? 7);
    const selectedHotm = Number(hotmSelect?.value ?? 0);
    const useQuickForge = quickForgeToggle?.checked ?? false;
    const useBuyPriceForResources = buyResourcesToggle?.checked ?? true;
    const skyblockItems = await getSkyblockItems(forceRefresh);

    profitTable.innerHTML = "";

    for (const recipe of forge) {
        if (recipe.HOTM > selectedHotm) {
            continue;
        }

        const finalItem = await APIGetBazaar(recipe.itemID, forceRefresh);
        const cost = await getRecipeCost(recipe, forceRefresh, useBuyPriceForResources);

        if (!finalItem || cost === null) {
            continue;
        }

        const scaledCost = cost * selectedSlots;
        const scaledSellPrice = finalItem.calculatedSellPrice * selectedSlots;
        const profit = scaledSellPrice - scaledCost;
        const displayedTime = useQuickForge ? recipe.timeInMinutes * 0.7 : recipe.timeInMinutes;

        result.push({
            itemID: recipe.itemID,
            iconUrl: getItemIconUrl(skyblockItems[recipe.itemID]),
            slotsUsed: selectedSlots,
            HOTM: recipe.HOTM,
            timeInMinutes: displayedTime,
            baseTimeInMinutes: recipe.timeInMinutes,
            cost: scaledCost,
            sellPrice: scaledSellPrice,
            buyOrders: finalItem.buyOrders,
            sellOrders: finalItem.sellOrders,
            profit: profit,
            profitPerHour: displayedTime > 0 ? profit / (displayedTime / 60) : profit,
            ingredients: recipe.ingredients,
            ingredientPricingMode: useBuyPriceForResources ? "Instant Buy" : "Owned Resources",
            profitClass: profit < 0 ? "red" : "green"
        });
    }
    sortForgeResults(result);
    latestForgeItems = result;

    for (const item of result) {
        profitTable.innerHTML += `
            <div class="profit-table-row" data-item-id="${item.itemID}" tabindex="0" role="button" aria-label="Open details for ${formatItemName(item.itemID)}">
                <div class="profit-item-cell">
                    ${getItemIconMarkup(item)}
                    <span class="profit-item-name">${formatItemName(item.itemID)}</span>
                </div>
                <div>${TijdInHour(item.timeInMinutes)}</div>
                <div style="color: ${item.profitClass}">${formatNumber(item.profit)}</div>
                <div style="color: ${item.profitClass}">${formatNumber(item.profitPerHour)}</div>
                <div>${formatNumber(item.sellOrders)}</div>
            </div>
        `;
    }

    document.querySelectorAll(".profit-table-row[data-item-id]").forEach(row => {
        row.addEventListener("click", () => openForgeItemDetails(row.dataset.itemId));
        row.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openForgeItemDetails(row.dataset.itemId);
            }
        });
    });
}

function sortForgeResults(result) {
    if (currentForgeSort === "time") {
        result.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
        return;
    }

    if (currentForgeSort === "money-hour") {
        result.sort((a, b) => b.profitPerHour - a.profitPerHour);
        return;
    }

    if (currentForgeSort === "smartest") {
        applySmartestRanking(result);
        return;
    }

    result.sort((a, b) => b.profit - a.profit);
}

function applySmartestRanking(result) {
    const maxProfit = Math.max(...result.map(item => Math.max(item.profit, 0)), 1);
    const maxProfitPerHour = Math.max(...result.map(item => Math.max(item.profitPerHour, 0)), 1);
    const maxBuyOrders = Math.max(...result.map(item => item.buyOrders), 1);

    result.sort((a, b) => getSmartScore(b, maxProfit, maxProfitPerHour, maxBuyOrders) - getSmartScore(a, maxProfit, maxProfitPerHour, maxBuyOrders));
}

function getSmartScore(item, maxProfit, maxProfitPerHour, maxBuyOrders) {
    const profitScore = (Math.max(item.profit, 0) / maxProfit) * 45;
    const moneyHourScore = (Math.max(item.profitPerHour, 0) / maxProfitPerHour) * 35;
    const buyOrdersScore = (Math.max(item.buyOrders, 0) / maxBuyOrders) * 20;

    return profitScore + moneyHourScore + buyOrdersScore;
}

function setForgeSort(sortType) {
    currentForgeSort = sortType;
    updateSortButtons();
    ForgeTable();
}

function updateSortButtons() {
    document.querySelectorAll("[data-sort]").forEach(button => {
        button.classList.toggle("active", button.dataset.sort === currentForgeSort);
    });
}

function openForgeItemDetails(itemID) {
    const item = latestForgeItems.find(entry => entry.itemID === itemID);
    const modal = document.getElementById("forge-item-modal");

    if (!item || !modal) {
        return;
    }

    document.getElementById("forge-modal-title").textContent = formatItemName(item.itemID);
    document.getElementById("forge-modal-slots").textContent = `${item.slotsUsed}`;
    document.getElementById("forge-modal-hotm").textContent = `HOTM ${item.HOTM}`;
    document.getElementById("forge-modal-time").textContent = TijdInHour(item.timeInMinutes);
    document.getElementById("forge-modal-profit").textContent = formatCoins(item.profit);
    document.getElementById("forge-modal-profit").style.color = item.profit < 0 ? "#fc8181" : "#68d391";
    document.getElementById("forge-modal-money-hour").textContent = formatCoins(item.profitPerHour);
    document.getElementById("forge-modal-money-hour").style.color = item.profit < 0 ? "#fc8181" : "#68d391";
    document.getElementById("forge-modal-sell-price").textContent = `Sell Price: ${formatCoins(item.sellPrice)}`;
    document.getElementById("forge-modal-sell-orders").textContent = `Sell Orders: ${formatNumber(item.sellOrders)}`;
    document.getElementById("forge-modal-cost").textContent = `Craft Cost (${item.ingredientPricingMode}): ${formatCoins(item.cost)}`;
    document.getElementById("forge-modal-ingredients").innerHTML = item.ingredients
        .map(ingredient => `<p>${ingredient.quantity * item.slotsUsed}x ${formatItemName(ingredient.itemID)}</p>`)
        .join("");

    modal.hidden = false;
}

function closeForgeItemDetails() {
    const modal = document.getElementById("forge-item-modal");

    if (modal) {
        modal.hidden = true;
    }
}

async function getRecipeCost(recipe, forceRefresh = false, useBuyPriceForResources = true) {
    if (!useBuyPriceForResources) {
        return 0;
    }

    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
        const data = await APIGetBazaar(ingredient.itemID, forceRefresh);
        if (!data) {
            return null;
        }
        totalCost += data.sellPrice * ingredient.quantity;
    }

    return totalCost;
}

function TijdInHour(minutes) {
    const hour = Math.floor(minutes / 60);
    const min = Math.floor(minutes % 60);

    if (hour === 0) {
        return `${min}m`;
    }

    if (min === 0) {
        return `${hour}h`;
    }

    return `${hour}h ${min}m`;
}

function formatNumber(value) {
    const Value = Math.abs(value);

    if (Value >= 1000000) {
        return `${Math.round(value / 100000) / 10}M`;
    }

    if (Value >= 1000) {
        return `${Math.round(value / 100) / 10}k`;
    }

    return `${Math.round(value)}`;
}

function formatCoins(value) {
    return `${formatNumber(value)} coins`;
}

function formatItemName(name) {
    return name
        .toLowerCase()
        .replaceAll("_", " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

    
