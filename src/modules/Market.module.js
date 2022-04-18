const axios = require('axios');
const { Base, Market } = require('../config.json')
module.exports = ({ from, to }) => {
    const config = {
        method: 'post',
        url: Base + Market,
        data: { "srcCurrency": from, "dstCurrency": to }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.stats;
            resolve(JSON.stringify(req[from + '-' + to]))
        }).catch(e => { console.log(e?.response?.data?.detail) });
    });
}