const axios = require('axios');
const { Base, MarketG } = require('../config.json')
module.exports = () => {
    const config = {
        method: 'post',
        url: Base + MarketG,
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.markets.binance;
            resolve(req)
        }).catch(e => { console.log(e?.response?.data?.detail) });
    });
}