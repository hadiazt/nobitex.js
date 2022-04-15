const axios = require('axios');
module.exports = ({ token, type }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/wallets/generate-address',
        headers: {
            Authorization: `Token ${token}`,
        },
        data: { "currency": type }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve({ Status: req.status, Address: req.address, Tag: req.tag })
        }).catch(e => { console.log(e) });
    });
}

