let bazaarProductsCache = null;
let currentForgeSort = "profit";

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
    return products[itemID]?.quick_status ?? null;
}

async function ForgeTable(forceRefresh = false) {
    const result = [];
    const profitTable = document.getElementById("profit-table");
    const hotmSelect = document.getElementById("hotm-select");
    const quickForgeToggle = document.getElementById("quick-forge-toggle");
    const selectedHotm = Number(hotmSelect?.value ?? 0);
    const useQuickForge = quickForgeToggle?.checked ?? false;

    profitTable.innerHTML = "";

    for (const recipe of forge) {
        if (recipe.HOTM > selectedHotm) {
            continue;
        }

        const finalItem = await APIGetBazaar(recipe.itemID, forceRefresh);
        const cost = await getRecipeCost(recipe, forceRefresh);

        if (!finalItem || cost === null) {
            continue;
        }

        const profit = finalItem.sellPrice - cost;
        const displayedTime = useQuickForge ? recipe.timeInMinutes * 0.7 : recipe.timeInMinutes;

        result.push({
            itemID: recipe.itemID,
            timeInMinutes: displayedTime,
            cost: cost,
            profit: profit,
            profitPerHour: displayedTime > 0 ? profit / (displayedTime / 60) : profit,
            profitClass: profit < 0 ? "red" : "green"
        });
    }
    sortForgeResults(result);

    for (const item of result) {
        profitTable.innerHTML += `
            <div class="profit-table-row">
                <div>${formatItemName(item.itemID)}</div>
                <div>${TijdInHour(item.timeInMinutes)}</div>
                <div>${formatNumber(item.cost)}</div>
                <div style="color: ${item.profitClass}">${formatNumber(item.profit)}</div>
            </div>
        `;
    }
}

function sortForgeResults(result) {
    if (currentForgeSort === "time") {
        result.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
        return;
    }

    if (currentForgeSort === "cost") {
        result.sort((a, b) => a.cost - b.cost);
        return;
    }

    if (currentForgeSort === "smartest") {
        result.sort((a, b) => b.profitPerHour - a.profitPerHour);
        return;
    }

    result.sort((a, b) => b.profit - a.profit);
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
async function getRecipeCost(recipe, forceRefresh = false) {
    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
        const data = await APIGetBazaar(ingredient.itemID, forceRefresh);
        if (!data) {
            return null;
        }
        totalCost += data.buyPrice * ingredient.quantity;
    }

    return totalCost;
}

function TijdInHour(minutes) {
    const hour = Math.floor(minutes / 60);
    const min = minutes % 60;

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

function formatItemName(name) {
    return name
        .toLowerCase()
        .replaceAll("_", " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

    
