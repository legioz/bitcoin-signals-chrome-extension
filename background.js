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

function calculateRSI(prices, period) {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 0 : avgGain / avgLoss; 
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

function calculateStochasticRSI(prices, kPeriod, dPeriod) {
    const rsiValues = [];

    for (let i = 0; i <= prices.length - kPeriod; i++) {
        const priceSlice = prices.slice(i, i + kPeriod);
        const changes = [];
        for (let j = 1; j < priceSlice.length; j++) {
            changes.push(priceSlice[j] - priceSlice[j - 1]);
        }

        const gains = changes.filter(c => c > 0);
        const losses = changes.filter(c => c < 0);
        const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / kPeriod : 0;
        const avgLoss = losses.length ? -losses.reduce((a, b) => a + b, 0) / kPeriod : 0;

        const rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
    }

    const stochRsiValues = [];
    for (let i = 0; i <= rsiValues.length - dPeriod; i++) {
        const rsiSlice = rsiValues.slice(i, i + dPeriod);
        const minRsi = Math.min(...rsiSlice);
        const maxRsi = Math.max(...rsiSlice);
        const stochRsi = (maxRsi - minRsi) === 0 ? 0 : ((rsiValues[i + dPeriod - 1] - minRsi) / (maxRsi - minRsi)) * 100;
        stochRsiValues.push(stochRsi);
    }

    return stochRsiValues;
}

function calculateSlowStochastic(prices, kPeriod, dPeriod) {
    const kValues = [];

    for (let i = kPeriod - 1; i < prices.length; i++) {
        const priceSlice = prices.slice(i - kPeriod + 1, i + 1);
        const minPrice = Math.min(...priceSlice);
        const maxPrice = Math.max(...priceSlice);

        // Evitar divisão por zero
        const range = maxPrice - minPrice;
        const kValue = range !== 0 ? ((prices[i] - minPrice) / range) * 100 : 0;
        kValues.push(kValue);
    }

    const dValues = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
        const dValue = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
        dValues.push(dValue);
    }

    return dValues;
}

async function getOscillators() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h');
        const data = await response.json();
        const closePrices = data.map(d => parseFloat(d[4]));
        const rsi = calculateRSI(closePrices, 14);
        const stoch = calculateSlowStochastic(closePrices, 14, 3);
        const oscillators = {
            rsi: rsi,
            stoch: stoch,
        };
        return oscillators;
    } catch (error) {
        console.error('Error fetching the Stoch RSI:', error);
        return {};
    }
}

async function updateFields() {
    let index = await getFearAndGreedIndex();
    let indexText = '';
    let badgeColor;
    if (index < 20) {
        badgeColor = 'greenyellow';
        indexText = 'Extreme Fear!';
        indexColor = 'green';
    } else if (index < 40) {
        badgeColor = 'green';
        indexText = 'Fear!';
        indexColor = 'green';
    } else if (index < 60) {
        badgeColor = 'white';
        indexText = 'Neutral';
    } else if (index < 72) {
        badgeColor = 'yellow';
        indexText = 'Greed!';
        indexColor = 'orange';
    } else {
        badgeColor = 'red';
        indexText = 'Extreme Greed!';
        indexColor = 'red';
    }
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
            mayerMultipleColor = 'green';
        } else if (mayerMultiple < 2) {
            mayerMultipleColor = 'orange';
        } else if (mayerMultiple < 2.4) {
            mayerMultipleColor = 'orangered';
        } else {
            mayerMultipleColor = 'red';
        }
        document.getElementById('mayer-multiple').innerHTML = `Mayer Multiple: <b style="color: ${mayerMultipleColor}">${mayerMultiple.toFixed(2)}</b>`;
    } else {
        document.getElementById('mayer-multiple').innerHTML = 'Failed to load data.';
    }

    let signal = '';

    if (index > 60 && mayerMultiple > 2) {
        signal = '<h3 style="color: red">SELL!</h3>';
        if (index > 70 && mayerMultiple > 2.4) {
            signal = '<h3 style="color: red">STRONG SELL!</h3>';
        }
    } else {
        signal = '<h3 style="color: green">BUY AND HODL</h3>';
    }

    document.getElementById('signal').innerHTML = signal + '<hr>';

    const oscillators = await getOscillators();
    let oscillatorsHTML = '<hr>';
    oscillatorsHTML += '<h3>Oscillators</h3>';
    oscillatorsHTML += `<b>RSI:</b> ${oscillators.rsi.toFixed(2)}<br>`;
    oscillatorsHTML += `<b>Slow Stoch:</b> ${oscillators.stoch[oscillators.stoch.length - 1].toFixed(2)}<br>`;

    if (oscillators.rsi > 70 || oscillators.stoch[oscillators.stoch.length - 1] > 80) {
        oscillatorsHTML += '<small style="color: red">Overbought!</small>';
    } else if (oscillators.rsi < 30 || oscillators.stoch[oscillators.stoch.length - 1] < 20) {
        oscillatorsHTML += '<small style="color: green">Oversold!</small>';
    }
    
    document.getElementById('oscillators').innerHTML = oscillatorsHTML;

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