
const axios = require('axios');
module.exports = ({ token, type }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/wallets/balance',
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