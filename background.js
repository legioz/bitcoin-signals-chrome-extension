let lastUpdateTime = 0;
const updateInterval = 10 * 60 * 1000; // 10 minutes in milliseconds

async function getBTCPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        return data.bitcoin.usd;
    } catch (error) {
        console.error('Error fetching the BTC price:', error);
        return null;
    }
}


async function getMayerMultiple() {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=200");
        const data = await response.json();
        const prices = data.prices.map(price => price[1]);
        const movingAverage = prices => prices.reduce((a, b) => a + b, 0) / prices.length;
        const currentPrice = prices[prices.length - 1];
        const movingAverage200 = movingAverage(prices);
        const mayerMultiple = currentPrice / movingAverage200;
        return mayerMultiple;
    } catch (error) {
        console.error('Error fetching the Mayer Multiple:', error);
        return null;
    }
}

async function getFearAndGreedIndex() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        return data.data[0].value;
    } catch (error) {
        return null;
    }
}

async function updateFields() {
    let index = await getFearAndGreedIndex();
    let indexText = '';
    let badgeColor;
    if (index < 20) {
        badgeColor = '#00FF00';
        indexText = 'Extreme Fear!';
    } else if (index < 40) {
        badgeColor = '#33FF00';
        indexText = 'Fear!';
    } else if (index < 60) {
        badgeColor = '#66FF00';
        indexText = 'Neutral';
    } else if (index < 80) {
        badgeColor = '#99FF00';
        indexText = 'Greed!';
    } else {
        badgeColor = '#CCFF00';
        indexText = 'Extreme Greed!';
    }
    let indexColor = (index < 50) ? '#FF0000' : '#009900';
    document.getElementById('index').innerHTML = `Fear & Greed Index: <b>${indexText}</b> <b style="color: ${indexColor}">${index}</b>`;
    const btcPrice = await getBTCPrice();
    if (btcPrice) {
        document.getElementById('btc-price').innerHTML = `BTC Price: <b>U$${btcPrice}</b>`;
    } else {
        document.getElementById('btc-price').innerHTML = 'Failed to load data.';
    }
    const mayerMultiple = await getMayerMultiple();
    if (mayerMultiple) {
        let mayerMultipleColor;
        if (mayerMultiple < 1) {
            mayerMultipleColor = '#FF0000';
        } else if (mayerMultiple < 2) {
            mayerMultipleColor = '#FF6600';
        } else if (mayerMultiple < 2.4) {
            mayerMultipleColor = '#FFCC00';
        } else {
            mayerMultipleColor = '#00FF00';
        }
        document.getElementById('mayer-multiple').innerHTML = `Mayer Multiple: <b style="color: ${mayerMultipleColor}">${mayerMultiple.toFixed(2)}</b>`;
    } else {
        document.getElementById('mayer-multiple').innerHTML = 'Failed to load data.';
    }

    let signal = '';

    if (index > 60 && mayerMultiple > 2) {
        signal = '<b style="color: #FF0000">SELL!</b>';
        if (index > 70 && mayerMultiple > 2.4) {
            signal = '<b style="color: #FF0000">STRONG SELL!</b>';
        }
    } else {
        signal = '<b style="color: #009900">BUY AND HODL</b>';
    }

    document.getElementById('signal').innerHTML = signal;


    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    chrome.action.setBadgeText({ text: index.toString() });
    console.log('Updated fields. Next update at ' + new Date(Date.now() + updateInterval).toLocaleTimeString());
}


function shouldUpdateFields() {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime > updateInterval) {
        lastUpdateTime = currentTime;
        return true;
    }
    return false;
}

chrome.runtime.onInstalled.addListener(() => {
    if (shouldUpdateFields()) {
        updateFields();
    }
});

chrome.runtime.onStartup.addListener(() => {
    if (shouldUpdateFields()) {
        updateFields();
    }
});

chrome.action.onClicked.addListener(() => {
    if (shouldUpdateFields()) {
        updateFields();
    }
});

chrome.tabs.onCreated.addListener(() => {
    updateMayerMultiple();
});

setInterval(() => {
    if (shouldUpdateFields()) {
        updateFields();
    }
}, updateInterval);

if (shouldUpdateFields()) {
    updateFields();
}