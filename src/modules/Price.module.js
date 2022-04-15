const axios = require('axios');
module.exports = ({ type }) => {
    const config = {
        method: 'get',
        url: 'https://api.nobitex.ir/v2/orderbook/' + type,
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            const lastUpdate = new Date(req.lastUpdate).toLocaleString()
            const lastTradePrice = req.lastTradePrice
            const buy = req.asks
            const sell = req.bids
            resolve({ lastUpdate, lastTradePrice, buy, sell, })
        }).catch(e => { console.log(e.toJSON().message + '\nMake sure entered a correct type') });
    });
}