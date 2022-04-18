const axios = require('axios');
const { Base, Trades } = require('../config.json')
module.exports = ({ type }) => {
    const config = {
        method: 'get',
        url: Base + Trades + type,
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const { trades } = data.data;
            const res = []
            trades.forEach(trade => {
                const time = new Date(trade.time).toLocaleString()
                const price = trade.price
                const volume = trade.volume
                const type = trade.type
                const x = { time, price, volume, type }
                res.push(x)
            })
            resolve(res)
        }).catch(e => { console.log(e?.response) });
    });
}