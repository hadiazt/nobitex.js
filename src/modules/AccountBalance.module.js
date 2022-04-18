const axios = require('axios');
const { Base, Paths } = require('../config.json')
module.exports = ({ token, type }) => {
    const config = {
        method: 'post',
        url: Base + Paths.User + '/wallets' + Paths.Wallet.Balance,
        headers: {
            Authorization: `Token ${token}`,
        },
        data: { "currency": type }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.balance;
            resolve({ Balance: req })
        }).catch(e => { console.log(e?.response?.data) });
    });
}