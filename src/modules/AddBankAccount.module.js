const axios = require('axios');
module.exports = ({ token, CardNumber, Shaba ,BankName}) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/accounts-add',
        headers: {
            Authorization: `Token ${token}`,
        },
        data: { "number": CardNumber, "shaba": Shaba , "bank": BankName}
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}