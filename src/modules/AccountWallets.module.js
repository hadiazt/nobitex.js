const axios = require('axios');
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/wallets/list',
        headers: {
            Authorization: `Token ${token}`,
        },
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data.wallets;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}