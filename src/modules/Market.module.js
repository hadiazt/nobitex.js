const axios = require('axios');
module.exports = ({ from, to }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/market/stats',
        data: { "srcCurrency": from, "dstCurrency": to }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.stats;
            resolve(req)
        }).catch(e => { console.log(e.toJSON().message + '\nMake sure entered a correct type') });
    });
}

