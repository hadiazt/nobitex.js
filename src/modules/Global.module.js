const axios = require('axios');
module.exports = () => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/market/global-stats',
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.markets.binance;
            resolve(req)
        }).catch(e => { console.log(e?.response?.data?.detail) });
    });
}