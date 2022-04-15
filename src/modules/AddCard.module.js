
const axios = require('axios');
module.exports = ({ token, CardNumber, BankName }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/cards-add',
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