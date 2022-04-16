const axios = require('axios');
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: 'https://api.nobitex.ir/users/login-attempts',
        headers: {
            Authorization: `Token ${token}`,
        }
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e?.response?.data?.detail) });
    });
}