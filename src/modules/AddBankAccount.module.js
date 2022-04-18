const axios = require('axios');
const { Base, AddBank } = require('../config.json')
module.exports = ({ token, CardNumber, Shaba, BankName }) => {
    const config = {
        method: 'post',
        url: Base + AddBank,
        headers: {
            Authorization: `Token ${token}`,
        },
        data: { "number": CardNumber, "shaba": Shaba, "bank": BankName }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}