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