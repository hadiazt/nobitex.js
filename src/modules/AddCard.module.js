const axios = require('axios');
const { Base, AddCard } = require('../config.json')
module.exports = ({ token, CardNumber, BankName }) => {
    const config = {
        method: 'post',
        url: Base + AddCard,
        headers: {
            Authorization: `Token ${token}`,
        },
        data: { "number": CardNumber, "bank": BankName }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}