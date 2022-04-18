const axios = require('axios');
const { Base, EMGCancel } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base + EMGCancel,
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