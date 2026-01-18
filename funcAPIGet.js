async function APIGet(itemID) {
    const response = await fetch("https://api.hypixel.net/skyblock/bazaar");
    const bazaar = await response.json();
    return bazaar.products[itemID].quick_status;
}
