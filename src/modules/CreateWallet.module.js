const axios = require('axios');
const { Base, Paths } = require('../config.json')
module.exports = ({ token, type }) => {
    const config = {
        method: 'post',
        url: Base + Paths.User + Paths.Wallet.Create,
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