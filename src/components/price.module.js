const axios = require('axios');

module.exports = () => {

    const config = {
        method: 'get',
        url: 'https://api.nobitex.ir/v2/orderbook/BTCIRT',
    };
    
    return new Promise((resolve, reject) => {
        axios(config).then(data => {
            const req = data.data;

            resolve(req)

        }).catch(e => { console.log(e?.response?.data?.message || e) });
    });

}

