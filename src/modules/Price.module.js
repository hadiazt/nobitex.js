const axios = require('axios');
const { Base, Price } = require('../config.json')
module.exports = ({ type }) => {
    const config = {
        method: 'get',
        url: Base + Price + type,
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            const lastUpdate = new Date(req.lastUpdate).toLocaleString()
            const lastTradePrice = req.lastTradePrice
            const buy = req.asks
            const sell = req.bids
            resolve({ lastUpdate, lastTradePrice, buy, sell, })
        }).catch(e => { console.log(e?.response?.data) });
    });
}