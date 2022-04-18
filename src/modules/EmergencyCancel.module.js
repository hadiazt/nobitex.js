const axios = require('axios');
const { Base, Paths } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base+'/security/emergency-cancel/activate',
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