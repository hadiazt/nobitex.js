const axios = require('axios');
const { Base, Limitations } = require('../config.json')
module.exports = ({ token }) => {
    const config = {
        method: 'post',
        url: Base + Limitations,
        headers: {
            Authorization: `Token ${token}`,
        },
    };
    return new Promise((resolve) => {
        axios(config).then(data => {
            const req = data.data;
            resolve(req)
        }).catch(e => { console.log(e) });
    });
}