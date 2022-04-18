const axios = require('axios');
const { Base, Wallet } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base + Wallet.list,
        headers: {
            Authorization: `Token ${token}`,
        },
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.wallets;
            const a = []
            req.forEach(r => {
                if (r.depositAddress) {
                    a.push(r)
                }
            });
            resolve(a)
        }).catch(e => { console.log(e) });
    });
}